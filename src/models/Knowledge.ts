export interface KnowledgeDocument {
  id: string;
  title: string;
  source?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  chunk_text: string;
  metadata?: Record<string, any> | null;
  embedding?: number[] | null;
  created_at: string;
  updated_at: string;
}

export interface IngestDocumentPayload {
  title: string;
  content: string;
  source?: string;
  metadata?: Record<string, any>;
  chunkSize?: number;
  chunkOverlap?: number;
}

export interface IngestDocumentResult {
  documentId: string;
  title: string;
  totalChunks: number;
  chunkIds: string[];
}

export interface SearchKnowledgePayload {
  query: string;
  topK?: number;
  documentId?: string;
  similarityThreshold?: number;
}

export interface SearchResultChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  chunkText: string;
  title: string;
  source?: string | null;
  metadata: Record<string, any>;
  similarity: number;
}

export interface SearchKnowledgeResult {
  query: string;
  totalResults: number;
  results: SearchResultChunk[];
}
