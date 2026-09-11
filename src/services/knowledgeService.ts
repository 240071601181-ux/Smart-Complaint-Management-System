import {
  IngestDocumentPayload,
  IngestDocumentResult,
  SearchKnowledgePayload,
  SearchKnowledgeResult
} from '../models/Knowledge';
import { createDocument, createChunks, searchSimilarChunks } from '../repositories/knowledgeRepository';
import { chunkText } from './chunkingService';
import { getEmbeddingProvider } from '../agent/embeddings';
import { logger } from '../utils/logger';

export const ingestDocument = async (payload: IngestDocumentPayload): Promise<IngestDocumentResult> => {
  if (!payload || !payload.title || typeof payload.title !== 'string' || payload.title.trim().length === 0) {
    throw new Error('Title is required for document ingestion');
  }
  if (!payload.content || typeof payload.content !== 'string' || payload.content.trim().length === 0) {
    throw new Error('Content is required for document ingestion');
  }

  logger.info('Ingesting document', { title: payload.title, source: payload.source });

  // 1. Create Knowledge Document Record
  const doc = await createDocument({
    title: payload.title.trim(),
    source: payload.source ? payload.source.trim() : null,
    metadata: payload.metadata || {}
  });

  // 2. Chunk text
  const chunks = chunkText(payload.content, {
    chunkSize: payload.chunkSize,
    chunkOverlap: payload.chunkOverlap
  });

  if (chunks.length === 0) {
    return {
      documentId: doc.id,
      title: doc.title,
      totalChunks: 0,
      chunkIds: []
    };
  }

  // 3. Generate embeddings
  const embeddingProvider = getEmbeddingProvider();
  const chunkTexts = chunks.map(c => c.text);
  const embeddings = await embeddingProvider.getEmbeddings(chunkTexts);

  // 4. Save chunks
  const chunkRecords = chunks.map((c, i) => ({
    document_id: doc.id,
    chunk_index: c.index,
    chunk_text: c.text,
    metadata: payload.metadata || {},
    embedding: embeddings[i]
  }));

  const savedChunks = await createChunks(chunkRecords);

  logger.info('Document ingested successfully', {
    documentId: doc.id,
    chunksCreated: savedChunks.length
  });

  return {
    documentId: doc.id,
    title: doc.title,
    totalChunks: savedChunks.length,
    chunkIds: savedChunks.map(sc => sc.id)
  };
};

export const searchKnowledge = async (payload: SearchKnowledgePayload): Promise<SearchKnowledgeResult> => {
  if (!payload || !payload.query || typeof payload.query !== 'string' || payload.query.trim().length === 0) {
    throw new Error('Search query is required');
  }

  const queryText = payload.query.trim();
  const topK = payload.topK && payload.topK > 0 ? payload.topK : 5;
  const documentId = payload.documentId;
  const similarityThreshold = payload.similarityThreshold !== undefined ? payload.similarityThreshold : 0.0;

  logger.info('Searching knowledge base', { query: queryText, topK, documentId, similarityThreshold });

  // 1. Generate query embedding
  const embeddingProvider = getEmbeddingProvider();
  const queryEmbedding = await embeddingProvider.getEmbedding(queryText);

  // 2. Perform vector search
  const results = await searchSimilarChunks(queryEmbedding, {
    topK,
    documentId,
    similarityThreshold
  });

  logger.info('Knowledge search complete', { query: queryText, resultsFound: results.length });

  return {
    query: queryText,
    totalResults: results.length,
    results
  };
};
