import { Request, Response, NextFunction } from 'express';
import { findLatestQualificationByLeadId, findQualificationByCallId } from '../repositories/qualificationRepository';
import { qualifyCall } from '../services/qualificationService';
import { enqueueCrmSync } from '../services/crm/crmSyncService';
import { enqueueN8nEvent } from '../services/n8n/n8nEmitter';
import { enqueueWhatsappMessage } from '../services/whatsapp/whatsappSender';
import { enqueueFollowupScheduling } from '../services/followup/followupService';

export const createQualification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { callId } = req.body || {};
    if (!callId || typeof callId !== 'string') {
      return res.status(400).json({ success: false, error: { message: 'callId is required and must be a string', code: 400 } });
    }
    const qualification = await qualifyCall(callId);
    // Phase 9/10/11: async CRM + n8n + WhatsApp convergence after manual
    // qualification; never blocks the response.
    enqueueCrmSync({ callId });
    enqueueN8nEvent('qualification.completed', { callId });
    // Phase 13: enqueue follow-up scheduling only (tier-driven, async).
    enqueueFollowupScheduling({ callId });
    if (qualification?.tier === 'HOT' || qualification?.tier === 'WARM') {
      enqueueWhatsappMessage({
        template: qualification.tier === 'HOT' ? 'call_summary_hot' : 'call_summary_warm',
        callId
      });
    }
    return res.status(201).json({ success: true, data: qualification });
  } catch (err) {
    next(err);
  }
};

export const getQualificationByCall = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const qualification = await findQualificationByCallId(req.params.callId);
    if (!qualification) return res.status(404).json({ success: false, error: { message: 'Qualification not found', code: 404 } });
    return res.json({ success: true, data: qualification });
  } catch (err) {
    next(err);
  }
};

export const getQualificationByLead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const qualification = await findLatestQualificationByLeadId(req.params.leadId);
    if (!qualification) return res.status(404).json({ success: false, error: { message: 'Qualification not found', code: 404 } });
    return res.json({ success: true, data: qualification });
  } catch (err) {
    next(err);
  }
};