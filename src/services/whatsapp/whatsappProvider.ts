/**
 * Phase 11 – WhatsApp provider abstraction.
 *
 * Provider-independent contract for outbound WhatsApp template messaging.
 * All vendor quirks live in the concrete provider file; callers only see
 * this interface. Template content lives vendor-side; the backend selects
 * a logical template and fills an allowlisted variable set.
 *
 * Constraints enforced by design:
 * - Template-based sends only; the LLM never authors message text and never
 *   calls WhatsApp (no agent imports, no tools).
 * - Sends are deny-by-default (see whatsappSender consent gate).
 * - Credentials never appear in logs or persisted rows.
 */

export type WhatsappTemplateName =
  | 'lead_welcome'
  | 'call_summary_hot'
  | 'call_summary_warm'
  | 'call_missed';

export type WhatsappLanguage = 'en' | 'hi' | 'ta';

export interface WhatsappTemplateVariables {
  [variable: string]: string | number | undefined;
}

export interface WhatsappSendPayload {
  /** Recipient in E.164 form (e.g. +911234567890). */
  to: string;
  template: WhatsappTemplateName;
  language: WhatsappLanguage;
  /** Vendor template/content ID resolved from configuration. */
  contentSid: string;
  variables: WhatsappTemplateVariables;
}

export interface WhatsappSendOptions {
  /** Stable key `wa:{provider}:{template}:{anchor}`. */
  idempotencyKey: string;
  timeoutMs: number;
}

export interface WhatsappSendResult {
  /** Provider-side message ID (e.g. Twilio SID). */
  providerMessageId: string;
}

export interface WhatsappProvider {
  readonly name: string;
  sendTemplate(payload: WhatsappSendPayload, opts: WhatsappSendOptions): Promise<WhatsappSendResult>;
}

/** Stable idempotency key per provider + template + anchor (call or lead id). */
export const buildWhatsappMessageKey = (
  providerName: string,
  template: WhatsappTemplateName,
  anchor: string
): string => `wa:${providerName}:${template}:${anchor}`;

/** Stable sha256 hash of the canonical send payload for no-change skipping. */
export const hashWhatsappPayload = (payload: WhatsappSendPayload): string => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createHash } = require('crypto') as typeof import('crypto');
  const canonical = JSON.stringify(payload, Object.keys(payload).sort());
  return createHash('sha256').update(canonical).digest('hex');
};

let testOverride: WhatsappProvider | null = null;

/** Test-only hook: inject a fake provider without touching env. */
export const setWhatsappProviderForTests = (provider: WhatsappProvider | null): void => {
  testOverride = provider;
};

export const resetWhatsappProviderForTests = (): void => {
  testOverride = null;
};

/** Resolve the configured provider. Replaceable: add a file implementing WhatsappProvider. */
export const getWhatsappProvider = (): WhatsappProvider => {
  if (testOverride) return testOverride;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getWhatsappConfig } = require('../../config') as typeof import('../../config');
  const providerName = (getWhatsappConfig().provider || 'twilio').toLowerCase();
  if (providerName === 'mock') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MockWhatsappProvider } = require('./mockWhatsappProvider') as typeof import('./mockWhatsappProvider');
    return new MockWhatsappProvider();
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { TwilioWhatsappProvider } = require('./twilioWhatsappProvider') as typeof import('./twilioWhatsappProvider');
  return new TwilioWhatsappProvider();
};
