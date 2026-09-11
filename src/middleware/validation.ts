

export const validateLead = (data: any): string[] => {
  const errors: string[] = [];
  if (!data.source || typeof data.source !== 'string') errors.push('source is required and must be a string');
  if (!data.name || typeof data.name !== 'string') errors.push('name is required and must be a string');
  if (!data.phone || typeof data.phone !== 'string') errors.push('phone is required and must be a string');
  if (data.email && typeof data.email !== 'string') errors.push('email must be a string if provided');
  if (data.status && typeof data.status !== 'string') errors.push('status must be a string if provided');
  return errors;
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
