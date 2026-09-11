/**
 * Phase 10 – shared field normalizers for n8n payload builders.
 *
 * Same semantics as the Phase 9 CRM mapper: missing/incomplete data is
 * omitted (undefined), never inferred. Tolerates pg return types
 * (DATE as JS Date, NUMERIC as string).
 */

export const n8nText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const n8nNum = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

export const n8nDateOnly = (value: unknown): string | undefined => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const sliced = value.trim().slice(0, 10);
    return sliced.length > 0 ? sliced : undefined;
  }
  return undefined;
};
