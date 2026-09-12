/**
 * Phase 14C-3 — Backend health check.
 *
 * Uses the existing backend endpoint (DO NOT add a new backend endpoint):
 *   GET /health  ->  { status, timestamp }
 *
 * Will be used later by the application's system-status UI.
 */

import { httpClient } from "../httpClient";
import type { HealthStatus } from "../types";

export function getHealth(): Promise<HealthStatus> {
  return httpClient.get<HealthStatus>("/health");
}
