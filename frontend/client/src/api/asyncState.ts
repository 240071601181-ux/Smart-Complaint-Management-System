/**
 * Phase 14C-3 — Consistent loading abstraction for future API pages.
 *
 * Future API-connected pages should represent:
 *   loading | success | empty | error
 *
 * This reuses the existing visual components (Skeleton, Spinner) — it does
 * NOT redesign them, it only gives pages a shared state vocabulary.
 */

import { ApiError } from "./errors";

export type AsyncStatus = "idle" | "loading" | "success" | "empty" | "error";

export interface AsyncState<T> {
  status: AsyncStatus;
  data: T | null;
  error: ApiError | Error | null;
  isLoading: boolean;
  isEmpty: boolean;
  isError: boolean;
}

export function idleState<T>(): AsyncState<T> {
  return { status: "idle", data: null, error: null, isLoading: false, isEmpty: false, isError: false };
}

export function loadingState<T>(): AsyncState<T> {
  return { status: "loading", data: null, error: null, isLoading: true, isEmpty: false, isError: false };
}

export function successState<T>(data: T): AsyncState<T> {
  const isEmpty = Array.isArray(data) ? data.length === 0 : data === null || data === undefined;
  return {
    status: isEmpty ? "empty" : "success",
    data,
    error: null,
    isLoading: false,
    isEmpty,
    isError: false,
  };
}

export function errorState<T>(error: ApiError | Error): AsyncState<T> {
  return { status: "error", data: null, error, isLoading: false, isEmpty: false, isError: true };
}

/**
 * Derives an AsyncState from a React Query-style result without depending
 * on React Query types, so pages can use it with any fetching approach.
 */
export function fromQuery<T>(query: {
  isLoading: boolean;
  isError: boolean;
  data?: T | null;
  error?: unknown;
}): AsyncState<T> {
  if (query.isLoading) return loadingState<T>();
  if (query.isError) {
    const err = query.error instanceof Error ? query.error : new Error("Something went wrong.");
    return errorState<T>(err);
  }
  return successState<T>((query.data ?? null) as T);
}
