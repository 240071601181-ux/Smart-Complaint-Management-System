/**
 * Phase 14C-9 — React Query hooks for Knowledge Base / RAG backend integration.
 *
 * Uses the shared QueryClient (via context — never creates a new one) and the
 * Phase 14C-3 API services (never fetch/axios).
 *
 * Backend coverage (existing Express endpoints only):
 *   POST /api/v1/knowledge/ingest  -> useIngestKnowledgeMutation
 *   POST /api/v1/knowledge/search   -> useSearchKnowledgeMutation
 *
 * Both are POST endpoints driven by explicit user actions, so mutations (not
 * queries) are the correct primitive — nothing fires automatically. There is
 * NO document-list and NO document-detail endpoint, so no such hooks exist
 * here. Chunking, embeddings, and similarity stay backend-side; the frontend
 * only transports payloads and renders returned scores verbatim.
 */

import { useMutation } from "@tanstack/react-query";
import { ingestKnowledge, searchKnowledge } from "../services/knowledge";
import type { IngestKnowledgeInput, SearchKnowledgeInput } from "../types";

/**
 * Ingest a document. Sends ONLY backend-supported fields
 * (title/content + optional source/metadata/chunkSize/chunkOverlap).
 */
export function useIngestKnowledgeMutation() {
  return useMutation({
    mutationFn: (input: IngestKnowledgeInput) => ingestKnowledge(input),
  });
}

/**
 * Vector search. Sends the query plus only supported optional parameters
 * (topK/documentId/similarityThreshold). documentId is forwarded only when
 * the caller provides one — searches are never silently broadened.
 */
export function useSearchKnowledgeMutation() {
  return useMutation({
    mutationFn: (input: SearchKnowledgeInput) => searchKnowledge(input),
  });
}
