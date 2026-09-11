/**
 * Phase 9 – CRM mapper tests (pure function, no I/O).
 */
import { toCrmContactPayload } from '../services/crm/crmMapper';

describe('crmMapper.toCrmContactPayload', () => {
  const baseLead: any = {
    id: 'lead-1',
    source: 'web',
    name: 'Acme Logistics',
    phone: '+911234567890',
    email: 'ops@acme.example',
    status: 'NEW'
  };
  const baseCall: any = {
    id: 'call-1',
    lead_id: 'lead-1',
    vapi_call_id: 'vapi-1',
    status: 'ended',
    started_at: '2026-09-11T10:00:00.000Z',
    ended_at: '2026-09-11T10:05:00.000Z',
    duration_seconds: 300
  };
  const baseState: any = {
    id: 'state-1',
    call_id: 'call-1',
    lead_id: 'lead-1',
    customer_name: 'Acme Logistics',
    pickup_location: 'Chennai',
    destination: 'Bengaluru',
    vehicle_type: 'Truck',
    cargo_type: 'Electronics',
    cargo_weight: 500,
    cargo_dimensions: null,
    required_date: '2026-09-13',
    budget: 15000,
    urgency: 'HIGH',
    booking_intent: 'explicit',
    additional_requirements: 'Handle with care'
  };
  const baseQualification: any = {
    id: 'qual-1',
    call_id: 'call-1',
    lead_id: 'lead-1',
    score: 100,
    tier: 'HOT',
    details: { criteria: {}, totalScore: 100 },
    qualified_at: '2026-09-11T10:06:00.000Z'
  };

  it('should map full lead/call/state/qualification data with tier passthrough', () => {
    const payload = toCrmContactPayload({
      lead: baseLead,
      call: baseCall,
      state: baseState,
      qualification: baseQualification
    });
    expect(payload.external_lead_id).toBe('lead-1');
    expect(payload.external_call_id).toBe('call-1');
    expect(payload.vapi_call_id).toBe('vapi-1');
    expect(payload.name).toBe('Acme Logistics');
    expect(payload.phone).toBe('+911234567890');
    expect(payload.email).toBe('ops@acme.example');
    expect(payload.origin).toBe('Chennai');
    expect(payload.destination).toBe('Bengaluru');
    expect(payload.route).toBe('Chennai -> Bengaluru');
    expect(payload.vehicle_type).toBe('Truck');
    expect(payload.cargo_weight).toBe(500);
    expect(payload.required_date).toBe('2026-09-13');
    expect(payload.budget).toBe(15000);
    expect(payload.booking_intent).toBe('explicit');
    expect(payload.qualification_score).toBe(100);
    expect(payload.qualification_tier).toBe('HOT');
    expect(payload.qualified_at).toBe('2026-09-11T10:06:00.000Z');
    expect(payload.last_call_duration_seconds).toBe(300);
  });

  it('should omit missing data instead of inferring values', () => {
    const payload = toCrmContactPayload({
      lead: { ...baseLead, email: '', name: '  ' },
      call: null,
      state: {
        call_id: 'call-9',
        pickup_location: 'Chennai',
        destination: null,
        vehicle_type: '',
        cargo_weight: null,
        cargo_dimensions: '   ',
        required_date: null,
        budget: 0,
        booking_intent: null
      } as any,
      qualification: null
    });
    expect(payload.email).toBeUndefined();
    expect(payload.origin).toBe('Chennai');
    expect(payload.destination).toBeUndefined();
    expect(payload.route).toBeUndefined();
    expect(payload.vehicle_type).toBeUndefined();
    expect(payload.cargo_weight).toBeUndefined();
    expect(payload.cargo_dimensions).toBeUndefined();
    expect(payload.required_date).toBeUndefined();
    // Zero budget is present data and is transmitted faithfully.
    expect(payload.budget).toBe(0);
    expect(payload.booking_intent).toBeUndefined();
    expect(payload.qualification_tier).toBeUndefined();
    expect(payload.qualification_score).toBeUndefined();
  });

  it('should pass through WARM/COLD tiers and reject unknown tier values', () => {
    expect(
      toCrmContactPayload({ qualification: { ...baseQualification, tier: 'WARM' } }).qualification_tier
    ).toBe('WARM');
    expect(
      toCrmContactPayload({ qualification: { ...baseQualification, tier: 'COLD' } }).qualification_tier
    ).toBe('COLD');
    expect(
      toCrmContactPayload({ qualification: { ...baseQualification, tier: 'LUKEWARM' } as any })
        .qualification_tier
    ).toBeUndefined();
  });

  it('should tolerate pg return types (Date required_date, numeric strings)', () => {
    const payload = toCrmContactPayload({
      state: {
        call_id: 'call-2',
        required_date: new Date('2026-09-12T00:00:00.000Z'),
        budget: '7500',
        cargo_weight: '250'
      } as any
    });
    expect(payload.required_date).toBe('2026-09-12');
    expect(payload.budget).toBe(7500);
    expect(payload.cargo_weight).toBe(250);
  });
});
