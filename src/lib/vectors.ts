/**
 * Computes cosine similarity between two vectors.
 * Returns a value between 0 (no similarity) and 1 (identical direction).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error('Vectors must be the same length')

  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Given a target vector, finds the top N most similar vectors from a list,
 * filtering by a minimum similarity threshold.
 */
export function findTopSimilar(
  targetVector: number[],
  candidates: { id: string; vector: number[] }[],
  threshold = 0.75,
  topN = 10
): { id: string; score: number }[] {
  return candidates
    .map((c) => ({ id: c.id, score: cosineSimilarity(targetVector, c.vector) }))
    .filter((c) => c.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
}
