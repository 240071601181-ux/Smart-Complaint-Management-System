/**
 * Phase 12 – pure meeting-slot construction and validation.
 *
 * Explicit requested slots only. The logistics `required_date` is NEVER
 * consulted here: it is not proof of a preferred meeting time, so it must
 * not become an automatic real booking slot. Callers without an explicit
 * start/end receive a validation failure (recorded as skipped_invalid_slot).
 *
 * Pure functions: no I/O, no HTTP, no SQL.
 */
import { CalendarSlot } from './calendarProvider';

export interface RequestedSlotInput {
  start?: unknown;
  end?: unknown;
  timezone?: unknown;
}

export interface SlotValidationConfig {
  defaultTimezone: string;
  minDurationMin: number;
  maxDurationMin: number;
}

export type SlotInvalidReason =
  | 'missing_start'
  | 'missing_end'
  | 'unparseable_start'
  | 'unparseable_end'
  | 'end_before_start'
  | 'start_in_past'
  | 'duration_out_of_bounds'
  | 'invalid_timezone';

export class InvalidSlotError extends Error {
  readonly reason: SlotInvalidReason;
  readonly retryable = false;
  constructor(reason: SlotInvalidReason, message: string) {
    super(message);
    this.name = 'InvalidSlotError';
    this.reason = reason;
  }
}

const parseDateTime = (value: unknown): Date | null => {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const parsed = new Date(value.trim());
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeTimezone = (value: unknown, fallback: string): string | null => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 64) return null;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return trimmed;
  } catch {
    return null;
  }
};

/**
 * Build a normalized slot from an explicit request, or throw InvalidSlotError.
 * `now` is injectable for deterministic tests.
 */
export const buildCalendarSlot = (
  input: RequestedSlotInput,
  config: SlotValidationConfig,
  now = new Date()
): CalendarSlot => {
  if (input.start === undefined || input.start === null || input.start === '') {
    throw new InvalidSlotError('missing_start', 'Requested meeting start is required');
  }
  if (input.end === undefined || input.end === null || input.end === '') {
    throw new InvalidSlotError('missing_end', 'Requested meeting end is required');
  }
  const start = parseDateTime(input.start);
  if (!start) throw new InvalidSlotError('unparseable_start', 'Requested meeting start is not a valid datetime');
  const end = parseDateTime(input.end);
  if (!end) throw new InvalidSlotError('unparseable_end', 'Requested meeting end is not a valid datetime');
  if (end.getTime() <= start.getTime()) {
    throw new InvalidSlotError('end_before_start', 'Requested meeting end must be after start');
  }
  if (start.getTime() < now.getTime() - 60 * 1000) {
    throw new InvalidSlotError('start_in_past', 'Requested meeting start is in the past');
  }
  const durationMin = (end.getTime() - start.getTime()) / 60000;
  if (durationMin < config.minDurationMin || durationMin > config.maxDurationMin) {
    throw new InvalidSlotError(
      'duration_out_of_bounds',
      `Requested meeting duration must be between ${config.minDurationMin} and ${config.maxDurationMin} minutes`
    );
  }
  const timezone = normalizeTimezone(input.timezone, config.defaultTimezone);
  if (!timezone) throw new InvalidSlotError('invalid_timezone', 'Requested timezone is not a valid IANA timezone');
  return { start: start.toISOString(), end: end.toISOString(), timezone };
};
