/**
 * Phase 9 – in-memory mock CRM provider (tests / local dev only).
 * Never used in production unless CRM_PROVIDER=mock is configured.
 */
import { CrmProvider, CrmContactPayload, CrmSyncResult, CrmUpsertOptions } from './crmProvider';

export class MockCrmProvider implements CrmProvider {
  readonly name = 'mock';
  public calls: Array<{ payload: CrmContactPayload; opts: CrmUpsertOptions }> = [];
  private queue: Array<{ result?: CrmSyncResult; error?: any }> = [];

  /** Script the next provider outcome (result or thrown error). */
  enqueue(resultOrError: { result?: CrmSyncResult; error?: any }): void {
    this.queue.push(resultOrError);
  }

  clear(): void {
    this.calls = [];
    this.queue = [];
  }

  async upsertContact(payload: CrmContactPayload, opts: CrmUpsertOptions): Promise<CrmSyncResult> {
    this.calls.push({ payload, opts });
    const next = this.queue.shift();
    if (next?.error) throw next.error;
    if (next?.result) return next.result;
    return {
      crmContactId: opts.crmContactId || 'mock-contact-1',
      created: !opts.crmContactId
    };
  }
}
