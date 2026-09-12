/**
 * Lead creation status default (PG 23502 regression cover).
 *
 * Contract: POST /api/v1/leads treats `status` as optional.
 * The leads table requires status NOT NULL with DB DEFAULT 'NEW'
 * (migration 001_create_leads_table.sql). The backend must default
 * missing/empty status to 'NEW' instead of inserting NULL, while
 * preserving explicit status values.
 */
import request from 'supertest';
import app from '../app';
import { pool } from '../database';

jest.mock('../database', () => {
  const mPool = { query: jest.fn() };
  return { pool: mPool, default: mPool };
});

jest.mock('../services/n8n/n8nEmitter', () => ({
  enqueueN8nEvent: jest.fn(),
}));

jest.mock('../services/whatsapp/whatsappSender', () => ({
  enqueueWhatsappMessage: jest.fn(),
}));

describe('POST /api/v1/leads status handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a lead without status, defaulting to NEW', async () => {
    const created: any = {
      id: 'lead-1',
      source: 'web',
      name: 'Arjun Rao',
      phone: '+919876522109',
      email: null,
      status: 'NEW',
    };
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [created] });

    const res = await request(app).post('/api/v1/leads').send({
      source: 'web',
      name: 'Arjun Rao',
      phone: '+919876522109',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('NEW');
    // Repository must never bind NULL for the NOT NULL status column.
    expect(pool.query).toHaveBeenCalledTimes(1);
    const params = (pool.query as jest.Mock).mock.calls[0][1];
    expect(params[4]).toBe('NEW');
  });

  it('creates a lead with an explicit status, preserving it', async () => {
    const created: any = {
      id: 'lead-2',
      source: 'web',
      name: 'Meera Shah',
      phone: '+919821080451',
      email: null,
      status: 'CONTACTED',
    };
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [created] });

    const res = await request(app).post('/api/v1/leads').send({
      source: 'web',
      name: 'Meera Shah',
      phone: '+919821080451',
      status: 'CONTACTED',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CONTACTED');
    const params = (pool.query as jest.Mock).mock.calls[0][1];
    expect(params[4]).toBe('CONTACTED');
  });
});
