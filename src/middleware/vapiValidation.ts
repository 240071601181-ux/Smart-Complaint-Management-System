export const validateVapiPayload = (payload: any): string[] => {
  const errors: string[] = [];
  if (!payload || typeof payload !== 'object') {
    errors.push('Payload must be a JSON object');
    return errors;
  }
  const event = payload.event;
  if (!event || typeof event !== 'object') {
    errors.push('Missing or invalid event object');
    return errors;
  }
  if (!event.type || typeof event.type !== 'string') {
    errors.push('Event type is required and must be a string');
  }
  // Additional optional validation can be added here.
  return errors;
};
