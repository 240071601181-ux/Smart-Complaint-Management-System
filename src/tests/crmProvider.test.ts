/**
 * Phase 9 – HTTP CRM provider tests (axios mocked; no network).
 */
import axios from 'axios';
import { HttpCrmProvider } from '../services/crm/httpCrmProvider';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HttpCrmProvider', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...OLD_ENV,
      CRM_SYNC_ENABLED: 'true',
      CRM_PROVIDER: 'http',
      CRM_BASE_URL: 'https://crm.example.test',
      CRM_API_KEY: 'test-key'
    };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('should POST to the upsert path for creates with auth + idempotency headers', async () => {
    (mockedAxios.request as jest.Mock).mockResolvedValueOnce({ status: 201, data: { id: 'crm-123' } });
    const provider = new HttpCrmProvider();
    const result = await provider.upsertContact(
      { external_lead_id: 'lead-1', name: 'Acme' },
      { idempotencyKey: 'crm:http:call-1', timeoutMs: 1000 }
    );
    expect(result).toEqual({ crmContactId: 'crm-123', created: true });
    expect(mockedAxios.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'post',
        url: 'https://crm.example.test/contacts/upsert',
        timeout: 1000
      })
    );
    const headers = (mockedAxios.request as jest.Mock).mock.calls[0][0].headers;
    expect(headers['Idempotency-Key']).toBe('crm:http:call-1');
    expect(headers.Authorization).toBe('Bearer test-key');
  });

  it('should PATCH the update path when a CRM contact id is known', async () => {
    (mockedAxios.request as jest.Mock).mockResolvedValueOnce({ status: 200, data: { id: 'crm-123' } });
    const provider = new HttpCrmProvider();
    const result = await provider.upsertContact(
      { external_call_id: 'call-1' },
      { idempotencyKey: 'crm:http:call-1', timeoutMs: 1000, crmContactId: 'crm-123' }
    );
    expect(result.created).toBe(false);
    expect(mockedAxios.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'patch',
        url: 'https://crm.example.test/contacts/crm-123'
      })
    );
  });

  it('should mark 5xx responses retryable with a sanitized message (no key leaked)', async () => {
    (mockedAxios.request as jest.Mock).mockRejectedValueOnce({
      response: { status: 503 },
      message: 'Request failed with status code 503 (key test-key)'
    });
    const provider = new HttpCrmProvider();
    const err: any = await provider
      .upsertContact({ external_lead_id: 'lead-1' }, { idempotencyKey: 'k', timeoutMs: 1000 })
      .catch((e) => e);
    expect(err.retryable).toBe(true);
    expect(err.status).toBe(503);
    expect(String(err.message)).not.toContain('test-key');
  });

  it('should mark 4xx responses as non-retryable', async () => {
    (mockedAxios.request as jest.Mock).mockRejectedValueOnce({
      response: { status: 400 },
      message: 'Request failed with status code 400'
    });
    const provider = new HttpCrmProvider();
    const err: any = await provider
      .upsertContact({ external_lead_id: 'lead-1' }, { idempotencyKey: 'k', timeoutMs: 1000 })
      .catch((e) => e);
    expect(err.retryable).toBe(false);
    expect(err.status).toBe(400);
  });

  it('should fail fast when CRM credentials are not configured', async () => {
    delete process.env.CRM_API_KEY;
    const provider = new HttpCrmProvider();
    const err: any = await provider
      .upsertContact({ external_lead_id: 'lead-1' }, { idempotencyKey: 'k', timeoutMs: 1000 })
      .catch((e) => e);
    expect(err.retryable).toBe(false);
    expect(String(err.message)).not.toContain('test-key');
  });
});
