/**
 * Phase 12 – Calendar provider abstraction.
 *
 * Provider-independent contract for availability checks and event booking
 * with Meet conference links. All vendor specifics live in the concrete
 * provider file; callers only see this interface.
 *
 * Constraints enforced by design:
 * - Calendar logic lives in services only (never controllers/repositories/LLM).
 * - Booking happens only for explicit requested slots after the booking
 *   service determines eligibility; required_date is never used as a slot.
 * - Credentials never appear in logs or persisted rows.
 */

export interface CalendarSlot {
  /** ISO-8601 datetime with offset. */
  start: string;
  /** ISO-8601 datetime with offset. */
  end: string;
  /** IANA timezone label (e.g. Asia/Kolkata). */
  timezone: string;
}

export interface AvailabilityQuery {
  calendarId: string;
  slot: CalendarSlot;
  timeoutMs: number;
}

export interface AvailabilityResult {
  available: boolean;
}

export interface BookingRequest {
  calendarId: string;
  summary: string;
  description?: string;
  attendees?: Array<{ email?: string; displayName?: string }>;
  slot: CalendarSlot;
  /** Stable key `cal:{provider}:{call_id|lead_id}[:{n}]`; also the Meet requestId. */
  idempotencyKey: string;
  timeoutMs: number;
}

export interface BookingResult {
  externalEventId: string;
  meetUrl: string | null;
}

export interface CalendarProvider {
  readonly name: string;
  checkAvailability(query: AvailabilityQuery): Promise<AvailabilityResult>;
  createEvent(request: BookingRequest): Promise<BookingResult>;
}

/** Stable idempotency key per provider + anchor, with `:n` for changed slots. */
export const buildCalendarBookingKey = (
  providerName: string,
  anchor: string,
  discriminator?: number
): string => {
  const base = `cal:${providerName}:${anchor}`;
  return discriminator && discriminator > 1 ? `${base}:${discriminator}` : base;
};

/** Stable sha256 hash of the normalized slot for change detection. */
export const hashCalendarSlot = (slot: CalendarSlot): string => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createHash } = require('crypto') as typeof import('crypto');
  const canonical = JSON.stringify({ start: slot.start, end: slot.end, timezone: slot.timezone });
  return createHash('sha256').update(canonical).digest('hex');
};

let testOverride: CalendarProvider | null = null;

/** Test-only hook: inject a fake provider without touching env. */
export const setCalendarProviderForTests = (provider: CalendarProvider | null): void => {
  testOverride = provider;
};

export const resetCalendarProviderForTests = (): void => {
  testOverride = null;
};

/** Resolve the configured provider. Replaceable: add a file implementing CalendarProvider. */
export const getCalendarProvider = (): CalendarProvider => {
  if (testOverride) return testOverride;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getCalendarConfig } = require('../../config') as typeof import('../../config');
  const providerName = (getCalendarConfig().provider || 'google').toLowerCase();
  if (providerName === 'mock') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MockCalendarProvider } = require('./mockCalendarProvider') as typeof import('./mockCalendarProvider');
    return new MockCalendarProvider();
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GoogleCalendarProvider } = require('./googleCalendarProvider') as typeof import('./googleCalendarProvider');
  return new GoogleCalendarProvider();
};
