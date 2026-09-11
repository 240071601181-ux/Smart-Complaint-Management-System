/**
 * Phase 13 – follow-up policy tests (pure functions, no I/O).
 *
 * Verifies the independently configurable HOT/WARM/CRM delays, COLD
 * suppression, missed-reminder substitution, and unknown-tier handling.
 */
import { resolveFollowupPlan, scheduledAtFor } from '../services/followup/followupPolicy';

describe('resolveFollowupPlan', () => {
  const config = { hotDelayMin: 30, warmDelayMin: 240, crmDelayMin: 60 };

  it('should schedule HOT WhatsApp at +HOT delay and CRM at +CRM delay', () => {
    const plan = resolveFollowupPlan({ tier: 'HOT', hasMeaningfulContact: true }, config);
    expect(plan).toEqual([
      { action: 'whatsapp_followup', delayMin: 30, template: 'call_summary_hot' },
      { action: 'crm_followup', delayMin: 60 }
    ]);
  });

  it('should schedule WARM WhatsApp at +WARM delay and CRM at +CRM delay (independent)', () => {
    const plan = resolveFollowupPlan({ tier: 'WARM', hasMeaningfulContact: true }, config);
    expect(plan).toEqual([
      { action: 'whatsapp_followup', delayMin: 240, template: 'call_summary_warm' },
      { action: 'crm_followup', delayMin: 60 }
    ]);
  });

  it('should keep HOT/WARM/CRM delays independently configurable', () => {
    const custom = { hotDelayMin: 10, warmDelayMin: 20, crmDelayMin: 45 };
    expect(resolveFollowupPlan({ tier: 'HOT', hasMeaningfulContact: true }, custom)[0].delayMin).toBe(10);
    expect(resolveFollowupPlan({ tier: 'HOT', hasMeaningfulContact: true }, custom)[1].delayMin).toBe(45);
    expect(resolveFollowupPlan({ tier: 'WARM', hasMeaningfulContact: true }, custom)[0].delayMin).toBe(20);
    expect(resolveFollowupPlan({ tier: 'WARM', hasMeaningfulContact: true }, custom)[1].delayMin).toBe(45);
  });

  it('should substitute a missed reminder when there is no meaningful contact', () => {
    expect(resolveFollowupPlan({ tier: 'HOT', hasMeaningfulContact: false }, config)).toEqual([
      { action: 'missed_reminder', delayMin: 30 },
      { action: 'crm_followup', delayMin: 60 }
    ]);
    expect(resolveFollowupPlan({ tier: 'WARM', hasMeaningfulContact: false }, config)).toEqual([
      { action: 'missed_reminder', delayMin: 240 },
      { action: 'crm_followup', delayMin: 60 }
    ]);
  });

  it('should schedule nothing for COLD tiers', () => {
    expect(resolveFollowupPlan({ tier: 'COLD', hasMeaningfulContact: true }, config)).toEqual([]);
    expect(resolveFollowupPlan({ tier: 'COLD', hasMeaningfulContact: false }, config)).toEqual([]);
  });

  it('should evaluate only a missed reminder when qualification is unknown', () => {
    expect(resolveFollowupPlan({ tier: null, hasMeaningfulContact: false }, config)).toEqual([
      { action: 'missed_reminder', delayMin: 240 }
    ]);
    expect(resolveFollowupPlan({ tier: null, hasMeaningfulContact: true }, config)).toEqual([]);
  });

  it('should compute scheduled_at timestamps from delays', () => {
    const now = new Date('2026-09-11T10:00:00.000Z');
    expect(scheduledAtFor(now, 30)).toBe('2026-09-11T10:30:00.000Z');
    expect(scheduledAtFor(now, 240)).toBe('2026-09-11T14:00:00.000Z');
  });
});
