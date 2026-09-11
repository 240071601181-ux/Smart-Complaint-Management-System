import { Request, Response, NextFunction } from 'express';
import { ingestDocument, searchKnowledge } from '../services/knowledgeService';

export const handleIngestDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await ingestDocument(req.body);
    return res.status(201).json({
      success: true,
      data: result
    });
  } catch (err: any) {
    if (err.message && (err.message.includes('required') || err.message.includes('must be'))) {
      return res.status(400).json({
        success: false,
        error: { message: err.message, code: 400 }
      });
    }
    next(err);
  }
};

export const handleSearchKnowledge = async (req: Request, res: Response, Next: NextFunction) => {
  try {
    const result = await searchKnowledge(req.body);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err: any) {
    if (err.message && err.message.includes('required')) {
      return res.status(400).json({
        success: false,
        error: { message: err.message, code: 400 }
      });
    }
    Next(err);
  }
};
