import { logger } from '../utils/logger';

export interface EmbeddingProvider {
  getEmbedding(text: string): Promise<number[]>;
  getEmbeddings(texts: string[]): Promise<number[][]>;
  getDimension(): number;
}

export const getEmbeddingDimension = (): number => {
  const dimStr = process.env.EMBEDDING_DIMENSION;
  const dim = dimStr ? parseInt(dimStr, 10) : 1536;
  return isNaN(dim) || dim <= 0 ? 1536 : dim;
};

/**
 * MockEmbeddingProvider generates deterministic, normalized embedding vectors
 * of exact requested dimension for offline testing.
 */
export class MockEmbeddingProvider implements EmbeddingProvider {
  private dimension: number;

  constructor(dimension?: number) {
    this.dimension = dimension || getEmbeddingDimension();
  }

  getDimension(): number {
    return this.dimension;
  }

  async getEmbedding(text: string): Promise<number[]> {
    return this.generateDeterministicVector(text);
  }

  async getEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(t => this.getEmbedding(t)));
  }

  private generateDeterministicVector(text: string): number[] {
    const vector = new Array(this.dimension);
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }

    let norm = 0;
    for (let i = 0; i < this.dimension; i++) {
      // Pseudo-random deterministic values between -1 and 1
      const val = Math.sin(hash + i * 0.1);
      vector[i] = val;
      norm += val * val;
    }
    norm = Math.sqrt(norm) || 1;
    // Normalize vector to unit length
    for (let i = 0; i < this.dimension; i++) {
      vector[i] = vector[i] / norm;
    }
    return vector;
  }
}

/**
 * OpenAIEmbeddingProvider calls OpenAI HTTP API or compatible service.
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string;
  private model: string;
  private dimension: number;

  constructor(apiKey?: string, model?: string, dimension?: number) {
    this.apiKey = apiKey || process.env.EMBEDDING_API_KEY || process.env.LLM_API_KEY || '';
    this.model = model || process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
    this.dimension = dimension || getEmbeddingDimension();
  }

  getDimension(): number {
    return this.dimension;
  }

  async getEmbedding(text: string): Promise<number[]> {
    const embeddings = await this.getEmbeddings([text]);
    return embeddings[0];
  }

  async getEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      logger.warn('EMBEDDING_API_KEY is not set. Falling back to MockEmbeddingProvider.');
      const mock = new MockEmbeddingProvider(this.dimension);
      return mock.getEmbeddings(texts);
    }

    try {
      const axios = require('axios');
      const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          input: texts,
          model: this.model,
          dimensions: this.dimension
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const data = response.data?.data || [];
      return data.map((item: any) => item.embedding);
    } catch (err: any) {
      logger.error('Error fetching embeddings from OpenAI, falling back to mock provider', { error: err.message });
      const mock = new MockEmbeddingProvider(this.dimension);
      return mock.getEmbeddings(texts);
    }
  }
}

/**
 * Factory function to retrieve active EmbeddingProvider based on environment configuration.
 */
export const getEmbeddingProvider = (): EmbeddingProvider => {
  const providerType = (process.env.EMBEDDING_PROVIDER || 'mock').toLowerCase();
  const dimension = getEmbeddingDimension();

  if (providerType === 'openai') {
    return new OpenAIEmbeddingProvider(undefined, undefined, dimension);
  }
  return new MockEmbeddingProvider(dimension);
};
