/**
 * Phase 13 – follow-up service tests (DB pool mocked, downstream CRM/WhatsApp mocked).
 *
 * Verifies: idempotent scheduling, COLD suppression, terminal-row dedupe,
 * HOT/WARM/CRM delay wiring, WhatsApp consent completion (never bypassed),
 * transport-failure containment with backoff, cancel/retry/max-attempts,
 * disabled skip, secret redaction, and no qualification writes.
 */
import { pool } from '../database';
import {
  cancelFollowup,
  executeDueFollowUps,
  executeFollowupOnce,
  retryFollowup,
  sanitizeFollowupErrorMessage,
  scheduleFollowup,
  scheduleFollowupsForEvent
} from '../services/followup/followupService';
import { sendWhatsappOnce } from '../services/whatsapp/whatsappSender';
import { syncCrmContactOnce } from '../services/crm/crmSyncService';

jest.mock('../database', () => {
  const mPool = { query: jest.fn() };
  return { pool: mPool, default: mPool };
});

jest.mock('../services/whatsapp/whatsappSender', () => ({
  sendWhatsappOnce: jest.fn()
}));

jest.mock('../services/crm/crmSyncService', () => ({
  syncCrmContactOnce: jest.fn()
}));

const mockSendWhatsapp = sendWhatsappOnce as jest.Mock;
const mockSyncCrm = syncCrmContactOnce as jest.Mock;

describe('followupService', () => {
  const OLD_ENV = process.env;

  const lead: any = {
    id: 'lead-1',
    source: 'web',
    name: 'Acme Logistics',
    phone: '+911234567890',
    email: 'ops@acme.example',
    status: 'NEW'
  };
  const call: any = { id: 'call-1', lead_id: 'lead-1', vapi_call_id: 'vapi-1', status: 'ended' };
  const meaningfulState: any = {
    id: 's-1',
    call_id: 'call-1',
    lead_id: 'lead-1',
    pickup_location: 'Chennai',
    destination: 'Bengaluru',
    booking_intent: 'explicit'
  };
  const emptyState: any = { id: 's-1', call_id: 'call-1', lead_id: 'lead-1' };
  const hot: any = { id: 'q-1', call_id: 'call-1', lead_id: 'lead-1', score: 85, tier: 'HOT' };
  const warm: any = { id: 'q-1', call_id: 'call-1', lead_id: 'lead-1', score: 55, tier: 'WARM' };
  const cold: any = { id: 'q-1', call_id: 'call-1', lead_id: 'lead-1', score: 10, tier: 'COLD' };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...OLD_ENV,
      FOLLOWUP_ENABLED: 'true',
      FOLLOWUP_HOT_DELAY_MIN: '30',
      FOLLOWUP_WARM_DELAY_MIN: '240',
      FOLLOWUP_CRM_DELAY_MIN: '60',
      FOLLOWUP_MAX_ATTEMPTS: '5',
      FOLLOWUP_MAX_RETRIES: '0',
      FOLLOWUP_RETRY_BASE_DELAY_MS: '10',
      FOLLOWUP_EXECUTE_LIMIT: '25',
      FOLLOWUP_PROCESSING_TIMEOUT_MS: '300000',
      CRM_API_KEY: 'test-crm-key'
    };
    mockSendWhatsapp.mockResolvedValue({ ok: true });
    mockSyncCrm.mockResolvedValue({ ok: true });
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  /** Route pool queries by SQL content to domain fixtures. */
  const routeReads = (opts: { state?: any; qualification?: any; lead?: any } = {}) => {
    const q = pool.query as jest.Mock;
    q.mockImplementation((sql: string, params?: any[]) => {
      const s = String(sql);
      if (/FROM calls/.test(s)) return Promise.resolve({ rows: [call] });
      if (/FROM conversation_state/.test(s)) {
        return Promise.resolve({ rows: [opts.state !== undefined ? opts.state : meaningfulState] });
      }
      if (/FROM qualifications/.test(s)) {
        return Promise.resolve({ rows: [opts.qualification !== undefined ? opts.qualification : hot] });
      }
      if (/FROM leads/.test(s)) {
        return Promise.resolve({ rows: [opts.lead !== undefined ? opts.lead : lead] });
      }
      if (/FROM follow_ups WHERE followup_key/.test(s)) return Promise.resolve({ rows: [] });
      if (/FROM follow_ups WHERE id/.test(s)) return Promise.resolve({ rows: [] });
      if (/INSERT INTO follow_ups/.test(s)) {
        return Promise.resolve({
          rows: [{ id: 'f-1', followup_key: params?.[0], status: 'pending', attempts: 1, action: params?.[4] }]
        });
      }
      return Promise.resolve({ rows: [] });
    });
  };

  it('should schedule an idempotent follow-up row for an explicit request', async () => {
    routeReads();
    const outcome = await scheduleFollowup({ callId: 'call-1', action: 'crm_followup' });
    expect(outcome.ok).toBe(true);
    expect(outcome.created).toBe(true);
    const insert = (pool.query as jest.Mock).mock.calls.find((c) => /INSERT INTO follow_ups/.test(String(c[0])));
    expect(insert?.[1]?.[0]).toBe('fu:crm_followup:call-1');
    const statements = (pool.query as jest.Mock).mock.calls.map((c) => String(c[0]));
    expect(statements.some((s) => /UPDATE\s+qualifications/i.test(s))).toBe(false);
    expect(statements.some((s) => /UPDATE\s+leads/i.test(s))).toBe(false);
  });

  it('should return duplicates without modification for terminal rows', async () => {
    const terminal: any = { id: 'f-9', followup_key: 'fu:crm_followup:call-1', status: 'completed', attempts: 2 };
    (pool.query as jest.Mock).mockImplementation((sql: string) => {
      const s = String(sql);
      if (/FROM calls/.test(s)) return Promise.resolve({ rows: [call] });
      if (/FROM conversation_state/.test(s)) return Promise.resolve({ rows: [meaningfulState] });
      if (/FROM qualifications/.test(s)) return Promise.resolve({ rows: [hot] });
      if (/FROM leads/.test(s)) return Promise.resolve({ rows: [lead] });
      if (/FROM follow_ups WHERE followup_key/.test(s)) return Promise.resolve({ rows: [terminal] });
      return Promise.resolve({ rows: [] });
    });
    const outcome = await scheduleFollowup({ callId: 'call-1', action: 'crm_followup' });
    expect(outcome).toMatchObject({ ok: true, duplicate: true });
    expect((pool.query as jest.Mock).mock.calls.some((c) => /INSERT INTO follow_ups/.test(String(c[0])))).toBe(false);
  });

  it('should suppress COLD tiers without persistence', async () => {
    routeReads({ qualification: cold });
    const outcome = await scheduleFollowup({ callId: 'call-1', action: 'whatsapp_followup', template: 'call_summary_hot' });
    expect(outcome).toEqual({ ok: false, skipped: 'tier' });
    expect(mockSendWhatsapp).not.toHaveBeenCalled();
    expect(mockSyncCrm).not.toHaveBeenCalled();
  });

  it('should fan out HOT and WARM plans with corrected independent delays', async () => {
    routeReads({ qualification: hot });
    const hotOutcomes = await scheduleFollowupsForEvent({ callId: 'call-1', now: new Date('2026-09-11T10:00:00.000Z') });
    expect(hotOutcomes).toHaveLength(2);
    expect(hotOutcomes.every((o) => o.ok)).toBe(true);
    const hotInserts = (pool.query as jest.Mock).mock.calls.filter((c) =>
      /INSERT INTO follow_ups/.test(String(c[0]))
    );
    // whatsapp at +30min, CRM at +60min
    expect(hotInserts[0][1][6]).toBe('2026-09-11T10:30:00.000Z');
    expect(hotInserts[1][1][6]).toBe('2026-09-11T11:00:00.000Z');
    expect(hotInserts[0][1][4]).toBe('whatsapp_followup');
    expect(hotInserts[1][1][4]).toBe('crm_followup');
    expect(JSON.parse(hotInserts[0][1][5]).template).toBe('call_summary_hot');

    jest.clearAllMocks();
    routeReads({ qualification: warm });
    const warmOutcomes = await scheduleFollowupsForEvent({ callId: 'call-1', now: new Date('2026-09-11T10:00:00.000Z') });
    expect(warmOutcomes).toHaveLength(2);
    const warmInserts = (pool.query as jest.Mock).mock.calls.filter((c) =>
      /INSERT INTO follow_ups/.test(String(c[0]))
    );
    // WARM WhatsApp at +240min, CRM still at +60min (independently configurable)
    expect(warmInserts[0][1][6]).toBe('2026-09-11T14:00:00.000Z');
    expect(warmInserts[1][1][6]).toBe('2026-09-11T11:00:00.000Z');
    expect(warmInserts[0][1][4]).toBe('whatsapp_followup');
    expect(warmInserts[1][1][4]).toBe('crm_followup');
    expect(JSON.parse(warmInserts[0][1][5]).template).toBe('call_summary_warm');

    jest.clearAllMocks();
    routeReads({ qualification: cold });
    const coldOutcomes = await scheduleFollowupsForEvent({ callId: 'call-1' });
    expect(coldOutcomes).toEqual([{ ok: false, skipped: 'tier' }]);
  });

  it('should complete WhatsApp follow-ups on consent denial without bypassing consent', async () => {
    mockSendWhatsapp.mockResolvedValue({ ok: false, skipped: 'no_consent' });
    const row: any = {
      id: 'f-2',
      followup_key: 'fu:whatsapp_followup:call-1',
      lead_id: 'lead-1',
      call_id: 'call-1',
      qualification_id: 'q-1',
      action: 'whatsapp_followup',
      payload: { template: 'call_summary_hot' },
      status: 'pending',
      attempts: 0
    };
    (pool.query as jest.Mock).mockImplementation((sql: string) => {
      const s = String(sql);
      if (/FROM follow_ups WHERE id/.test(s)) return Promise.resolve({ rows: [row] });
      if (/status = 'processing'/.test(s)) return Promise.resolve({ rows: [{ ...row, status: 'processing', attempts: 1 }] });
      if (/status = 'completed'/.test(s)) return Promise.resolve({ rows: [{ ...row, status: 'completed' }] });
      return Promise.resolve({ rows: [] });
    });
    const outcome = await executeFollowupOnce('f-2');
    expect(outcome.ok).toBe(true);
    expect(outcome.completed).toBe(true);
    expect(mockSendWhatsapp).toHaveBeenCalledWith(
      expect.objectContaining({ template: 'call_summary_hot', callId: 'call-1' })
    );
  });

  it('should contain transport failures with sanitized errors and backoff', async () => {
    mockSyncCrm.mockResolvedValue({ ok: false });
    const row: any = {
      id: 'f-3',
      followup_key: 'fu:crm_followup:call-1',
      lead_id: 'lead-1',
      call_id: 'call-1',
      qualification_id: 'q-1',
      action: 'crm_followup',
      payload: {},
      status: 'pending',
      attempts: 0
    };
    (pool.query as jest.Mock).mockImplementation((sql: string) => {
      const s = String(sql);
      if (/FROM follow_ups WHERE id/.test(s)) return Promise.resolve({ rows: [row] });
      if (/status = 'processing'/.test(s)) return Promise.resolve({ rows: [{ ...row, status: 'processing', attempts: 1 }] });
      if (/status = 'failed'/.test(s)) return Promise.resolve({ rows: [{ ...row, status: 'failed' }] });
      return Promise.resolve({ rows: [] });
    });
    const outcome = await executeFollowupOnce('f-3');
    expect(outcome.ok).toBe(false);
    const failedCall = (pool.query as jest.Mock).mock.calls.find((c) =>
      /status = 'failed'/.test(String(c[0]))
    );
    expect(failedCall).toBeDefined();
    // scheduled_at pushed forward (retry-at param present)
    expect(failedCall[1]).toHaveLength(3);
  });

  it('should execute due rows, cancel terminals, retry failures, and skip when disabled', async () => {
    const due: any = {
      id: 'f-4',
      followup_key: 'fu:crm_followup:call-1',
      lead_id: 'lead-1',
      call_id: 'call-1',
      qualification_id: 'q-1',
      action: 'crm_followup',
      payload: {},
      status: 'pending',
      attempts: 0
    };
    (pool.query as jest.Mock).mockImplementation((sql: string) => {
      const s = String(sql);
      if (/status = 'pending', updated_at/.test(s)) return Promise.resolve({ rows: [] }); // recover
      if (/scheduled_at <=/.test(s)) return Promise.resolve({ rows: [due] });
      if (/FROM follow_ups WHERE id/.test(s)) return Promise.resolve({ rows: [due] });
      if (/status = 'processing'/.test(s)) return Promise.resolve({ rows: [{ ...due, status: 'processing', attempts: 1 }] });
      if (/status = 'completed'/.test(s)) return Promise.resolve({ rows: [{ ...due, status: 'completed' }] });
      return Promise.resolve({ rows: [] });
    });
    const dueOutcome = await executeDueFollowUps({ limit: 10 });
    expect(dueOutcome).toMatchObject({ ok: true, checked: 1, completed: 1, failed: 0 });
    expect(mockSyncCrm).toHaveBeenCalled();

    (pool.query as jest.Mock).mockImplementation((sql: string) => {
      if (/FROM follow_ups WHERE id/.test(String(sql))) {
        return Promise.resolve({ rows: [{ ...due, status: 'completed' }] });
      }
      return Promise.resolve({ rows: [] });
    });
    const alreadyTerminal = await executeFollowupOnce('f-4');
    expect(alreadyTerminal.skipped).toBe('already_terminal');

    (pool.query as jest.Mock).mockImplementation((sql: string) => {
      const s = String(sql);
      if (/FROM follow_ups WHERE id/.test(s)) {
        return Promise.resolve({ rows: [{ ...due, status: 'failed', attempts: 5 }] });
      }
      return Promise.resolve({ rows: [] });
    });
    const maxed = await executeFollowupOnce('f-4');
    expect(maxed.skipped).toBe('max_attempts');

    (pool.query as jest.Mock).mockResolvedValue({ rows: [{ ...due, status: 'pending' }] });
    const cancelled = await cancelFollowup('f-4');
    expect(cancelled.ok).toBe(true);

    (pool.query as jest.Mock).mockImplementation((sql: string) => {
      const s = String(sql);
      if (/FROM follow_ups WHERE id/.test(s)) {
        return Promise.resolve({ rows: [{ ...due, status: 'failed', attempts: 1 }] });
      }
      if (/status = 'pending', scheduled_at/.test(s)) {
        return Promise.resolve({ rows: [{ ...due, status: 'pending' }] });
      }
      return Promise.resolve({ rows: [] });
    });
    const retried = await retryFollowup('f-4');
    expect(retried.ok).toBe(true);

    process.env.FOLLOWUP_ENABLED = 'false';
    expect(await scheduleFollowup({ callId: 'call-1', action: 'crm_followup' })).toEqual({
      ok: false,
      skipped: 'disabled'
    });
    expect(await executeDueFollowUps()).toMatchObject({ ok: false, skipped: 'disabled' });

    const redacted = sanitizeFollowupErrorMessage(new Error('crm down api_key=test-crm-key token=abc'));
    expect(redacted).not.toContain('test-crm-key');
  });
});
