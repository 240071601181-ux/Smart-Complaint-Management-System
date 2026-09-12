

export const validateLead = (data: any): string[] => {
  const errors: string[] = [];
  if (!data.source || typeof data.source !== 'string') errors.push('source is required and must be a string');
  if (!data.name || typeof data.name !== 'string') errors.push('name is required and must be a string');
  if (!data.phone || typeof data.phone !== 'string') errors.push('phone is required and must be a string');
  if (data.email && typeof data.email !== 'string') errors.push('email must be a string if provided');
  if (data.status && typeof data.status !== 'string') errors.push('status must be a string if provided');
  return errors;
};

export const MAX_LIST_LIMIT = 100;
export const DEFAULT_LIST_LIMIT = 20;

export interface ValidatedLeadListQuery {
  search?: string;
  page: number;
  limit: number;
}

/**
 * Validate GET /api/v1/leads query params. Returns errors (400) or
 * normalized params with defaults (page=1, limit=20, max limit=100).
 */
export const validateLeadListQuery = (query: any): { errors: string[]; params: ValidatedLeadListQuery } => {
  const errors: string[] = [];
  let page = 1;
  let limit = DEFAULT_LIST_LIMIT;

  if (query.page !== undefined && query.page !== '') {
    const parsed = Number(query.page);
    if (!Number.isInteger(parsed) || parsed < 1) {
      errors.push('page must be a positive integer');
    } else {
      page = parsed;
    }
  }
  if (query.limit !== undefined && query.limit !== '') {
    const parsed = Number(query.limit);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_LIST_LIMIT) {
      errors.push(`limit must be a positive integer between 1 and ${MAX_LIST_LIMIT}`);
    } else {
      limit = parsed;
    }
  }

  let search: string | undefined;
  if (query.search !== undefined && query.search !== '') {
    if (typeof query.search !== 'string') {
      errors.push('search must be a string');
    } else if (query.search.length > 200) {
      errors.push('search must be at most 200 characters');
    } else {
      const trimmed = query.search.trim();
      if (trimmed) search = trimmed;
    }
  }

  return { errors, params: { search, page, limit } };
};

export const validateLeadUpdate = (data: any): string[] => {
  const allowed = ['source', 'name', 'phone', 'email', 'status'];
  const errors: string[] = [];
  const keys = Object.keys(data);
  if (keys.length === 0) {
    errors.push('At least one updatable field must be provided');
    return errors;
  }
  for (const key of keys) {
    if (!allowed.includes(key)) {
      errors.push(`Field ${key} is not allowed to be updated`);
    } else {
      const value = (data as any)[key];
      if (typeof value !== 'string') {
        errors.push(`${key} must be a string`);
      }
    }
  }
  return errors;
};
