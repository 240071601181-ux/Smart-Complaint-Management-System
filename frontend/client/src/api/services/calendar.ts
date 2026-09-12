/**
 * Phase 14C-3 — Calendar API service.
 *
 * Backend routes (existing Express backend, DO NOT MODIFY):
 *   POST /api/v1/calendar/bookings
 *   GET  /api/v1/calendar/bookings/:id
 *   GET  /api/v1/calendar/availability?start=...&end=...&timezone=...
 *
 * NOT connected to any UI in this phase.
 */

import { httpClient } from "../httpClient";
import type {
  CalendarAvailabilityQuery,
  CalendarAvailabilityResult,
  CalendarBooking,
  CreateCalendarBookingInput,
} from "../types";

export function createBooking(data: CreateCalendarBookingInput): Promise<CalendarBooking> {
  return httpClient.post<CalendarBooking>("/api/v1/calendar/bookings", data);
}

export function getBooking(id: string): Promise<CalendarBooking> {
  return httpClient.get<CalendarBooking>(
    `/api/v1/calendar/bookings/${encodeURIComponent(id)}`
  );
}

export function getAvailability(query: CalendarAvailabilityQuery): Promise<CalendarAvailabilityResult> {
  return httpClient.get<CalendarAvailabilityResult>("/api/v1/calendar/availability", {
    query: {
      start: query.start,
      end: query.end,
      timezone: query.timezone ?? undefined,
    },
  });
}
