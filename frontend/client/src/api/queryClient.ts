/**
 * Phase 14C-3 — Shared React Query client.
 *
 * A QueryClient already existed in `main.tsx`; this module is now the single
 * shared instance so no second QueryClient is ever created. `main.tsx`
 * imports from here.
 *
 * This phase only establishes the foundation — do NOT convert every API
 * function into a hook yet (that happens during feature integration).
 */

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Fail fast on backend errors; pages decide their own retry policy later.
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
    mutations: {
      retry: 0,
    },
  },
});
