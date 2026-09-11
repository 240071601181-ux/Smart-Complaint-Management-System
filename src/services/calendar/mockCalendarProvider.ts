/**
 * Phase 12 – in-memory mock Calendar provider (tests / local dev only).
 * Never used in production unless CALENDAR_PROVIDER=mock is configured.
 */
import {
  AvailabilityQuery,
  AvailabilityResult,
  BookingRequest,
  BookingResult,
  CalendarProvider
} from './calendarProvider';

export class MockCalendarProvider implements CalendarProvider {
  readonly name = 'mock';
  public availabilityCalls: AvailabilityQuery[] = [];
  public bookingCalls: BookingRequest[] = [];
  /** Script busy windows as `${start}|${end}` pairs; overlapping queries are busy. */
  public busyWindows: Array<{ start: string; end: string }> = [];
  private queue: Array<{ result?: BookingResult; error?: any }> = [];
  private counter = 0;

  /** Script the next booking outcome (result or thrown error). */
  enqueue(resultOrError: { result?: BookingResult; error?: any }): void {
    this.queue.push(resultOrError);
  }

  clear(): void {
    this.availabilityCalls = [];
    this.bookingCalls = [];
    this.busyWindows = [];
    this.queue = [];
    this.counter = 0;
  }

  async checkAvailability(query: AvailabilityQuery): Promise<AvailabilityResult> {
    this.availabilityCalls.push(query);
    const start = new Date(query.slot.start).getTime();
    const end = new Date(query.slot.end).getTime();
    const busy = this.busyWindows.some((window) => {
      const windowStart = new Date(window.start).getTime();
      const windowEnd = new Date(window.end).getTime();
      return start < windowEnd && windowStart < end;
    });
    return { available: !busy };
  }

  async createEvent(request: BookingRequest): Promise<BookingResult> {
    this.bookingCalls.push(request);
    const next = this.queue.shift();
    if (next?.error) throw next.error;
    if (next?.result) return next.result;
    this.counter += 1;
    return {
      externalEventId: `mock-event-${this.counter}`,
      meetUrl: `https://meet.google.com/mock-${this.counter}`
    };
  }
}
