import request from 'supertest';
import app from '../app';

describe('Vapi Webhook', () => {
  const validPayload = {
    event: { type: 'call.initiated', data: { callId: '123' } }
  };

  it('should accept a valid webhook and return 200', async () => {
    const res = await request(app).post('/api/v1/webhooks/vapi').send(validPayload);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it('should handle unknown event types gracefully', async () => {
    const payload = { event: { type: 'unknown.event' } };
    const res = await request(app).post('/api/v1/webhooks/vapi').send(payload);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it('should reject malformed payload but still return 200', async () => {
    const res = await request(app).post('/api/v1/webhooks/vapi').send({ foo: 'bar' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });
});

describe('Health Check Endpoint', () => {
  it('should return 200 and status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });
});
