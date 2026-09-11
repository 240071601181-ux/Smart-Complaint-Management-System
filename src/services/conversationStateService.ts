import { findStateByCallId, createState, updateState as repoUpdateState, findStateById } from '../repositories/conversationStateRepository';
import { ConversationState } from '../models/ConversationState';
import { logger } from '../utils/logger';

/**
 * Initialize conversation state for a call.
 * If a state already exists for the call, returns existing state (idempotent).
 * leadId may be null – we allow that per requirement.
 */
export const initializeState = async (callId: string, leadId: string | null = null): Promise<ConversationState> => {
  const existing = await findStateByCallId(callId);
  if (existing) {
    logger.info('Conversation state already exists for call', { callId });
    return existing;
  }
  const state = await createState({ call_id: callId, lead_id: leadId });
  logger.info('Conversation state initialized', { callId, leadId });
  return state;
};

/**
 * Get conversation state by internal callId.
 */
export const getStateByCallId = async (callId: string): Promise<ConversationState | null> => {
  return findStateByCallId(callId);
};

/**
 * Update conversation state fields for a given call.
 */
export const updateState = async (callId: string, updates: Partial<ConversationState>): Promise<ConversationState | null> => {
  const updated = await repoUpdateState(callId, updates);
  logger.info('Conversation state updated', { callId, updates });
  return updated;
};
