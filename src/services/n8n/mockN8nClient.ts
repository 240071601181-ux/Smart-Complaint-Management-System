/**
 * Phase 10 – in-memory mock n8n client (tests / local dev only).
 */
import { N8nClient, N8nDeliveryOptions, N8nDeliveryResult } from './n8nClient';
import { N8nEnvelope } from './n8nEventTypes';

export class MockN8nClient implements N8nClient {
  readonly name = 'mock';
  public calls: Array<{ envelope: N8nEnvelope; opts: N8nDeliveryOptions }> = [];
  private queue: Array<{ result?: N8nDeliveryResult; error?: any }> = [];

  /** Script the next delivery outcome (result or thrown error). */
  enqueue(resultOrError: { result?: N8nDeliveryResult; error?: any }): void {
    this.queue.push(resultOrError);
  }

  clear(): void {
    this.calls = [];
    this.queue = [];
  }

  async deliver(envelope: N8nEnvelope, opts: N8nDeliveryOptions): Promise<N8nDeliveryResult> {
    this.calls.push({ envelope, opts });
    const next = this.queue.shift();
    if (next?.error) throw next.error;
    if (next?.result) return next.result;
    return { httpStatus: 200 };
  }
}
