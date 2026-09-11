/**
 * Phase 9 – CRM sync service tests (DB pool mocked, provider injected).
 *
 * Verifies: success path, failure isolation (never throws / never breaks
 * call completion or qualification), idempotent no-change skipping,
 * disabled-mode skip, and credential redaction.
 */
import { pool } from '../database';
import {
  setCrmProviderForTests,
  resetCrmProviderForTests,
  hashCrmPayload
} from '../services/crm/crmProvider';
import { toCrmContactPayload } from '../services/crm/crmMapper';
import { syncCrmContactOnce, sanitizeCrmErrorMessage } from '../services/crm/crmSyncService';
import { MockCrmProvider } from '../services/crm/mockCrmProvider';

jest.mock('../database', () => {
  const mPool = { query: jest.fn() };
  return { pool: mPool, default: mPool };
});

describe('crmSyncService', () => {
  const OLD_ENV = process.env;
  let mockProvider: MockCrmProvider;

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
    lead_id: 'lead-1',
    vapi_call_id: 'vapi-1',
    status: 'ended',
    started_at: '2026-09-11T10:00:00.000Z',
    ended_at: '2026-09-11T10:05:00.000Z',
    duration_seconds: 300
  };
  const state: any = {
    id: 'state-1',
    call_id: 'call-1',
    lead_id: 'lead-1',
    pickup_location: 'Chennai',
    destination: 'Bengaluru',
    budget: 15000,
    booking_intent: 'explicit'
  };
  const qualification: any = {
    id: 'qual-1',
    call_id: 'call-1',
    lead_id: 'lead-1',
    score: 60,
    tier: 'WARM',
    details: { totalScore: 60 },
    qualified_at: '2026-09-11T10:06:00.000Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...OLD_ENV,
      CRM_SYNC_ENABLED: 'true',
      CRM_PROVIDER: 'mock',
      CRM_BASE_URL: 'https://crm.example.test',
      CRM_API_KEY: 'super-secret-key'
    };
    mockProvider = new MockCrmProvider();
    setCrmProviderForTests(mockProvider);
  });

  afterEach(() => {
    resetCrmProviderForTests();
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  const mockSuccessReads = () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [call] }) // findCallById
      .mockResolvedValueOnce({ rows: [state] }) // getStateByCallId
      .mockResolvedValueOnce({ rows: [qualification] }) // findQualificationByCallId
      .mockResolvedValueOnce({ rows: [lead] }); // LeadService.getLead
  };

  it('should sync successfully and persist a success row without touching leads.status', async () => {
    mockSuccessReads();
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [] }) // findSyncByIdempotencyKey -> none
      .mockResolvedValueOnce({ rows: [{ id: 'sync-1', attempts: 1, crm_contact_id: null }] }) // upsert attempt
      .mockResolvedValueOnce({ rows: [{ id: 'sync-1', status: 'success' }] }); // mark success

    const outcome = await syncCrmContactOnce({ callId: 'call-1' });
    expect(outcome.ok).toBe(true);
    expect(mockProvider.calls).toHaveLength(1);
    expect(mockProvider.calls[0].opts.idempotencyKey).toBe('crm:mock:call-1');
    expect(mockProvider.calls[0].payload.qualification_tier).toBe('WARM');
    // No UPDATE leads statement may be issued by the sync path.
    const statements = (pool.query as jest.Mock).mock.calls.map((c) => String(c[0]));
    expect(statements.some((s) => /UPDATE\s+leads/i.test(s))).toBe(false);
  });

  it('should contain provider failures: record failed row and resolve (never throw)', async () => {
    mockProvider.enqueue({ error: Object.assign(new Error('boom'), { retryable: false }) });
    mockSuccessReads();
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [] }) // findSyncByIdempotencyKey -> none
      .mockResolvedValueOnce({ rows: [{ id: 'sync-2', attempts: 1, crm_contact_id: null }] }) // upsert attempt
      // provider throws -> catch path re-upserts then marks failed:
      .mockResolvedValueOnce({ rows: [{ id: 'sync-2', attempts: 2, crm_contact_id: null }] }) // upsert attempt (error path)
      .mockResolvedValueOnce({ rows: [{ id: 'sync-2', status: 'failed' }] }); // mark failed

    const outcome = await syncCrmContactOnce({ callId: 'call-1' });
    expect(outcome.ok).toBe(false);
    // Resolved, not rejected: call completion / qualification callers are unaffected.
    await expect(Promise.resolve(outcome)).resolves.toBeDefined();
    // Failed row persisted with the sanitized provider error.
    const failedCall = (pool.query as jest.Mock).mock.calls.find((c) =>
      /status = 'failed'/i.test(String(c[0]))
    );
    expect(failedCall).toBeDefined();
    expect(failedCall[1]).toEqual(expect.arrayContaining(['boom']));
  });

  it('should skip the provider call when the payload hash is unchanged', async () => {
    const payload = toCrmContactPayload({ lead, call, state, qualification });
    const payloadHash = hashCrmPayload(payload);
    mockSuccessReads();
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [{ idempotency_key: 'crm:mock:call-1', status: 'success', payload_hash: payloadHash, crm_contact_id: 'crm-9' }]
      }) // previous success, same hash
      .mockResolvedValueOnce({ rows: [{ id: 'sync-3', attempts: 2, crm_contact_id: 'crm-9' }] }) // upsert attempt
      .mockResolvedValueOnce({ rows: [{ id: 'sync-3', status: 'skipped_no_changes' }] }); // mark skipped

    const outcome = await syncCrmContactOnce({ callId: 'call-1' });
    expect(outcome.ok).toBe(true);
    expect(outcome.skipped).toBe('no_changes');
    expect(mockProvider.calls).toHaveLength(0);
  });

  it('should skip silently when CRM sync is disabled', async () => {
    process.env.CRM_SYNC_ENABLED = 'false';
    const outcome = await syncCrmContactOnce({ callId: 'call-1' });
    expect(outcome).toEqual({ ok: false, skipped: 'disabled' });
    expect(mockProvider.calls).toHaveLength(0);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('should redact credentials from sanitized error messages', () => {
    const message = sanitizeCrmErrorMessage(
      new Error('CRM request failed with api_key=super-secret-key and Bearer abc123')
    );
    expect(message).not.toContain('super-secret-key');
    expect(message).not.toContain('abc123');
  });
});
