/**
 * Phase 14C-3 — Lead API service.
 *
 * Backend routes (existing Express backend, DO NOT MODIFY):
 *   POST  /api/v1/leads
 *   GET   /api/v1/leads            (search/page/limit, paginated w/ total)
 *   GET   /api/v1/leads/:id
 *   PATCH /api/v1/leads/:id
 */

import { httpClient } from "../httpClient";
import type { CreateLeadInput, Lead, LeadListResult, ListLeadsInput, UpdateLeadInput } from "../types";

export function createLead(data: CreateLeadInput): Promise<Lead> {
  return httpClient.post<Lead>("/api/v1/leads", data);
}

export function listLeads(params: ListLeadsInput = {}): Promise<LeadListResult> {
  return httpClient.get<LeadListResult>("/api/v1/leads", {
    query: {
      search: params.search || undefined,
      page: params.page,
      limit: params.limit,
    },
  });
}

export function getLead(id: string): Promise<Lead> {
  return httpClient.get<Lead>(`/api/v1/leads/${encodeURIComponent(id)}`);
}

export function updateLead(id: string, data: UpdateLeadInput): Promise<Lead> {
  return httpClient.patch<Lead>(`/api/v1/leads/${encodeURIComponent(id)}`, data);
}
