/**
 * Phase 10 – n8n HTTP client boundary.
 *
 * The single replaceable egress point for n8n workflow delivery.
 * Signs every delivery with HMAC-SHA256 (N8N_WEBHOOK_SECRET) so n8n can
 * authenticate the backend. Per-delivery timeout; sanitized retryable-flag
 * errors consumed by the bounded retry helper.
 *
 * Safety: secrets never leave the Authorization/signature headers, never
 * appear in messages, logs, or persisted rows.
 */
import axios from 'axios';
import { createHmac } from 'crypto';
import { getN8nConfig } from '../../config';
import { canonicalN8nBody } from './n8nPayloadBuilder';
import { N8nEnvelope } from './n8nEventTypes';

export interface N8nDeliveryOptions {
  workflow: string;
  url: string;
  timeoutMs: number;
}

export interface N8nDeliveryResult {
  httpStatus: number;
}

export interface N8nClient {
  readonly name: string;
  deliver(envelope: N8nEnvelope, opts: N8nDeliveryOptions): Promise<N8nDeliveryResult>;
}

export const signN8nBody = (canonicalBody: string, secret: string): string =>
  createHmac('sha256', secret).update(canonicalBody, 'utf8').digest('hex');

export class HttpN8nClient implements N8nClient {
  readonly name = 'http';

  async deliver(envelope: N8nEnvelope, opts: N8nDeliveryOptions): Promise<N8nDeliveryResult> {
    const cfg = getN8nConfig();
    if (!cfg.webhookSecret) {
      const err: any = new Error('N8N_WEBHOOK_SECRET is not configured');
      err.retryable = false;
      throw err;
    }
    if (!opts.url) {
      const err: any = new Error('n8n workflow URL is not configured');
      err.retryable = false;
      throw err;
    }
    if (!/^https:\/\//i.test(opts.url) && !cfg.allowHttpLocal) {
      const err: any = new Error('n8n workflow URL must use HTTPS');
      err.retryable = false;
      throw err;
    }

    const canonicalBody = canonicalN8nBody(envelope);
    const signature = signN8nBody(canonicalBody, cfg.webhookSecret);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-N8n-Signature': signature,
      'X-N8n-Event': envelope.event,
      'X-N8n-Event-Id': envelope.event_id
    };
    if (cfg.apiKey) {
      headers.Authorization = `Bearer ${cfg.apiKey}`;
    }

    try {
      const response = await axios.request({
        method: 'post',
        url: opts.url,
        data: JSON.parse(canonicalBody),
        timeout: opts.timeoutMs,
        headers
      });
      return { httpStatus: response?.status ?? 200 };
    } catch (err: any) {
      const status = err?.response?.status;
      const code = err?.code;
      const timedOut = code === 'ECONNABORTED' || /timeout/i.test(err?.message || '');
      const retryable =
        timedOut ||
        code === 'ECONNREFUSED' ||
        code === 'ECONNRESET' ||
        code === 'ENOTFOUND' ||
        code === 'EAI_AGAIN' ||
        status === 429 ||
        (typeof status === 'number' && status >= 500 && status < 600);
      const safe: any = new Error(
        status ? `n8n delivery failed (status ${status})` : 'n8n delivery failed (network error)'
      );
      safe.retryable = retryable;
      safe.status = status;
      if (timedOut) safe.timeout = true;
      if (code) safe.code = code;
      throw safe;
    }
  }
}

let testOverride: N8nClient | null = null;

/** Test-only hook: inject a fake client without touching env. */
export const setN8nClientForTests = (client: N8nClient | null): void => {
  testOverride = client;
};

export const resetN8nClientForTests = (): void => {
  testOverride = null;
};

export const getN8nClient = (): N8nClient => {
  if (testOverride) return testOverride;
  return new HttpN8nClient();
};
