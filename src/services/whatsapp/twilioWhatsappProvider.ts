/**
 * Phase 11 – Twilio WhatsApp provider (first concrete implementation).
 *
 * Sends vendor-approved templates via the Twilio Messages REST API:
 * POST https://api.twilio.com/2010-04-01/Accounts/{Sid}/Messages.json
 * (form-encoded, Basic auth), using ContentSid + ContentVariables so only
 * approved template content is ever delivered.
 *
 * Safety:
 * - Per-send timeout; sanitized retryable-flag errors (no SID/token/body leaks).
 * - HTTPS only; credentials from env at call time, never logged or persisted.
 */
import axios from 'axios';
import { getWhatsappConfig } from '../../config';
import {
  WhatsappProvider,
  WhatsappSendOptions,
  WhatsappSendPayload,
  WhatsappSendResult
} from './whatsappProvider';

const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01';

export class TwilioWhatsappProvider implements WhatsappProvider {
  readonly name = 'twilio';

  async sendTemplate(
    payload: WhatsappSendPayload,
    opts: WhatsappSendOptions
  ): Promise<WhatsappSendResult> {
    const cfg = getWhatsappConfig();
    if (!cfg.accountSid) {
      const err: any = new Error('WHATSAPP_ACCOUNT_SID is not configured');
      err.retryable = false;
      throw err;
    }
    if (!cfg.authToken) {
      const err: any = new Error('WHATSAPP_AUTH_TOKEN is not configured');
      err.retryable = false;
      throw err;
    }
    if (!cfg.fromNumber) {
      const err: any = new Error('WHATSAPP_FROM_NUMBER is not configured');
      err.retryable = false;
      throw err;
    }

    const url = `${TWILIO_API_BASE}/Accounts/${encodeURIComponent(cfg.accountSid)}/Messages.json`;
    const form = new URLSearchParams();
    form.append('To', `whatsapp:${payload.to}`);
    form.append('From', cfg.fromNumber);
    form.append('ContentSid', payload.contentSid);
    form.append('ContentVariables', JSON.stringify(payload.variables));

    try {
      const response = await axios.request({
        method: 'post',
        url,
        data: form.toString(),
        timeout: opts.timeoutMs,
        auth: { username: cfg.accountSid, password: cfg.authToken },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      const sid = response?.data?.sid;
      if (typeof sid !== 'string' || sid.length === 0) {
        const err: any = new Error('WhatsApp provider returned no message SID');
        err.retryable = true;
        throw err;
      }
      return { providerMessageId: sid };
    } catch (err: any) {
      if (err.retryable !== undefined) throw err;
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
      // Sanitized: status only — never SID, token, numbers, or body.
      const safe: any = new Error(
        status ? `WhatsApp send failed (status ${status})` : 'WhatsApp send failed (network error)'
      );
      safe.retryable = retryable;
      safe.status = status;
      if (timedOut) safe.timeout = true;
      if (code) safe.code = code;
      throw safe;
    }
  }
}
