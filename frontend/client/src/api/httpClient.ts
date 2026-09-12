/**
 * Phase 14C-3 — Centralized HTTP client.
 *
 * All backend communication must go through this client. Components must
 * NOT call fetch/axios directly.
 *
 * Handles:
 * - GET / POST / PATCH / DELETE
 * - JSON requests + JSON responses
 * - Backend envelope `{ success, data, error }` (see `api/types.ts`)
 * - HTTP status errors, network errors, timeouts, malformed responses
 */

import { ApiError, errorKindForStatus } from "./errors";
import { frontendEnv } from "./env";
import { getSessionAuthHeader } from "./sessionCredentials";
import type { ApiEnvelope } from "./types";

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface RequestOptions {
  /** Override the base URL (defaults to VITE_API_BASE_URL). */
  baseUrl?: string;
  /** Extra headers. Content-Type: application/json is set automatically. */
  headers?: Record<string, string>;
  /** Query string parameters. */
  query?: Record<string, string | number | boolean | undefined | null>;
  /** JSON body for POST/PATCH/DELETE. */
  body?: unknown;
  /** Timeout in milliseconds (default 15000). */
  timeoutMs?: number;
  /** AbortSignal to cancel the request (composed with the timeout). */
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT_MS = 15000;

function buildUrl(path: string, baseUrl: string, query?: RequestOptions["query"]): string {
  const base = (baseUrl || "").replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${normalizedPath}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function isEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  if (typeof value !== "object" || value === null) return false;
  return "success" in value;
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError("malformed", "Received an unexpected response. Please try again.", response.status);
  }
}

export async function request<T>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = options.baseUrl ?? frontendEnv.apiBaseUrl;
  if (!baseUrl) {
    throw new ApiError(
      "unavailable",
      "Backend is not configured. Set VITE_API_BASE_URL and try again."
    );
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

  const signal = options.signal
    ? AbortSignal.any([options.signal, timeoutController.signal])
    : timeoutController.signal;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, baseUrl, options.query), {
      method,
      signal,
      // Send the existing platform session with every API request: the
      // HttpOnly session cookie, plus the Bearer mirror fallback for
      // cookie-blocking browsers (same mechanism as the tRPC link).
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...getSessionAuthHeader(),
        ...(options.headers ?? {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === "AbortError") {
      if (options.signal?.aborted) {
        throw new ApiError("network", "The request was cancelled.");
      }
      throw new ApiError("timeout", "The request timed out. Please try again.");
    }
    throw new ApiError("network", "Network unavailable. Check your connection and try again.");
  } finally {
    clearTimeout(timeoutId);
  }

  const payload = await parseJsonSafe(response);

  if (!response.ok) {
    if (isEnvelope(payload) && !payload.success) {
      const message = payload.error?.message || `Request failed with status ${response.status}.`;
      throw new ApiError(errorKindForStatus(response.status), message, response.status, payload.error?.details);
    }
    throw new ApiError(
      errorKindForStatus(response.status),
      `Request failed with status ${response.status}.`,
      response.status
    );
  }

  // Backend success envelope: { success: true, data }
  if (isEnvelope(payload)) {
    if (payload.success) return payload.data as T;
    const message = payload.error?.message || "The request was not completed.";
    throw new ApiError(errorKindForStatus(response.status), message, response.status, payload.error?.details);
  }

  // Non-envelope JSON (e.g. GET /health returns { status, timestamp }).
  return payload as T;
}

export const httpClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>("DELETE", path, options),
};
