/**
 * Phase 11 – WhatsApp sender tests (DB pool mocked, provider injected).
 *
 * Verifies: deny-by-default consent gating, successful delivery + SID
 * persistence, tier-mismatch/missed-contact suppression, idempotent
 * no-change skipping, failure containment (never throws), disabled-mode
 * skip, secret redaction, and no unrelated lead writes.
 */
import { pool } from '../database';
import {
  resetWhatsappProviderForTests,
  setWhatsappProviderForTests
} from '../services/whatsapp/whatsappProvider';
import {
  sanitizeWhatsappErrorMessage,
  sendWhatsappOnce
} from '../services/whatsapp/whatsappSender';
import { MockWhatsappProvider } from '../services/whatsapp/mockWhatsappProvider';

jest.mock('../database', () => {
  const mPool = { query: jest.fn() };
  return { pool: mPool, default: mPool };
});

describe('whatsappSender', () => {
  const OLD_ENV = process.env;
  let mockProvider: MockWhatsappProvider;

  const lead: any = {
    id: 'lead-1',
    source: 'web',
    name: 'Acme Logistics',
    phone: '+911234567890',
    status: 'NEW'
  };
  const call: any = {
    id: 'call-1',
    lead_id: 'lead-1',
    vapi_call_id: 'vapi-1',
    status: 'ended',
    ended_at: '2026-09-11T10:05:00.000Z',
    duration_seconds: 300
  };
  const hotState: any = {
    id: 'state-1',
    call_id: 'call-1',
    lead_id: 'lead-1',
    pickup_location: 'Chennai',
    destination: 'Bengaluru',
    required_date: '2026-09-13',
    booking_intent: 'explicit'
  };
  const hotQualification: any = {
    id: 'qual-1',
    call_id: 'call-1',
    lead_id: 'lead-1',
    score: 85,
    tier: 'HOT',
    qualified_at: '2026-09-11T10:06:00.000Z'
  };

  const baseEnv = () => {
    process.env = {
      ...OLD_ENV,
      WHATSAPP_ENABLED: 'true',
      WHATSAPP_PROVIDER: 'mock',
      WHATSAPP_ACCOUNT_SID: 'ACtest',
      WHATSAPP_AUTH_TOKEN: 'secret-token',
      WHATSAPP_FROM_NUMBER: 'whatsapp:+10000000000',
      WHATSAPP_DEFAULT_LANGUAGE: 'en',
      WHATSAPP_REQUIRE_CONSENT: 'false',
      WHATSAPP_TEMPLATES_JSON: JSON.stringify({
        lead_welcome_en: 'HXwelcome',
        call_summary_hot_en: 'HXhot',
        call_summary_warm_en: 'HXwarm',
        call_missed_en: 'HXmissed'
      })
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    baseEnv();
    mockProvider = new MockWhatsappProvider();
    setWhatsappProviderForTests(mockProvider);
  });

  afterEach(() => {
    resetWhatsappProviderForTests();
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  const mockReads = (overrides: { state?: any; qualification?: any; lead?: any } = {}) => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [call] }) // findCallById
      .mockResolvedValueOnce({ rows: [overrides.state !== undefined ? overrides.state : hotState] }) // state
      .mockResolvedValueOnce({
        rows: [overrides.qualification !== undefined ? overrides.qualification : hotQualification]
      }) // qualification
      .mockResolvedValueOnce({ rows: [overrides.lead !== undefined ? overrides.lead : lead] }); // lead
  };

  it('should deny sends by default when explicit consent is unavailable', async () => {
    process.env.WHATSAPP_REQUIRE_CONSENT = 'true';
    mockReads();
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ id: 'w-0', attempts: 1 }] }) // upsert attempt
      .mockResolvedValueOnce({ rows: [{ id: 'w-0', status: 'skipped_no_consent' }] }); // mark skipped

      const outcome = await sendWhatsappOnce({ template: 'call_summary_hot', callId: 'call-1' });
    expect(outcome).toEqual({ ok: false, skipped: 'no_consent' });
    expect(mockProvider.calls).toHaveLength(0);
    const skippedCall = (pool.query as jest.Mock).mock.calls.find(
      (c) => Array.isArray(c[1]) && c[1].includes('skipped_no_consent')
    );
    expect(skippedCall).toBeDefined();
  });

  it('should deliver a HOT summary and persist the provider SID', async () => {
    mockReads();
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [] }) // no previous delivery
      .mockResolvedValueOnce({ rows: [{ id: 'w-1', attempts: 1 }] }) // upsert attempt
      .mockResolvedValueOnce({ rows: [{ id: 'w-1', status: 'delivered' }] }); // mark delivered

    const outcome = await sendWhatsappOnce({ template: 'call_summary_hot', callId: 'call-1' });
    expect(outcome).toEqual({ ok: true });
    expect(mockProvider.calls).toHaveLength(1);
    expect(mockProvider.calls[0].payload).toMatchObject({
      to: '+911234567890',
      template: 'call_summary_hot',
      language: 'en',
      contentSid: 'HXhot'
    });
    expect(mockProvider.calls[0].payload.variables).toEqual({
      name: 'Acme Logistics',
      origin: 'Chennai',
      destination: 'Bengaluru',
      required_date: '2026-09-13'
    });
    const statements = (pool.query as jest.Mock).mock.calls.map((c) => String(c[0]));
    expect(statements.some((s) => /UPDATE\s+leads/i.test(s))).toBe(false);
  });

  it('should suppress mismatched tiers and meaningful-contact missed messages without provider calls', async () => {
    // WARM template requested but qualification is HOT.
    mockReads();
    const tierMismatch = await sendWhatsappOnce({ template: 'call_summary_warm', callId: 'call-1' });
    expect(tierMismatch).toEqual({ ok: false, skipped: 'suppressed' });

    // Missed template but requirements were collected.
    jest.clearAllMocks();
    mockReads();
    const missedSuppressed = await sendWhatsappOnce({ template: 'call_missed', callId: 'call-1' });
    expect(missedSuppressed).toEqual({ ok: false, skipped: 'suppressed' });
    expect(mockProvider.calls).toHaveLength(0);
  });

  it('should send the missed template when no requirements were collected', async () => {
    mockReads({ state: { id: 's', call_id: 'call-1', lead_id: 'lead-1' } });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'w-2', attempts: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'w-2', status: 'delivered' }] });

    const outcome = await sendWhatsappOnce({ template: 'call_missed', callId: 'call-1' });
    expect(outcome).toEqual({ ok: true });
    expect(mockProvider.calls).toHaveLength(1);
    expect(mockProvider.calls[0].payload.template).toBe('call_missed');
  });

  it('should skip the provider call when the payload hash is unchanged', async () => {
    const { buildWhatsappPayload } = require('../services/whatsapp/whatsappMessageBuilder') as typeof import(
      '../services/whatsapp/whatsappMessageBuilder'
    );
    const { hashWhatsappPayload } = require('../services/whatsapp/whatsappProvider') as typeof import(
      '../services/whatsapp/whatsappProvider'
    );
    const payload = buildWhatsappPayload({
      lead,
      state: hotState,
      template: 'call_summary_hot',
      contentSid: 'HXhot',
      globalDefaultLanguage: 'en'
    });
    expect(payload).not.toBeNull();
    const payloadHash = hashWhatsappPayload(payload!);
    mockReads();
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [{ message_key: 'wa:mock:call_summary_hot:call-1', status: 'delivered', payload_hash: payloadHash }]
      })
      .mockResolvedValueOnce({ rows: [{ id: 'w-3', attempts: 2 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'w-3', status: 'skipped_no_changes' }] });

      const outcome = await sendWhatsappOnce({ template: 'call_summary_hot', callId: 'call-1' });
      expect(outcome).toEqual({ ok: true, skipped: 'no_changes' });
      expect(mockProvider.calls).toHaveLength(0);
      const skippedCall = (pool.query as jest.Mock).mock.calls.find(
        (c) => Array.isArray(c[1]) && c[1].includes('skipped_no_changes')
      );
      expect(skippedCall).toBeDefined();
    });

  it('should contain provider failures: record failed row and resolve (never throw)', async () => {
    mockProvider.enqueue({ error: Object.assign(new Error('provider boom'), { retryable: false }) });
    mockReads();
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'w-4', attempts: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'w-4', attempts: 2 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'w-4', status: 'failed' }] });

    const outcome = await sendWhatsappOnce({ template: 'call_summary_hot', callId: 'call-1' });
    expect(outcome.ok).toBe(false);
    await expect(Promise.resolve(outcome)).resolves.toBeDefined();
    const failedCall = (pool.query as jest.Mock).mock.calls.find((c) =>
      /status = 'failed'/i.test(String(c[0]))
    );
    expect(failedCall).toBeDefined();
    expect(failedCall[1]).toEqual(expect.arrayContaining(['provider boom']));
  });

  it('should skip silently when disabled and redact secrets from errors', async () => {
    process.env.WHATSAPP_ENABLED = 'false';
    const outcome = await sendWhatsappOnce({ template: 'lead_welcome', leadId: 'lead-1' });
    expect(outcome).toEqual({ ok: false, skipped: 'disabled' });
    expect(mockProvider.calls).toHaveLength(0);
    expect(pool.query).not.toHaveBeenCalled();

    const message = sanitizeWhatsappErrorMessage(
      new Error('send failed secret-token to whatsapp:+911234567890')
    );
    expect(message).not.toContain('secret-token');
    expect(message).not.toContain('+911234567890');
  });
});
