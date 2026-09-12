/**
 * Phase 14C-3 — Lead API service.
 *
 * Backend routes (existing Express backend, DO NOT MODIFY):
 *   POST  /api/v1/leads
 *   GET   /api/v1/leads/:id
 *   PATCH /api/v1/leads/:id
 *
 * NOT connected to any UI in this phase.
 */

import { httpClient } from "../httpClient";
import type { CreateLeadInput, Lead, UpdateLeadInput } from "../types";

export function createLead(data: CreateLeadInput): Promise<Lead> {
  return httpClient.post<Lead>("/api/v1/leads", data);
}

export function getLead(id: string): Promise<Lead> {
  return httpClient.get<Lead>(`/api/v1/leads/${encodeURIComponent(id)}`);
}

export function updateLead(id: string, data: UpdateLeadInput): Promise<Lead> {
  return httpClient.patch<Lead>(`/api/v1/leads/${encodeURIComponent(id)}`, data);
}
