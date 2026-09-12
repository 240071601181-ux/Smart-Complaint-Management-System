/**
 * Phase 14C-8 — React Query hooks for Calendar backend integration.
 *
 * Uses the shared QueryClient (via context — never creates a new one) and the
 * Phase 14C-3 API services (never fetch/axios).
 *
 * Backend coverage (existing Express endpoints only):
 *   GET  /api/v1/calendar/availability?start=&end=[&timezone=] -> useAvailabilityQuery
 *   POST /api/v1/calendar/bookings                              -> useCreateBookingMutation
 *   GET  /api/v1/calendar/bookings/:id                         -> useBookingQuery
 *
 * There is NO list endpoint, so there is deliberately no list query here.
 * The /calendar bookings table keeps using mock data until a backend list
 * endpoint exists. Availability logic, tier eligibility, idempotency, and
 * slot validation all stay backend-side; these hooks only transport data.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../errors";
import { createBooking, getAvailability, getBooking } from "../services/calendar";
import type {
  CalendarAvailabilityQuery,
  CreateCalendarBookingInput,
} from "../types";

export const bookingKeys = {
  all: ["calendar-bookings"] as const,
  detail: (id: string) => [...bookingKeys.all, "detail", id] as const,
  availability: (query: CalendarAvailabilityQuery) =>
    [...bookingKeys.all, "availability", query.start, query.end, query.timezone ?? ""] as const,
};

/** Don't retry requests that will deterministically fail again. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (
    error instanceof ApiError &&
    (error.kind === "not-found" ||
      error.kind === "bad-request" ||
      error.kind === "unauthorized" ||
      error.kind === "forbidden")
  ) {
    return false;
  }
  return failureCount < 1;
}

/** Backend booking record by id. Enabled only when an id is present. */
export function useBookingQuery(id: string | undefined) {
  return useQuery({
    queryKey: bookingKeys.detail(id ?? ""),
    queryFn: () => getBooking(id as string),
    enabled: !!id,
    retry: shouldRetry,
    staleTime: 30_000,
  });
}

/**
 * Explicit slot availability. Fires only when `params` is set (caller sets it
 * from an explicit "Check availability" action — never automatically), so no
 * arbitrary UI event triggers provider calls.
 */
export function useAvailabilityQuery(params: CalendarAvailabilityQuery | null) {
  return useQuery({
    queryKey: bookingKeys.availability(
      params ?? { start: "", end: "", timezone: null }
    ),
    queryFn: () => getAvailability(params as CalendarAvailabilityQuery),
    enabled: params !== null,
    retry: shouldRetry,
    staleTime: 30_000,
  });
}

/**
 * Explicit booking request. Sends ONLY backend-supported fields; tier,
 * idempotency, and slot validation stay backend-side. Seeds + invalidates
 * the detail cache on success.
 */
export function useCreateBookingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCalendarBookingInput) => createBooking(input),
    onSuccess: (booking) => {
      queryClient.setQueryData(bookingKeys.detail(booking.id), booking);
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(booking.id) });
    },
  });
}
