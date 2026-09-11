/**
 * Phase 10 – n8n event emitter.
 *
 * Fans out backend domain events to configured n8n workflow webhooks.
 *
 * Hard guarantees:
 * - NEVER in the real-time path: entry via `enqueueN8nEvent`
 *   (fire-and-forget `setImmediate`). Callers must not `await` it.
 * - NEVER throws to callers: failures are recorded in `n8n_deliveries` + logs only.
 * - Independent from CRM: never imports the CRM sync service; a CRM outage
 *   cannot delay/fail n8n delivery and vice versa.
 * - NEVER logs or persists secrets (sanitized messages only).
 * - Idempotent: stable `event_id` per occurrence; unchanged re-emissions are
 *   skipped without an HTTP call (payload hash comparison); changed data
 *   gets a deterministic `:n` discriminator suffix (simple counter, no
 *   over-engineering).
 * - Allowlisted payloads only (see n8nPayloadBuilder); no transcripts.
 */
import { createHash } from 'crypto';
import { LeadService } from '../leadService';
import { findCallById } from '../../repositories/callRepository';
import { getStateByCallId } from '../conversationStateService';
import { findQualificationByCallId } from '../../repositories/qualificationRepository';
import {
  buildN8nEnvelope,
  buildN8nEventId,
  canonicalN8nBody
} from './n8nPayloadBuilder';
import { N8nCrmFields, N8nEventName } from './n8nEventTypes';
import { getN8nClient } from './n8nClient';
import { withCrmRetry } from '../crm/crmRetry';
import {
  findDeliveryByEventId,
  markDeliveryDelivered,
  markDeliveryFailed,
  markDeliverySkipped,
  upsertDeliveryAttempt
} from '../../repositories/n8nDeliveryRepository';
import { getN8nConfig, isN8nEnabled } from '../../config';
import { logger } from '../../utils/logger';

export interface N8nEnqueueInput {
  leadId?: string | null;
  callId?: string | null;
  crm?: N8nCrmFields | null;
}

export interface N8nEmitOutcome {
  ok: boolean;
  delivered?: number;
  skipped?: 'disabled' | 'no_input' | 'no_data' | 'no_workflow' | 'no_config' | 'no_changes';
}

/** Remove secrets/tokens from any error text before logging or persisting. */
export const sanitizeN8nErrorMessage = (err: any): string => {
  const raw = err instanceof Error ? err.message : String(err ?? 'Unknown n8n error');
  const secret = getN8nSecretSafe();
  let clean = raw;
  if (secret && secret.length > 0) {
    clean = clean.split(secret).join('[REDACTED]');
  }
  clean = clean
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/=]+/g, 'Bearer [REDACTED]')
    .replace(/api[_-]?key\s*[:=]\s*['"]?[^'"\s,}]+['"]?/gi, 'api_key=[REDACTED]')
    .replace(/token\s*[:=]\s*['"]?[^'"\s,}]+['"]?/gi, 'token=[REDACTED]')
    .replace(/secret\s*[:=]\s*['"]?[^'"\s,}]+['"]?/gi, 'secret=[REDACTED]');
  if (clean.length > 500) clean = clean.slice(0, 500);
  return clean;
};

const getN8nSecretSafe = (): string => {
  try {
    return getN8nConfig().webhookSecret || '';
  } catch {
    return '';
  }
};

const hashEnvelope = (canonicalBody: string): string =>
  createHash('sha256').update(canonicalBody).digest('hex');

const leadService = new LeadService();

/**
 * Fire-and-forget entry point. Safe to call without awaiting from async
 * tails. Never throws.
 */
export const enqueueN8nEvent = (event: N8nEventName, input: N8nEnqueueInput): void => {
  if (!isN8nEnabled()) return;
  setImmediate(() => {
    emitN8nEventOnce(event, input).catch((err: any) => {
      logger.error('n8n event emission failed', {
        error: sanitizeN8nErrorMessage(err),
        event,
        leadId: input.leadId || null,
        callId: input.callId || null
      });
    });
  });
};

/**
 * Single emission pass across all workflows configured for the event.
 * Resolves (never rejects) with an outcome summary.
 */
export const emitN8nEventOnce = async (
  event: N8nEventName,
  input: N8nEnqueueInput
): Promise<N8nEmitOutcome> => {
  if (!isN8nEnabled()) return { ok: false, skipped: 'disabled' };
  const callId = input.callId || null;
  const inputLeadId = input.leadId || null;
  if (!callId && !inputLeadId) {
    logger.warn('n8n event skipped: no callId or leadId provided', { event });
    return { ok: false, skipped: 'no_input' };
  }

  const cfg = getN8nConfig();
  if (!cfg.webhookSecret) {
    logger.warn('n8n event skipped: N8N_WEBHOOK_SECRET not configured', { event });
    return { ok: false, skipped: 'no_config' };
  }
  const targets = cfg.workflows[event] || [];
  if (targets.length === 0) {
    return { ok: false, skipped: 'no_workflow' };
  }

  try {
    // Reuse existing Phase 1–9 readers only; no duplicated business logic.
    const [call, state, qualification] = await Promise.all([
      callId ? findCallById(callId) : Promise.resolve(null),
      callId ? getStateByCallId(callId) : Promise.resolve(null),
      callId ? findQualificationByCallId(callId) : Promise.resolve(null)
    ]);
    const leadId = inputLeadId || state?.lead_id || call?.lead_id || qualification?.lead_id || null;
    const lead = leadId ? await leadService.getLead(leadId) : null;

    if (!lead && !call && !state && !qualification) {
      logger.warn('n8n event skipped: no lead/call/state/qualification data found', {
        event,
        leadId,
        callId
      });
      return { ok: false, skipped: 'no_data' };
    }

    const anchor = callId || leadId as string;
    const occurredAt = new Date().toISOString();
    const client = getN8nClient();
    let delivered = 0;
    let skippedNoChanges = 0;

    for (const target of targets) {
      // Occurrence 1: stable event_id; skip without HTTP when unchanged.
      const baseEventId = buildN8nEventId(event, anchor);
      const baseEnvelope = buildN8nEnvelope(
        event,
        anchor,
        { lead, call, state, qualification, crm: input.crm || null },
        occurredAt
      );
      const baseHash = hashEnvelope(canonicalN8nBody(baseEnvelope));
      const previous = await findDeliveryByEventId(baseEventId, target.name);

      let eventId = baseEventId;
      let discriminator = 1;
      let payloadHash = baseHash;

      if (
        previous &&
        (previous.status === 'delivered' || previous.status === 'skipped_no_changes') &&
        previous.payload_hash === baseHash
      ) {
        const row = await upsertDeliveryAttempt({
          event,
          event_id: baseEventId,
          workflow: target.name,
          discriminator: 1,
          lead_id: leadId,
          call_id: callId,
          qualification_id: qualification?.id || null,
          payload_hash: baseHash
        });
        await markDeliverySkipped(row.id);
        skippedNoChanges++;
        continue;
      }
      if (previous && previous.status !== 'failed') {
        // Data changed since a terminal delivery: deterministic new occurrence.
        discriminator = (previous.discriminator || 1) + 1;
        eventId = buildN8nEventId(event, anchor, discriminator);
        const envelope = buildN8nEnvelope(
          event,
          anchor,
          { lead, call, state, qualification, crm: input.crm || null },
          occurredAt,
          discriminator
        );
        payloadHash = hashEnvelope(canonicalN8nBody(envelope));
      }

      const row = await upsertDeliveryAttempt({
        event,
        event_id: eventId,
        workflow: target.name,
        discriminator,
        lead_id: leadId,
        call_id: callId,
        qualification_id: qualification?.id || null,
        payload_hash: payloadHash
      });

      try {
        const envelope = buildN8nEnvelope(
          event,
          anchor,
          { lead, call, state, qualification, crm: input.crm || null },
          occurredAt,
          discriminator > 1 ? discriminator : undefined
        );
        const result = await withCrmRetry(
          () =>
            client.deliver(envelope, {
              workflow: target.name,
              url: target.url,
              timeoutMs: cfg.timeoutMs
            }),
          { maxRetries: cfg.maxRetries, baseDelayMs: cfg.baseDelayMs }
        );
        await markDeliveryDelivered(row.id, result.httpStatus);
        delivered++;
      } catch (targetErr: any) {
        const message = sanitizeN8nErrorMessage(targetErr);
        await markDeliveryFailed(row.id, message, targetErr?.status ?? null);
        logger.error('n8n delivery failed', {
          error: message,
          event,
          workflow: target.name,
          leadId,
          callId
        });
      }
    }

    logger.info('n8n event emission completed', { event, leadId, callId, delivered });
    return { ok: delivered > 0 || skippedNoChanges > 0, delivered };
  } catch (err: any) {
    logger.error('n8n event emission failed', {
      error: sanitizeN8nErrorMessage(err),
      event,
      leadId: inputLeadId,
      callId
    });
    return { ok: false };
  }
};
