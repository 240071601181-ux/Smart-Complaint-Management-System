import { Request, Response, NextFunction } from 'express';
import { startOutboundCall } from '../services/vapiCallService';

/**
 * PHASE 14C-VOICE-1 – POST /api/v1/calls/start { leadId }
 * Initiates a real Vapi outbound call for a lead. The lead phone is resolved
 * server-side; the Vapi key never touches the client. Errors carry sanitized
 * messages with `err.status` for the centralized error handler.
 */
export const startCall = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { leadId } = req.body || {};
    if (typeof leadId !== 'string' || leadId.trim() === '') {
      return res.status(400).json({ success: false, error: { message: 'leadId is required', code: 400 } });
    }
    const result = await startOutboundCall({ leadId: leadId.trim() });
    return res.status(201).json({
      success: true,
      data: {
        callId: result.call.id,
        vapiCallId: result.vapiCallId,
        status: result.call.status,
        vapiStatus: result.vapiStatus,
        leadId: result.call.lead_id
      }
    });
  } catch (err) {
    next(err);
  }
};
