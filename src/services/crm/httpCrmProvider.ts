/**
 * Phase 9 – generic HTTP CRM provider.
 *
 * The single replaceable HTTP boundary for CRM synchronization.
 * All provider quirks (paths, auth header, contact-id response shape) live
 * here; the sync service only sees the `CrmProvider` interface.
 *
 * Safety:
 * - Per-call timeout (never hangs the async worker indefinitely).
 * - Errors are sanitized: no API keys, tokens, or full response bodies leak.
 * - Errors carry `retryable` + `status` flags consumed by `withCrmRetry`.
 */
import axios from 'axios';
import { getCrmConfig } from '../../config';
import { CrmContactPayload, CrmProvider, CrmSyncResult, CrmUpsertOptions } from './crmProvider';

const extractContactId = (data: any, fallback: string): string => {
  if (!data || typeof data !== 'object') return fallback;
  const candidates = [
    data.id,
    data.contactId,
    data.contact_id,
    data.contact?.id,
    data.data?.id,
    data.result?.id
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.length > 0) return candidate;
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return String(candidate);
  }
  return fallback;
};

export class HttpCrmProvider implements CrmProvider {
  readonly name = 'http';

  async upsertContact(payload: CrmContactPayload, opts: CrmUpsertOptions): Promise<CrmSyncResult> {
    const cfg = getCrmConfig();
    const baseUrl = (cfg.baseUrl || '').replace(/\/+$/, '');
    if (!baseUrl) {
      const err: any = new Error('CRM_BASE_URL is not configured');
      err.retryable = false;
      throw err;
    }
    if (!cfg.apiKey) {
      const err: any = new Error('CRM_API_KEY is not configured');
      err.retryable = false;
      throw err;
    }

    const isUpdate = !!opts.crmContactId;
    const path = isUpdate
      ? `${cfg.updatePath}/${encodeURIComponent(opts.crmContactId as string)}`
      : cfg.upsertPath;
    const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

    try {
      const response = await axios.request({
        method: isUpdate ? 'patch' : 'post',
        url,
        data: payload,
        timeout: opts.timeoutMs,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.apiKey}`,
          'Idempotency-Key': opts.idempotencyKey
        }
      });
      const fallbackId =
        opts.crmContactId ||
        payload.external_call_id ||
        payload.external_lead_id ||
        'unknown';
      return {
        crmContactId: extractContactId(response?.data, fallbackId),
        created: !isUpdate && response?.status === 201
      };
    } catch (err: any) {
      const status = err?.response?.status;
      const code = err?.code;
      const timedOut = code === 'ECONNABORTED' || /timeout/i.test(err?.message || '');
      const retryable =
        timedOut ||
        code === 'ECONNREFUSED' ||
        code === 'ECONNRESET' ||
        code === 'ENOTFOUND' ||
        code === 'EAI_AGAIN' ||
        status === 429 ||
        (typeof status === 'number' && status >= 500 && status < 600);
      // Sanitized message: status only, never the key, token, URL query, or body.
      const safe: any = new Error(
        status ? `CRM request failed (status ${status})` : 'CRM request failed (network error)'
      );
      safe.retryable = retryable;
      safe.status = status;
      if (timedOut) safe.timeout = true;
      if (code) safe.code = code;
      throw safe;
    }
  }
}
