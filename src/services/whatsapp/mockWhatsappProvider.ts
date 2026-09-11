/**
 * Phase 11 – in-memory mock WhatsApp provider (tests / local dev only).
 * Never used in production unless WHATSAPP_PROVIDER=mock is configured.
 */
import {
  WhatsappProvider,
  WhatsappSendOptions,
  WhatsappSendPayload,
  WhatsappSendResult
} from './whatsappProvider';

export class MockWhatsappProvider implements WhatsappProvider {
  readonly name = 'mock';
  public calls: Array<{ payload: WhatsappSendPayload; opts: WhatsappSendOptions }> = [];
  private queue: Array<{ result?: WhatsappSendResult; error?: any }> = [];

  /** Script the next send outcome (result or thrown error). */
  enqueue(resultOrError: { result?: WhatsappSendResult; error?: any }): void {
    this.queue.push(resultOrError);
  }

  clear(): void {
    this.calls = [];
    this.queue = [];
  }

  async sendTemplate(
    payload: WhatsappSendPayload,
    opts: WhatsappSendOptions
  ): Promise<WhatsappSendResult> {
    this.calls.push({ payload, opts });
    const next = this.queue.shift();
    if (next?.error) throw next.error;
    if (next?.result) return next.result;
    return { providerMessageId: 'SMmock123' };
  }
}
