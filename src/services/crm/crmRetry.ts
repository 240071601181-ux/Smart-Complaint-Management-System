/**
 * Phase 9 – bounded retry helper for CRM provider calls.
 *
 * Retries only errors explicitly marked retryable (network/timeout/429/5xx
 * as classified by the provider). HTTP 4xx and validation errors fail fast.
 * Backoff is exponential with jitter and a small bound (no queues/cron).
 */

export interface CrmRetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
}

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const isRetryableCrmError = (err: any): boolean => {
  if (!err) return false;
  if (err.retryable === true) return true;
  if (err.retryable === false) return false;
  const status = err.status ?? err.response?.status;
  if (typeof status === 'number') {
    if (status === 429) return true;
    if (status >= 500 && status < 600) return true;
    if (status >= 400 && status < 500) return false;
  }
  const code = err.code || err.cause?.code;
  if (typeof code === 'string') {
    if (['ECONNABORTED', 'ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN'].includes(code)) {
      return true;
    }
  }
  if (err.timeout === true) return true;
  return false;
};

const computeDelayMs = (attempt: number, baseDelayMs: number): number => {
  const exponential = baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.floor(Math.random() * baseDelayMs);
  return exponential + jitter;
};

export const withCrmRetry = async <T>(
  fn: () => Promise<T>,
  options: CrmRetryOptions = {}
): Promise<T> => {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 500;
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt >= maxRetries || !isRetryableCrmError(err)) {
        throw err;
      }
      await sleep(computeDelayMs(attempt, baseDelayMs));
    }
  }
  throw lastError;
};
