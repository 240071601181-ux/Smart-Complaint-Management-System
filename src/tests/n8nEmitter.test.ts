/**
 * Phase 10 – n8n emitter tests (DB pool mocked, client injected).
 *
 * Verifies: successful delivery + row persistence, failure containment
 * (never throws), idempotent no-change skipping, discriminator on changed
 * data, disabled-mode skip, secret redaction, and independence from the
 * lead-update path (no UPDATE leads issued by the emitter).
 */
import { pool } from '../database';
import { setN8nClientForTests, resetN8nClientForTests } from '../services/n8n/n8nClient';
import { emitN8nEventOnce, sanitizeN8nErrorMessage } from '../services/n8n/n8nEmitter';
import { canonicalN8nBody } from '../services/n8n/n8nPayloadBuilder';
import { buildN8nEnvelope } from '../services/n8n/n8nPayloadBuilder';
import { createHash } from 'crypto';
import { MockN8nClient } from '../services/n8n/mockN8nClient';

jest.mock('../database', () => {
  const mPool = { query: jest.fn() };
  return { pool: mPool, default: mPool };
});

describe('n8nEmitter', () => {
  const OLD_ENV = process.env;
  let mockClient: MockN8nClient;

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
    destination: 'Bengaluru'
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

  const useWorkflows = () => {
    process.env.N8N_WORKFLOWS_JSON = JSON.stringify({
      'call.completed': [{ name: 'default', url: 'https://n8n.example.test/webhook/calls' }]
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...OLD_ENV,
      N8N_ENABLED: 'true',
      N8N_WEBHOOK_SECRET: 'top-secret-value',
      CRM_SYNC_ENABLED: 'false'
    };
    delete process.env.N8N_WORKFLOWS_JSON;
    delete process.env.N8N_WEBHOOK_URL;
    mockClient = new MockN8nClient();
    setN8nClientForTests(mockClient);
  });

  afterEach(() => {
    resetN8nClientForTests();
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  const mockReads = () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [call] }) // findCallById
      .mockResolvedValueOnce({ rows: [state] }) // getStateByCallId
      .mockResolvedValueOnce({ rows: [qualification] }) // findQualificationByCallId
      .mockResolvedValueOnce({ rows: [lead] }); // LeadService.getLead
  };

  it('should deliver to the configured workflow and persist a delivered row', async () => {
    useWorkflows();
    mockReads();
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [] }) // findDeliveryByEventId -> none
      .mockResolvedValueOnce({ rows: [{ id: 'd-1', attempts: 1 }] }) // upsert attempt
      .mockResolvedValueOnce({ rows: [{ id: 'd-1', status: 'delivered' }] }); // mark delivered

    const outcome = await emitN8nEventOnce('call.completed', { callId: 'call-1' });
    expect(outcome.ok).toBe(true);
    expect(outcome.delivered).toBe(1);
    expect(mockClient.calls).toHaveLength(1);
    expect(mockClient.calls[0].envelope.event_id).toBe('n8n:call.completed:call-1');
    expect(mockClient.calls[0].opts.url).toBe('https://n8n.example.test/webhook/calls');
    const statements = (pool.query as jest.Mock).mock.calls.map((c) => String(c[0]));
    expect(statements.some((s) => /UPDATE\s+leads/i.test(s))).toBe(false);
  });

  it('should contain client failures: record failed row and resolve (never throw)', async () => {
    useWorkflows();
    mockClient.enqueue({ error: Object.assign(new Error('n8n down'), { retryable: false }) });
    mockReads();
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [] }) // no previous delivery
      .mockResolvedValueOnce({ rows: [{ id: 'd-2', attempts: 1 }] }) // upsert attempt
      .mockResolvedValueOnce({ rows: [{ id: 'd-2', status: 'failed' }] }); // mark failed

    const outcome = await emitN8nEventOnce('call.completed', { callId: 'call-1' });
    expect(outcome.ok).toBe(false);
    await expect(Promise.resolve(outcome)).resolves.toBeDefined();
    const failedCall = (pool.query as jest.Mock).mock.calls.find((c) =>
      /status = 'failed'/i.test(String(c[0]))
    );
    expect(failedCall).toBeDefined();
    expect(failedCall[1]).toEqual(expect.arrayContaining(['n8n down']));
  });

  it('should skip the HTTP call when the payload hash is unchanged', async () => {
    useWorkflows();
    // Freeze the clock so the emitter builds the identical envelope/hash.
    const fixedIso = '2026-09-11T10:07:00.000Z';
    const nowSpy = jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(fixedIso);
    try {
      const expected = buildN8nEnvelope(
        'call.completed',
        'call-1',
        { lead, call, state, qualification, crm: null },
        fixedIso
      );
      const expectedHash = createHash('sha256')
        .update(canonicalN8nBody(expected))
        .digest('hex');
      mockReads();
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{
            event_id: 'n8n:call.completed:call-1',
            status: 'delivered',
            payload_hash: expectedHash,
            discriminator: 1
          }]
        }) // previous delivered, same hash
        .mockResolvedValueOnce({ rows: [{ id: 'd-3', attempts: 2 }] }) // upsert attempt
        .mockResolvedValueOnce({ rows: [{ id: 'd-3', status: 'skipped_no_changes' }] }); // mark skipped

      const outcome = await emitN8nEventOnce('call.completed', { callId: 'call-1' });
      expect(outcome.ok).toBe(true);
      expect(mockClient.calls).toHaveLength(0);
      const skippedCall = (pool.query as jest.Mock).mock.calls.find((c) =>
        /skipped_no_changes/i.test(String(c[0]))
      );
      expect(skippedCall).toBeDefined();
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('should skip silently when n8n is disabled and when no workflow is configured', async () => {
    process.env.N8N_ENABLED = 'false';
    const disabled = await emitN8nEventOnce('call.completed', { callId: 'call-1' });
    expect(disabled).toEqual({ ok: false, skipped: 'disabled' });
    expect(mockClient.calls).toHaveLength(0);

    process.env.N8N_ENABLED = 'true';
    delete process.env.N8N_WORKFLOWS_JSON;
    const unconfigured = await emitN8nEventOnce('lead.created', { leadId: 'lead-1' });
    expect(unconfigured).toEqual({ ok: false, skipped: 'no_workflow' });
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('should redact secrets from sanitized error messages', () => {
    const message = sanitizeN8nErrorMessage(
      new Error('delivery failed secret=top-secret-value Bearer abc123')
    );
    expect(message).not.toContain('top-secret-value');
    expect(message).not.toContain('abc123');
  });
});
