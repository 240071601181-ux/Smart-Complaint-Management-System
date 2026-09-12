/**
 * Phase 14C-3 — Qualification API service.
 *
 * Backend routes (existing Express backend, DO NOT MODIFY):
 *   POST /api/v1/qualifications
 *   GET  /api/v1/qualifications/calls/:callId
 *   GET  /api/v1/qualifications/leads/:leadId
 *
 * NOT connected to any UI in this phase.
 */

import { httpClient } from "../httpClient";
import type { CreateQualificationInput, Qualification } from "../types";

export function createQualification(data: CreateQualificationInput): Promise<Qualification> {
  return httpClient.post<Qualification>("/api/v1/qualifications", data);
}

export function getQualificationByCall(callId: string): Promise<Qualification> {
  return httpClient.get<Qualification>(
    `/api/v1/qualifications/calls/${encodeURIComponent(callId)}`
  );
}

export function getQualificationByLead(leadId: string): Promise<Qualification> {
  return httpClient.get<Qualification>(
    `/api/v1/qualifications/leads/${encodeURIComponent(leadId)}`
  );
}
