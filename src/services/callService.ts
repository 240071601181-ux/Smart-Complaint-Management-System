import { upsertCall, findCallByVapiId } from '../repositories/callRepository';
import { logger } from '../utils/logger';

import { Call } from '../models/Call';

/**
 * Handle Vapi call.initiated event.
 * Creates or updates a call record with status 'initiated' and started_at timestamp.
 * Returns the created or updated Call object containing internal calls.id UUID.
 */
export const handleInitiated = async (payload: any): Promise<Call | null> => {
  const eventData = payload?.event?.data || {};
  const vapiCallId: string = eventData.callId;
  const leadId: string | null = eventData.leadId || null;
  if (!vapiCallId) {
    logger.warn('handleInitiated called without callId');
    return null;
  }
  const startedAt = new Date().toISOString();
  const call = await upsertCall({
    vapi_call_id: vapiCallId,
    lead_id: leadId,
    status: 'initiated',
    started_at: startedAt,
  });
  return call;
};

/**
 * Handle Vapi call.answered event.
 * Updates the existing call record with status 'answered' and answered_at timestamp.
 */
export const handleAnswered = async (payload: any): Promise<void> => {
  const eventData = payload?.event?.data || {};
  const vapiCallId: string = eventData.callId;
  if (!vapiCallId) {
    logger.warn('handleAnswered called without callId');
    return;
  }
  const answeredAt = new Date().toISOString();
  await upsertCall({
    vapi_call_id: vapiCallId,
    status: 'answered',
    answered_at: answeredAt,
  });
};

/**
 * Handle Vapi call.ended event.
 * Updates the call record with status 'ended', ended_at timestamp, and duration_seconds.
 */
export const handleEnded = async (payload: any): Promise<void> => {
  const eventData = payload?.event?.data || {};
  const vapiCallId: string = eventData.callId;
  if (!vapiCallId) {
    logger.warn('handleEnded called without callId');
    return;
  }
  const endedAt = new Date().toISOString();
  // Retrieve existing call to compute duration if possible
  const existing = await findCallByVapiId(vapiCallId);
  let durationSeconds: number | null = null;
  if (existing && existing.started_at) {
    const started = new Date(existing.started_at);
    const ended = new Date(endedAt);
    durationSeconds = Math.round((ended.getTime() - started.getTime()) / 1000);
  }
  await upsertCall({
    vapi_call_id: vapiCallId,
    status: 'ended',
    ended_at: endedAt,
    duration_seconds: durationSeconds,
  });
};
