import { ConversationState } from '../models/ConversationState';
import { BookingIntent, Qualification, QualificationDetails, QualificationTier } from '../models/Qualification';
import { findCallById } from '../repositories/callRepository';
import { upsertQualification } from '../repositories/qualificationRepository';
import { getStateByCallId } from './conversationStateService';
import { logger } from '../utils/logger';

const DAY_MS = 24 * 60 * 60 * 1000;

const hasText = (value: unknown): boolean => typeof value === 'string' && value.trim().length > 0;

const validPositiveNumber = (value: unknown): boolean => {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0;
  if (typeof value === 'string' && value.trim().length > 0) {
    const num = Number(value);
    return Number.isFinite(num) && num > 0;
  }
  return false;
};

// pg returns DATE columns as JS Date objects and NUMERIC columns as strings.
// Normalize to YYYY-MM-DD without inferring missing values.
const normalizeDateOnly = (value: unknown): string | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim().slice(0, 10);
  }
  return null;
};

const scoreTier = (score: number): QualificationTier => {
  if (score >= 70) return 'HOT';
  if (score >= 40) return 'WARM';
  return 'COLD';
};

const urgencyCriterion = (state: ConversationState, qualifiedAt: Date) => {
  const normalized = normalizeDateOnly(state.required_date);
  if (!normalized) {
    return { points: 0, qualified: false, reason: 'required_date missing' };
  }
  const requiredDate = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(requiredDate.getTime())) {
    return { points: 0, qualified: false, reason: 'required_date invalid' };
  }
  const daysUntilRequired = Math.floor((requiredDate.getTime() - Date.UTC(
    qualifiedAt.getUTCFullYear(), qualifiedAt.getUTCMonth(), qualifiedAt.getUTCDate()
  )) / DAY_MS);
  if (daysUntilRequired >= 0 && daysUntilRequired <= 3) {
    return { points: 30, qualified: true, reason: 'required_date is within three days' };
  }
  return { points: 0, qualified: false, reason: 'required_date is more than three days away or past' };
};

export const calculateQualification = (state: ConversationState, qualifiedAt = new Date()): {
  score: number;
  tier: QualificationTier;
  details: QualificationDetails;
} => {
  const urgency = urgencyCriterion(state, qualifiedAt);
  const budget = validPositiveNumber(state.budget)
    ? { points: 20, qualified: true, reason: 'budget is disclosed and positive' }
    : { points: 0, qualified: false, reason: 'budget missing or not positive' };
  const route = hasText(state.pickup_location) && hasText(state.destination)
    ? { points: 20, qualified: true, reason: 'pickup and destination are present' }
    : { points: 0, qualified: false, reason: 'pickup or destination missing' };
  const vehicle = hasText(state.vehicle_type)
    ? { points: 10, qualified: true, reason: 'vehicle_type is present' }
    : { points: 0, qualified: false, reason: 'vehicle_type missing' };
  const cargo = validPositiveNumber(state.cargo_weight) || hasText(state.cargo_dimensions)
    ? { points: 10, qualified: true, reason: 'cargo weight or dimensions are present' }
    : { points: 0, qualified: false, reason: 'cargo weight and dimensions missing' };
  const bookingIntent: BookingIntent = state.booking_intent === 'explicit'
    ? 'explicit'
    : state.booking_intent === 'not_explicit' ? 'not_explicit' : 'unknown';
  const booking = bookingIntent === 'explicit'
    ? { points: 10, qualified: true, reason: 'explicit booking intent recorded' }
    : { points: 0, qualified: false, reason: 'explicit booking intent not recorded' };

  const score = urgency.points + budget.points + route.points + vehicle.points + cargo.points + booking.points;
  const details: QualificationDetails = {
    criteria: {
      urgency,
      budget,
      route,
      vehicle,
      cargo,
      bookingIntent: booking
    },
    totalScore: score,
    qualifiedAt: qualifiedAt.toISOString()
  };
  return { score, tier: scoreTier(score), details };
};

export const qualifyCall = async (callId: string, qualifiedAt = new Date()): Promise<Qualification> => {
  const state = await getStateByCallId(callId);
  if (!state) {
    throw new Error(`Conversation state for call ${callId} not found`);
  }
  const call = await findCallById(callId);
  const result = calculateQualification(state, qualifiedAt);
  const qualification = await upsertQualification({
    call_id: callId,
    lead_id: state.lead_id ?? call?.lead_id ?? null,
    score: result.score,
    tier: result.tier,
    details: result.details,
    qualified_at: qualifiedAt.toISOString()
  });
  logger.info('Lead qualification completed', { callId, score: result.score, tier: result.tier });
  return qualification;
};