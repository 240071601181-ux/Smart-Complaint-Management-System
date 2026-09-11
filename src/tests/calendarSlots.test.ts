/**
 * Phase 12 – calendar slot construction tests (pure functions, no I/O).
 *
 * Explicit requested slots only: required_date must never become a slot.
 */
import { buildCalendarSlot, InvalidSlotError } from '../services/calendar/calendarSlots';

describe('buildCalendarSlot', () => {
  const config = { defaultTimezone: 'Asia/Kolkata', minDurationMin: 15, maxDurationMin: 120 };
  const now = new Date('2026-09-11T10:00:00.000Z');

  it('should build a normalized explicit slot with timezone fallback', () => {
    const slot = buildCalendarSlot(
      { start: '2026-09-20T10:00:00+05:30', end: '2026-09-20T10:30:00+05:30' },
      config,
      now
    );
    expect(slot).toEqual({
      start: '2026-09-20T04:30:00.000Z',
      end: '2026-09-20T05:00:00.000Z',
      timezone: 'Asia/Kolkata'
    });
  });

  it('should honor an explicit valid timezone', () => {
    const slot = buildCalendarSlot(
      { start: '2026-09-20T10:00:00Z', end: '2026-09-20T10:30:00Z', timezone: 'UTC' },
      config,
      now
    );
    expect(slot.timezone).toBe('UTC');
  });

  it('should reject missing or unparseable inputs without inferring anything', () => {
    expect(() => buildCalendarSlot({ end: '2026-09-20T10:30:00Z' }, config, now)).toThrow(
      expect.objectContaining({ reason: 'missing_start' })
    );
    expect(() => buildCalendarSlot({ start: '2026-09-20T10:00:00Z' }, config, now)).toThrow(
      expect.objectContaining({ reason: 'missing_end' })
    );
    expect(() =>
      buildCalendarSlot({ start: 'not-a-date', end: '2026-09-20T10:30:00Z' }, config, now)
    ).toThrow(expect.objectContaining({ reason: 'unparseable_start' }));
    // A bare logistics date is not a meeting time on its own: without an
    // explicit end it must fail rather than invent one.
    expect(() =>
      buildCalendarSlot({ start: '2026-09-13' } as any, config, now)
    ).toThrow(InvalidSlotError);
  });

  it('should reject end-before-start, past starts, bad durations, and bad timezones', () => {
    expect(() =>
      buildCalendarSlot(
        { start: '2026-09-20T11:00:00Z', end: '2026-09-20T10:30:00Z' },
        config,
        now
      )
    ).toThrow(expect.objectContaining({ reason: 'end_before_start' }));
    expect(() =>
      buildCalendarSlot(
        { start: '2026-09-10T10:00:00Z', end: '2026-09-10T10:30:00Z' },
        config,
        now
      )
    ).toThrow(expect.objectContaining({ reason: 'start_in_past' }));
    expect(() =>
      buildCalendarSlot(
        { start: '2026-09-20T10:00:00Z', end: '2026-09-20T10:05:00Z' },
        config,
        now
      )
    ).toThrow(expect.objectContaining({ reason: 'duration_out_of_bounds' }));
    expect(() =>
      buildCalendarSlot(
        { start: '2026-09-20T10:00:00Z', end: '2026-09-20T13:00:00Z' },
        config,
        now
      )
    ).toThrow(expect.objectContaining({ reason: 'duration_out_of_bounds' }));
    expect(() =>
      buildCalendarSlot(
        { start: '2026-09-20T10:00:00Z', end: '2026-09-20T10:30:00Z', timezone: 'Mars/Olympus' },
        config,
        now
      )
    ).toThrow(expect.objectContaining({ reason: 'invalid_timezone' }));
  });

  it('should mark slot errors non-retryable', () => {
    try {
      buildCalendarSlot({} as any, config, now);
      fail('expected InvalidSlotError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(InvalidSlotError);
      expect(err.retryable).toBe(false);
    }
  });
});
