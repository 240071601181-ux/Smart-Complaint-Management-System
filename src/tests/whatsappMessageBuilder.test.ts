/**
 * Phase 11 – WhatsApp message builder tests (pure functions, no I/O).
 */
import {
  buildWhatsappPayload,
  hasMeaningfulContact,
  normalizeWhatsappRecipient,
  resolveWhatsappLanguage
} from '../services/whatsapp/whatsappMessageBuilder';

describe('whatsappMessageBuilder', () => {
  const lead: any = {
    id: 'lead-1',
    name: 'Acme Logistics',
    phone: '+91 12345 67890',
    status: 'NEW'
  };
  const state: any = {
    call_id: 'call-1',
    customer_name: 'Acme Logistics',
    pickup_location: 'Chennai',
    destination: 'Bengaluru',
    required_date: '2026-09-13'
  };

  it('should normalize recipients to E.164 and reject invalid numbers', () => {
    expect(normalizeWhatsappRecipient('+91 12345 67890')).toBe('+911234567890');
    expect(normalizeWhatsappRecipient('1234567890')).toBe('+1234567890');
    expect(normalizeWhatsappRecipient('123')).toBeNull();
    expect(normalizeWhatsappRecipient('')).toBeNull();
    expect(normalizeWhatsappRecipient(null)).toBeNull();
    expect(normalizeWhatsappRecipient('not-a-number-at-all!!')).toBeNull();
  });

  it('should resolve language with override-first fallback chain', () => {
    expect(resolveWhatsappLanguage({ languageOverride: 'ta' })).toBe('ta');
    expect(resolveWhatsappLanguage({ languageOverride: 'xx', globalDefaultLanguage: 'hi' })).toBe('hi');
    expect(resolveWhatsappLanguage({})).toBe('en');
  });

  it('should build allowlisted variables only, omitting missing data', () => {
    const payload = buildWhatsappPayload({
      lead,
      state,
      template: 'call_summary_hot',
      contentSid: 'HXhot',
      globalDefaultLanguage: 'en'
    });
    expect(payload).toMatchObject({
      to: '+911234567890',
      template: 'call_summary_hot',
      language: 'en',
      contentSid: 'HXhot'
    });
    expect(payload?.variables).toEqual({
      name: 'Acme Logistics',
      origin: 'Chennai',
      destination: 'Bengaluru',
      required_date: '2026-09-13'
    });
  });

  it('should return null when the phone number is unusable (never guess)', () => {
    expect(
      buildWhatsappPayload({ lead: { ...lead, phone: 'abc' }, template: 'lead_welcome', contentSid: 'HX' })
    ).toBeNull();
    expect(
      buildWhatsappPayload({ lead: null, template: 'lead_welcome', contentSid: 'HX' })
    ).toBeNull();
  });

  it('should tolerate pg return types for dates', () => {
    const payload = buildWhatsappPayload({
      lead,
      state: { ...state, required_date: new Date('2026-09-12T00:00:00.000Z') } as any,
      template: 'call_summary_warm',
      contentSid: 'HXwarm'
    });
    expect(payload?.variables.required_date).toBe('2026-09-12');
  });

  it('should detect meaningful contact from collected requirements only', () => {
    expect(hasMeaningfulContact(state)).toBe(true);
    expect(hasMeaningfulContact({ call_id: 'c', booking_intent: 'explicit' } as any)).toBe(true);
    expect(hasMeaningfulContact({ call_id: 'c', budget: 5000 } as any)).toBe(true);
    expect(hasMeaningfulContact({ call_id: 'c' } as any)).toBe(false);
    expect(hasMeaningfulContact(null)).toBe(false);
  });
});
