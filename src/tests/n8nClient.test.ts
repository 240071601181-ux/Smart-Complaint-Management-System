/**
 * Phase 10 – n8n HTTP client tests (axios mocked; no network).
 */
import axios from 'axios';
import { createHmac } from 'crypto';
import { HttpN8nClient, signN8nBody } from '../services/n8n/n8nClient';
import { canonicalN8nBody } from '../services/n8n/n8nPayloadBuilder';
import { N8nEnvelope } from '../services/n8n/n8nEventTypes';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HttpN8nClient', () => {
  const OLD_ENV = process.env;
  const envelope: N8nEnvelope = {
    event: 'lead.created',
    event_id: 'n8n:lead.created:lead-1',
    occurred_at: '2026-09-11T10:00:00.000Z',
    data: { lead: { id: 'lead-1', name: 'Acme' } }
  };
  const opts = { workflow: 'default', url: 'https://n8n.example.test/webhook/x', timeoutMs: 1000 };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...OLD_ENV,
      N8N_ENABLED: 'true',
      N8N_WEBHOOK_SECRET: 'test-secret',
      N8N_ALLOW_HTTP_LOCAL: 'false'
    };
    delete process.env.N8N_API_KEY;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('should sign deliveries with HMAC-SHA256 and send routing headers', async () => {
    (mockedAxios.request as jest.Mock).mockResolvedValueOnce({ status: 200, data: {} });
    const result = await new HttpN8nClient().deliver(envelope, opts);
    expect(result).toEqual({ httpStatus: 200 });
    const headers = (mockedAxios.request as jest.Mock).mock.calls[0][0].headers;
    const expected = createHmac('sha256', 'test-secret')
      .update(canonicalN8nBody(envelope), 'utf8')
      .digest('hex');
    expect(headers['X-N8n-Signature']).toBe(expected);
    expect(headers['X-N8n-Event']).toBe('lead.created');
    expect(headers['X-N8n-Event-Id']).toBe('n8n:lead.created:lead-1');
    expect(signN8nBody(canonicalN8nBody(envelope), 'test-secret')).toBe(expected);
  });

  it('should reject non-HTTPS workflow URLs unless local override is set', async () => {
    const err: any = await new HttpN8nClient()
      .deliver(envelope, { ...opts, url: 'http://localhost:5678/webhook/x' })
      .catch((e) => e);
    expect(err.retryable).toBe(false);
    expect(mockedAxios.request).not.toHaveBeenCalled();
  });

  it('should mark 5xx responses retryable with a sanitized message', async () => {
    (mockedAxios.request as jest.Mock).mockRejectedValueOnce({
      response: { status: 502 },
      message: 'Request failed (secret test-secret)'
    });
    const err: any = await new HttpN8nClient().deliver(envelope, opts).catch((e) => e);
    expect(err.retryable).toBe(true);
    expect(err.status).toBe(502);
    expect(String(err.message)).not.toContain('test-secret');
  });

  it('should mark 4xx responses as non-retryable', async () => {
    (mockedAxios.request as jest.Mock).mockRejectedValueOnce({
      response: { status: 400 },
      message: 'Request failed with status code 400'
    });
    const err: any = await new HttpN8nClient().deliver(envelope, opts).catch((e) => e);
    expect(err.retryable).toBe(false);
    expect(err.status).toBe(400);
  });

  it('should fail fast when the webhook secret is not configured', async () => {
    delete process.env.N8N_WEBHOOK_SECRET;
    const err: any = await new HttpN8nClient().deliver(envelope, opts).catch((e) => e);
    expect(err.retryable).toBe(false);
    expect(mockedAxios.request).not.toHaveBeenCalled();
  });
});
