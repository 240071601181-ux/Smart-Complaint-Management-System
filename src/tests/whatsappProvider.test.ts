/**
 * Phase 11 – Twilio WhatsApp provider tests (axios mocked; no network).
 */
import axios from 'axios';
import { TwilioWhatsappProvider } from '../services/whatsapp/twilioWhatsappProvider';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TwilioWhatsappProvider', () => {
  const OLD_ENV = process.env;
  const payload = {
    to: '+911234567890',
    template: 'lead_welcome' as const,
    language: 'en' as const,
    contentSid: 'HX123',
    variables: { name: 'Acme' }
  };
  const opts = { idempotencyKey: 'wa:twilio:lead_welcome:lead-1', timeoutMs: 1000 };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...OLD_ENV,
      WHATSAPP_ENABLED: 'true',
      WHATSAPP_PROVIDER: 'twilio',
      WHATSAPP_ACCOUNT_SID: 'ACtest',
      WHATSAPP_AUTH_TOKEN: 'secret-token',
      WHATSAPP_FROM_NUMBER: 'whatsapp:+10000000000'
    };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('should POST form-encoded template data with Basic auth', async () => {
    (mockedAxios.request as jest.Mock).mockResolvedValueOnce({ status: 201, data: { sid: 'SM123' } });
    const result = await new TwilioWhatsappProvider().sendTemplate(payload, opts);
    expect(result).toEqual({ providerMessageId: 'SM123' });
    const call = (mockedAxios.request as jest.Mock).mock.calls[0][0];
    expect(call.method).toBe('post');
    expect(call.url).toBe('https://api.twilio.com/2010-04-01/Accounts/ACtest/Messages.json');
    expect(call.auth).toEqual({ username: 'ACtest', password: 'secret-token' });
    expect(call.timeout).toBe(1000);
    const body = new URLSearchParams(call.data);
    expect(body.get('To')).toBe('whatsapp:+911234567890');
    expect(body.get('From')).toBe('whatsapp:+10000000000');
    expect(body.get('ContentSid')).toBe('HX123');
    expect(JSON.parse(body.get('ContentVariables') as string)).toEqual({ name: 'Acme' });
  });

  it('should treat a missing SID as retryable without leaking secrets', async () => {
    (mockedAxios.request as jest.Mock).mockResolvedValueOnce({ status: 200, data: {} });
    const err: any = await new TwilioWhatsappProvider().sendTemplate(payload, opts).catch((e) => e);
    expect(err.retryable).toBe(true);
    expect(String(err.message)).not.toContain('secret-token');
  });

  it('should mark 5xx responses retryable with a sanitized message', async () => {
    (mockedAxios.request as jest.Mock).mockRejectedValueOnce({
      response: { status: 503 },
      message: 'failed with secret-token'
    });
    const err: any = await new TwilioWhatsappProvider().sendTemplate(payload, opts).catch((e) => e);
    expect(err.retryable).toBe(true);
    expect(err.status).toBe(503);
    expect(String(err.message)).not.toContain('secret-token');
    expect(String(err.message)).not.toContain('+911234567890');
  });

  it('should mark 4xx responses as non-retryable', async () => {
    (mockedAxios.request as jest.Mock).mockRejectedValueOnce({
      response: { status: 400 },
      message: 'Request failed with status code 400'
    });
    const err: any = await new TwilioWhatsappProvider().sendTemplate(payload, opts).catch((e) => e);
    expect(err.retryable).toBe(false);
    expect(err.status).toBe(400);
  });

  it('should fail fast when credentials are not configured', async () => {
    delete process.env.WHATSAPP_AUTH_TOKEN;
    const err: any = await new TwilioWhatsappProvider().sendTemplate(payload, opts).catch((e) => e);
    expect(err.retryable).toBe(false);
    expect(mockedAxios.request).not.toHaveBeenCalled();
  });
});
