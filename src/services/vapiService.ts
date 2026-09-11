import { logger } from '../utils/logger';
import { handleInitiated, handleAnswered, handleEnded } from './callService';
import { initializeState } from './conversationStateService';
import { findCallByVapiId } from '../repositories/callRepository';
import { qualifyCall } from './qualificationService';
import { enqueueCrmSync } from './crm/crmSyncService';
import { enqueueN8nEvent } from './n8n/n8nEmitter';
import { enqueueWhatsappMessage } from './whatsapp/whatsappSender';
import { enqueueFollowupScheduling } from './followup/followupService';

/**
 * Process a Vapi webhook event.
 * This function is deliberately lightweight – it only logs the event and
 * returns immediately. Any long‑running work (e.g., persisting call data,
 * triggering downstream workflows) should be delegated to background jobs
 * or other services.
 */
export const processVapiEvent = async (payload: any) => {
  try {
    const event = payload?.event || {};
    const eventType: string = event.type || 'unknown';
    const callId: string = event.data?.callId;
    const leadId: string | null = event.data?.leadId || null;
    logger.info('Received Vapi webhook', { eventType, payload });
    // Dispatch to appropriate service based on event type
    if (eventType === 'call.initiated') {
      const call = await handleInitiated(payload);
      // Initialize conversation state with internal calls.id UUID (leadId may be null)
      if (call && call.id) {
        await initializeState(call.id, call.lead_id || null);
      }
    } else if (eventType === 'call.answered') {
      await handleAnswered(payload);
    } else if (eventType === 'call.ended') {
      await handleEnded(payload);
      const endedCall = callId ? await findCallByVapiId(callId) : null;
      if (endedCall) {
        setImmediate(() => {
          // Phase 8 qualification first; Phase 9 CRM sync + Phase 10 n8n
          // fan-out + Phase 11 WhatsApp after, still async. Failures in each
          // are contained and never affect call completion, qualification,
          // or each other.
          // call.completed is emitted even if qualification later fails.
          enqueueN8nEvent('call.completed', { callId: endedCall.id, leadId: endedCall.lead_id || null });
          enqueueWhatsappMessage({ template: 'call_missed', callId: endedCall.id, leadId: endedCall.lead_id || null });
          // Phase 13: enqueue follow-up scheduling only (never execute inline,
          // never block the webhook). The future scheduler executes due rows.
          enqueueFollowupScheduling({ callId: endedCall.id, leadId: endedCall.lead_id || null });
          qualifyCall(endedCall.id)
            .then((qualification) => {
              enqueueCrmSync({ callId: endedCall.id, leadId: endedCall.lead_id || null });
              enqueueN8nEvent('qualification.completed', {
                callId: endedCall.id,
                leadId: endedCall.lead_id || null
              });
              // Phase 11: tier-appropriate summary (sender re-verifies tier
              // and consent at send time; COLD sends nothing).
              if (qualification?.tier === 'HOT' || qualification?.tier === 'WARM') {
                enqueueWhatsappMessage({
                  template: qualification.tier === 'HOT' ? 'call_summary_hot' : 'call_summary_warm',
                  callId: endedCall.id,
                  leadId: endedCall.lead_id || null
                });
              }
            })
            .catch((err: any) => {
              logger.error('Asynchronous call qualification failed', {
                callId: endedCall.id,
                error: err.message
              });
            });
        });
      }
    }
    // Future: handle other Vapi events, tool calls, etc.
  } catch (err) {
    logger.error('Error processing Vapi webhook', { error: err, payload });
  }
};
