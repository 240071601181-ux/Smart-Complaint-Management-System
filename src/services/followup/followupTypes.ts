/**
 * Phase 13 – Follow-up automation type definitions.
 *
 * Shared vocabulary for follow-up scheduling and execution. No I/O,
 * no HTTP, no SQL here — only types and stable key builders.
 *
 * Constraints enforced by design:
 * - Follow-ups are driven by persisted business events/state, never by LLM decisions.
 * - No new WhatsApp/CRM/Calendar providers are defined here; execution
 *   reuses the existing Phase 9/11/12 single-attempt functions.
 * - Qualification scoring is never modified from this module.
 */

export type FollowupAction = 'whatsapp_followup' | 'crm_followup' | 'missed_reminder';

export type FollowupStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export const FOLLOWUP_ACTIONS: FollowupAction[] = [
  'whatsapp_followup',
  'crm_followup',
  'missed_reminder'
];

export const isFollowupAction = (value: unknown): value is FollowupAction =>
  value === 'whatsapp_followup' || value === 'crm_followup' || value === 'missed_reminder';

/**
 * Stable idempotency key per action + anchor, with `:n` discriminator for
 * changed re-schedules of the same anchor (mirrors n8n/calendar convention).
 * Anchor is `callId || leadId`.
 */
export const buildFollowupKey = (
  action: FollowupAction,
  anchor: string,
  discriminator?: number
): string => {
  const base = `fu:${action}:${anchor}`;
  return discriminator && discriminator > 1 ? `${base}:${discriminator}` : base;
};
