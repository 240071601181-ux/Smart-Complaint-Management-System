/**
 * Phase 14C-VOICE-1 — Call API service.
 *
 * Backend route (Express):
 *   POST /api/v1/calls/start  { leadId }  -> initiates a REAL Vapi outbound
 *   call server-side and persists the Vapi call id in the calls table.
 *
 * The phone number is resolved server-side and VAPI_API_KEY never leaves
 * the backend. Only the lead id is sent from the client.
 */

import { httpClient } from "../httpClient";
import type { StartCallInput, StartCallResult } from "../types";

export function startCall(data: StartCallInput): Promise<StartCallResult> {
  return httpClient.post<StartCallResult>("/api/v1/calls/start", data);
}
