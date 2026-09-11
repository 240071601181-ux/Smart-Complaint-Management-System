import { Request, Response, NextFunction } from 'express';
import { processVapiEvent } from '../services/vapiService';
import { validateVapiPayload } from '../middleware/vapiValidation';

export const handleVapiWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validateVapiPayload(req.body);
    if (errors.length) {
      // Log validation error but still return 200 to avoid retries from Vapi
      console.warn('Vapi webhook validation failed', { errors, payload: req.body });
      return res.status(200).json({ success: true });
    }
    // Fire‑and‑forget: process event asynchronously
    processVapiEvent(req.body);
    return res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};
