import { Request, Response, NextFunction } from 'express';
import { LeadService } from '../services/leadService';
import { validateLead, validateLeadUpdate } from '../middleware/validation';
import { enqueueN8nEvent } from '../services/n8n/n8nEmitter';
import { enqueueWhatsappMessage } from '../services/whatsapp/whatsappSender';

const leadService = new LeadService();

export const createLead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validateLead(req.body);
    if (errors.length) {
      return res.status(400).json({ success: false, error: { message: 'Validation error', code: 400, details: errors } });
    }
    const lead = await leadService.createLead(req.body);
    // Phase 10: async n8n fan-out after persistence; never blocks the response.
    enqueueN8nEvent('lead.created', { leadId: lead.id });
    // Phase 11: async WhatsApp welcome (consent-gated at send time); never blocks.
    enqueueWhatsappMessage({ template: 'lead_welcome', leadId: lead.id });
    return res.status(201).json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
};

export const getLead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const lead = await leadService.getLead(id);
    if (!lead) {
      return res.status(404).json({ success: false, error: { message: 'Lead not found', code: 404 } });
    }
    return res.json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
};

export const updateLead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const errors = validateLeadUpdate(req.body);
    if (errors.length) {
      return res.status(400).json({ success: false, error: { message: 'Validation error', code: 400, details: errors } });
    }
    const updated = await leadService.updateLead(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: { message: 'Lead not found', code: 404 } });
    }
    // Phase 10: async n8n fan-out after persistence; never blocks the response.
    enqueueN8nEvent('lead.updated', { leadId: updated.id });
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};
