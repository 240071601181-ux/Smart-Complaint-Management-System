/**
 * Phase 10 – n8n payload builder tests (pure functions, no I/O).
 */
import {
  buildN8nEnvelope,
  buildN8nEventId,
  canonicalN8nBody
} from '../services/n8n/n8nPayloadBuilder';

describe('n8n payload builder', () => {
  const lead: any = {
    id: 'lead-1',
    source: 'web',
    name: 'Acme Logistics',
    phone: '+911234567890',
    email: 'ops@acme.example',
    status: 'NEW'
  };
  const call: any = {
    id: 'call-1',
    vapi_call_id: 'vapi-1',
    lead_id: 'lead-1',
    status: 'ended',
    started_at: '2026-09-11T10:00:00.000Z',
    ended_at: '2026-09-11T10:05:00.000Z',
    duration_seconds: 300
  };
  const state: any = {
    call_id: 'call-1',
    lead_id: 'lead-1',
    customer_name: 'Acme Logistics',
    pickup_location: 'Chennai',
    destination: 'Bengaluru',
    vehicle_type: 'Truck',
    cargo_weight: 500,
    required_date: '2026-09-13',
    budget: 15000,
    booking_intent: 'explicit'
  };
  const qualification: any = {
    id: 'qual-1',
    call_id: 'call-1',
    lead_id: 'lead-1',
    score: 85,
    tier: 'HOT',
    qualified_at: '2026-09-11T10:06:00.000Z',
    details: { totalScore: 85 }
  };

  it('should build stable event ids with deterministic discriminator suffixes', () => {
    expect(buildN8nEventId('call.completed', 'call-1')).toBe('n8n:call.completed:call-1');
    expect(buildN8nEventId('call.completed', 'call-1', 1)).toBe('n8n:call.completed:call-1');
    expect(buildN8nEventId('call.completed', 'call-1', 2)).toBe('n8n:call.completed:call-1:2');
  });

  it('should build a qualification.completed envelope with allowlisted fields and tier passthrough', () => {
    const envelope = buildN8nEnvelope(
      'qualification.completed',
      'call-1',
      { lead, call, state, qualification },
      '2026-09-11T10:07:00.000Z'
    );
    expect(envelope.event).toBe('qualification.completed');
    expect(envelope.event_id).toBe('n8n:qualification.completed:call-1');
    expect(envelope.data.lead?.name).toBe('Acme Logistics');
    expect(envelope.data.call?.vapi_call_id).toBe('vapi-1');
    expect(envelope.data.shipment?.pickup_location).toBe('Chennai');
    expect(envelope.data.qualification?.score).toBe(85);
    expect(envelope.data.qualification?.tier).toBe('HOT');
    // No transcript or unlisted fields may leak into the envelope.
    expect(JSON.stringify(envelope)).not.toMatch(/transcript/i);
  });

  it('should omit missing data instead of inferring values', () => {
    const envelope = buildN8nEnvelope(
      'call.completed',
      'call-9',
      {
        lead: { ...lead, email: '', name: '  ' },
        state: { call_id: 'call-9', pickup_location: 'Chennai', destination: null } as any
      },
      '2026-09-11T10:07:00.000Z'
    );
    expect(envelope.data.lead?.email).toBeUndefined();
    expect(envelope.data.shipment?.pickup_location).toBe('Chennai');
    expect(envelope.data.shipment?.destination).toBeUndefined();
    expect(envelope.data.qualification).toBeUndefined();
    expect(envelope.data.crm).toBeUndefined();
  });

  it('should reject unknown tier values and tolerate pg return types', () => {
    const badTier = buildN8nEnvelope('qualification.completed', 'call-1', {
      qualification: { ...qualification, tier: 'LUKEWARM' } as any
    });
    expect(badTier.data.qualification?.tier).toBeUndefined();
    const pgTypes = buildN8nEnvelope('call.completed', 'call-2', {
      state: {
        call_id: 'call-2',
        required_date: new Date('2026-09-12T00:00:00.000Z'),
        budget: '7500'
      } as any
    });
    expect(pgTypes.data.shipment?.required_date).toBe('2026-09-12');
    expect(pgTypes.data.shipment?.budget).toBe(7500);
  });

  it('should produce a canonical body covering event, event_id, occurred_at, and data', () => {
    const envelope = buildN8nEnvelope('lead.created', 'lead-1', { lead }, '2026-09-11T10:00:00.000Z');
    const canonical = JSON.parse(canonicalN8nBody(envelope));
    expect(canonical).toEqual({
      event: 'lead.created',
      event_id: 'n8n:lead.created:lead-1',
      occurred_at: '2026-09-11T10:00:00.000Z',
      data: envelope.data
    });
    expect(canonical).not.toHaveProperty('signature');
  });
});
