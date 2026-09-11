/**
 * Phase 11 – WhatsApp template catalog tests (no I/O).
 */
import {
  WHATSAPP_LANGUAGES,
  WHATSAPP_TEMPLATES,
  resolveTemplateContentSid
} from '../services/whatsapp/whatsappTemplates';

describe('whatsappTemplates catalog', () => {
  it('should define exactly the approved template set (no opt-out template in this phase)', () => {
    expect(Object.keys(WHATSAPP_TEMPLATES).sort()).toEqual([
      'call_missed',
      'call_summary_hot',
      'call_summary_warm',
      'lead_welcome'
    ]);
  });

  it('should declare a closed variable schema per template', () => {
    for (const def of Object.values(WHATSAPP_TEMPLATES)) {
      expect(def.variables.length).toBeGreaterThan(0);
      expect(new Set(def.variables).size).toBe(def.variables.length);
    }
    expect(WHATSAPP_TEMPLATES.call_summary_hot.variables).toEqual(
      expect.arrayContaining(['name', 'origin', 'destination', 'required_date'])
    );
  });

  it('should support English, Hindi, and Tamil', () => {
    expect(WHATSAPP_LANGUAGES).toEqual(['en', 'hi', 'ta']);
  });

  it('should resolve content SIDs per language with English fallback', () => {
    const sids = {
      lead_welcome_en: 'HXen',
      lead_welcome_hi: 'HXhi',
      call_summary_hot_en: 'HXhot'
    };
    expect(resolveTemplateContentSid(sids, 'lead_welcome', 'hi')).toBe('HXhi');
    expect(resolveTemplateContentSid(sids, 'lead_welcome', 'ta')).toBe('HXen');
    expect(resolveTemplateContentSid(sids, 'call_summary_hot', 'en')).toBe('HXhot');
    expect(resolveTemplateContentSid(sids, 'call_summary_warm', 'en')).toBeNull();
    expect(resolveTemplateContentSid({}, 'lead_welcome', 'en')).toBeNull();
  });
});
