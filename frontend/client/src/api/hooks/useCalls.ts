/**
 * Phase 14C-VOICE-1 — React Query hook for real outbound call initiation.
 *
 * Uses the shared QueryClient from `@/api/queryClient` (via context — never
 * creates a new one) and the Phase 14C-VOICE-1 calls service (never
 * fetch/axios).
 *
 * Backend coverage (Express):
 *   POST /api/v1/calls/start  -> useStartCallMutation
 */

import { useMutation } from "@tanstack/react-query";
import { startCall } from "../services/calls";
import type { StartCallInput } from "../types";

export function useStartCallMutation() {
  return useMutation({
    mutationFn: (input: StartCallInput) => startCall(input),
  });
}
