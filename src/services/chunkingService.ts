export interface ChunkingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

export interface ChunkItem {
  index: number;
  text: string;
}

export const validateChunkOptions = (options?: ChunkingOptions): { chunkSize: number; chunkOverlap: number } => {
  const chunkSize = options?.chunkSize !== undefined ? options.chunkSize : 500;
  const chunkOverlap = options?.chunkOverlap !== undefined ? options.chunkOverlap : 50;

  if (typeof chunkSize !== 'number' || isNaN(chunkSize) || chunkSize <= 0) {
    throw new Error('chunkSize must be a positive number greater than 0');
  }

  if (typeof chunkOverlap !== 'number' || isNaN(chunkOverlap) || chunkOverlap < 0) {
    throw new Error('chunkOverlap must be a non-negative number (>= 0)');
  }

  if (chunkOverlap >= chunkSize) {
    throw new Error('chunkOverlap must be strictly less than chunkSize');
  }

  return { chunkSize, chunkOverlap };
};

/**
 * Splits text into chunks respecting word boundaries where possible.
 */
export const chunkText = (text: string, options?: ChunkingOptions): ChunkItem[] => {
  const { chunkSize, chunkOverlap } = validateChunkOptions(options);

  if (!text || text.trim().length === 0) {
    return [];
  }

  const cleanText = text.trim();

  // Short text fits in one chunk
  if (cleanText.length <= chunkSize) {
    return [{ index: 0, text: cleanText }];
  }

  const chunks: ChunkItem[] = [];
  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < cleanText.length) {
    let endIndex = startIndex + chunkSize;

    if (endIndex >= cleanText.length) {
      endIndex = cleanText.length;
    } else {
      // Find suitable space / newline near target endIndex to prevent mid-word splitting
      const lastSpace = cleanText.lastIndexOf(' ', endIndex);
      const lastNewline = cleanText.lastIndexOf('\n', endIndex);
      const boundaryIndex = Math.max(lastSpace, lastNewline);

      // Only backtrack if boundary is reasonable (at least half of chunkSize)
      if (boundaryIndex > startIndex + Math.floor(chunkSize / 2)) {
        endIndex = boundaryIndex;
      }
    }

    const chunkTextContent = cleanText.slice(startIndex, endIndex).trim();
    if (chunkTextContent.length > 0) {
      chunks.push({
        index: chunkIndex++,
        text: chunkTextContent
      });
    }

    if (endIndex >= cleanText.length) {
      break;
    }

    // Step forward by (endIndex - startIndex - chunkOverlap)
    const step = endIndex - startIndex - chunkOverlap;
    startIndex += Math.max(step, 1);
  }

  return chunks;
};
