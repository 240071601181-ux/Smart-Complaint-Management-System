/**
 * Phase 13 – qualification-based follow-up policy (pure functions only).
 *
 * Maps persisted qualification tier + meaningful-contact state to a list of
 * follow-up descriptors with independently configurable delays:
 * - HOT:   WhatsApp summary at +FOLLOWUP_HOT_DELAY_MIN, CRM at +FOLLOWUP_CRM_DELAY_MIN
 * - WARM:  WhatsApp summary at +FOLLOWUP_WARM_DELAY_MIN, CRM at +FOLLOWUP_CRM_DELAY_MIN
 * - COLD:  no automatic follow-ups
 * - Unknown (no qualification): missed-reminder evaluation only
 *
 * When the conversation state shows no meaningful contact, the tier summary
 * WhatsApp is replaced by a `missed_reminder` (which itself sends the
 * existing `call_missed` template at execution time). No I/O, no HTTP, no SQL.
 */
import { FollowupAction } from './followupTypes';
import { WhatsappTemplateName } from '../whatsapp/whatsappProvider';

export type FollowupTier = 'HOT' | 'WARM' | 'COLD';

export interface FollowupPolicyConfig {
  hotDelayMin: number;
  warmDelayMin: number;
  crmDelayMin: number;
}

export interface FollowupPlanItem {
  action: FollowupAction;
  /** Minutes after `now` when the follow-up becomes due. */
  delayMin: number;
  /** Only for `whatsapp_followup`: which existing template to send. */
  template?: WhatsappTemplateName;
}

export interface FollowupPolicyInput {
  tier?: FollowupTier | null;
  hasMeaningfulContact: boolean;
}

const addMinutes = (date: Date, minutes: number): Date =>
  new Date(date.getTime() + minutes * 60 * 1000);

/** Compute the scheduled_at ISO timestamp for a plan item. Exported for tests. */
export const scheduledAtFor = (now: Date, delayMin: number): string =>
  addMinutes(now, Math.max(0, delayMin)).toISOString();

/**
 * Resolve the follow-up plan for a persisted event. Returns an empty array
 * when no automatic follow-up applies (COLD, or meaningful contact with no
 * qualification). `now` is injectable for deterministic tests.
 */
export const resolveFollowupPlan = (
  input: FollowupPolicyInput,
  config: FollowupPolicyConfig
): FollowupPlanItem[] => {
  const { tier, hasMeaningfulContact } = input;

  if (!tier) {
    // No persisted qualification: only a missed-reminder evaluation applies,
    // scheduled at the WARM delay. Callers with meaningful contact get nothing.
    if (!hasMeaningfulContact) {
      return [{ action: 'missed_reminder', delayMin: config.warmDelayMin }];
    }
    return [];
  }

  if (tier === 'COLD') return [];

  if (tier === 'HOT') {
    const items: FollowupPlanItem[] = [];
    if (hasMeaningfulContact) {
      items.push({ action: 'whatsapp_followup', delayMin: config.hotDelayMin, template: 'call_summary_hot' });
    } else {
      items.push({ action: 'missed_reminder', delayMin: config.hotDelayMin });
    }
    items.push({ action: 'crm_followup', delayMin: config.crmDelayMin });
    return items;
  }

  // WARM — WhatsApp delay is independently configurable from CRM delay.
  const items: FollowupPlanItem[] = [];
  if (hasMeaningfulContact) {
    items.push({ action: 'whatsapp_followup', delayMin: config.warmDelayMin, template: 'call_summary_warm' });
  } else {
    items.push({ action: 'missed_reminder', delayMin: config.warmDelayMin });
  }
  items.push({ action: 'crm_followup', delayMin: config.crmDelayMin });
  return items;
};
