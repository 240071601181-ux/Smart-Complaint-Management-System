/**
 * Phase 14C-3 — Knowledge API service.
 *
 * Backend routes (existing Express backend, DO NOT MODIFY):
 *   POST /api/v1/knowledge/ingest
 *   POST /api/v1/knowledge/search
 *
 * NOT connected to any UI in this phase.
 */

import { httpClient } from "../httpClient";
import type {
  IngestKnowledgeInput,
  IngestKnowledgeResult,
  SearchKnowledgeInput,
  SearchKnowledgeResult,
} from "../types";

export function ingestKnowledge(data: IngestKnowledgeInput): Promise<IngestKnowledgeResult> {
  return httpClient.post<IngestKnowledgeResult>("/api/v1/knowledge/ingest", data);
}

export function searchKnowledge(data: SearchKnowledgeInput): Promise<SearchKnowledgeResult> {
  return httpClient.post<SearchKnowledgeResult>("/api/v1/knowledge/search", data);
}
