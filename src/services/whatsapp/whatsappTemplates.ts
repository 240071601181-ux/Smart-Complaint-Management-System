/**
 * Phase 11 – WhatsApp template catalog.
 *
 * Logical template names with closed variable schemas. Vendor-side
 * template/content IDs are resolved from configuration per
 * (template × language); template text lives vendor-side (approved
 * content) and is never composed by the backend or the LLM.
 *
 * Supported languages follow the voice agent: English, Hindi, Tamil.
 * opt_out_confirm is intentionally absent: there is no inbound
 * WhatsApp/STOP handling in this phase (documented future work).
 */
import { WhatsappLanguage, WhatsappTemplateName } from './whatsappProvider';

export interface WhatsappTemplateDef {
  /** Closed allowlist of variable names this template accepts. */
  variables: string[];
  /** Human description for operators approving vendor-side content. */
  description: string;
}

export const WHATSAPP_TEMPLATES: Record<WhatsappTemplateName, WhatsappTemplateDef> = {
  lead_welcome: {
    variables: ['name'],
    description: 'Welcome + what-to-expect notice after lead creation (opt-in only).'
  },
  call_summary_hot: {
    variables: ['name', 'origin', 'destination', 'required_date'],
    description: 'Post-call recap + next step for HOT leads (no price promises).'
  },
  call_summary_warm: {
    variables: ['name', 'origin', 'destination', 'required_date'],
    description: 'Post-call recap + next step for WARM leads (no price promises).'
  },
  call_missed: {
    variables: ['name'],
    description: 'Brief missed-contact notice when a call ends with no requirements collected.'
  }
};

export const WHATSAPP_LANGUAGES: WhatsappLanguage[] = ['en', 'hi', 'ta'];

export const isSupportedWhatsappLanguage = (value: unknown): value is WhatsappLanguage =>
  value === 'en' || value === 'hi' || value === 'ta';

/**
 * Resolve the vendor content/template ID for (template × language),
 * falling back to English. Returns null when unconfigured (send is skipped).
 */
export const resolveTemplateContentSid = (
  templateSids: Record<string, string>,
  template: WhatsappTemplateName,
  language: WhatsappLanguage
): string | null => {
  const direct = templateSids[`${template}_${language}`];
  if (typeof direct === 'string' && direct.trim().length > 0) return direct.trim();
  const english = templateSids[`${template}_en`];
  if (typeof english === 'string' && english.trim().length > 0) return english.trim();
  return null;
};
