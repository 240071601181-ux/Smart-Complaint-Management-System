/**
 * Phase 11 – pure WhatsApp message builder.
 *
 * Assembles provider payloads from existing Phase 1–10 domain objects.
 * Pure functions: no I/O, no HTTP, no SQL.
 *
 * Rules:
 * - Only allowlisted template variables are emitted; missing data is
 *   omitted, never inferred. No transcripts, scores, or internal IDs.
 * - Recipient must normalize to E.164-like form; otherwise the send is
 *   skipped (numbers are never guessed).
 * - Language: explicit override → template default → global default (en).
 *   No per-lead language column exists yet (future work); the resolver is
 *   a pure function ready for it.
 */
import { Lead } from '../../models/lead';
import { ConversationState } from '../../models/ConversationState';
import {
  WhatsappLanguage,
  WhatsappSendPayload,
  WhatsappTemplateName
} from './whatsappProvider';
import { WHATSAPP_TEMPLATES, isSupportedWhatsappLanguage } from './whatsappTemplates';

export interface WhatsappBuildInput {
  lead?: Lead | null;
  state?: ConversationState | null;
  template: WhatsappTemplateName;
  contentSid: string;
  languageOverride?: string | null;
  templateDefaultLanguage?: string | null;
  globalDefaultLanguage?: string | null;
}

const textOrUndefined = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

/** Normalize to E.164-like `+<digits>` (8–15 digits); return null when invalid. */
export const normalizeWhatsappRecipient = (raw: unknown): string | null => {
  if (typeof raw !== 'string') return null;
  const digits = raw.replace(/[^\d]/g, '');
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
};

export const resolveWhatsappLanguage = (input: {
  languageOverride?: string | null;
  templateDefaultLanguage?: string | null;
  globalDefaultLanguage?: string | null;
}): WhatsappLanguage => {
  if (isSupportedWhatsappLanguage(input.languageOverride)) return input.languageOverride;
  if (isSupportedWhatsappLanguage(input.templateDefaultLanguage)) return input.templateDefaultLanguage;
  if (isSupportedWhatsappLanguage(input.globalDefaultLanguage)) return input.globalDefaultLanguage;
  return 'en';
};

const dateOnly = (value: unknown): string | undefined => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim().slice(0, 10);
  }
  return undefined;
};

/**
 * Build the provider payload, or null when required data is missing
 * (caller records a skip; nothing is inferred).
 */
export const buildWhatsappPayload = (input: WhatsappBuildInput): WhatsappSendPayload | null => {
  const to = normalizeWhatsappRecipient(input.lead?.phone);
  if (!to) return null;

  const schema = WHATSAPP_TEMPLATES[input.template].variables;
  const raw: Record<string, string | number | undefined> = {};
  const name = textOrUndefined(input.lead?.name) || textOrUndefined(input.state?.customer_name);
  if (name) raw.name = name;
  const origin = textOrUndefined(input.state?.pickup_location);
  if (origin) raw.origin = origin;
  const destination = textOrUndefined(input.state?.destination);
  if (destination) raw.destination = destination;
  const requiredDate = dateOnly(input.state?.required_date);
  if (requiredDate) raw.required_date = requiredDate;

  // Closed schema: only declared variables pass through.
  const variables: Record<string, string | number> = {};
  for (const key of schema) {
    const value = raw[key];
    if (value !== undefined) variables[key] = value;
  }

  return {
    to,
    template: input.template,
    language: resolveWhatsappLanguage(input),
    contentSid: input.contentSid,
    variables
  };
};

/** True when the state shows requirements were actually collected. */
export const hasMeaningfulContact = (state?: ConversationState | null): boolean => {
  if (!state) return false;
  if (textOrUndefined(state.pickup_location)) return true;
  if (textOrUndefined(state.destination)) return true;
  if (textOrUndefined(state.vehicle_type)) return true;
  if (typeof state.budget === 'number' && Number.isFinite(state.budget) && state.budget > 0) return true;
  if (state.booking_intent === 'explicit') return true;
  return false;
};
