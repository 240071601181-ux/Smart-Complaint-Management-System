import { pool } from '../database';
import { Qualification, QualificationDetails, QualificationTier } from '../models/Qualification';

export interface QualificationWriteInput {
  call_id: string;
  lead_id?: string | null;
  score: number;
  tier: QualificationTier;
  details: QualificationDetails;
  qualified_at: string;
}

export const upsertQualification = async (input: QualificationWriteInput): Promise<Qualification> => {
  const result = await pool.query(
    `INSERT INTO qualifications (call_id, lead_id, score, tier, details, qualified_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (call_id) DO UPDATE SET
       lead_id = EXCLUDED.lead_id,
       score = EXCLUDED.score,
       tier = EXCLUDED.tier,
       details = EXCLUDED.details,
       qualified_at = EXCLUDED.qualified_at,
       updated_at = NOW()
     RETURNING *`,
    [input.call_id, input.lead_id || null, input.score, input.tier, input.details, input.qualified_at]
  );
  return result.rows[0];
};

export const findQualificationByCallId = async (callId: string): Promise<Qualification | null> => {
  const result = await pool.query('SELECT * FROM qualifications WHERE call_id = $1', [callId]);
  return result.rows[0] || null;
};

export const findLatestQualificationByLeadId = async (leadId: string): Promise<Qualification | null> => {
  const result = await pool.query(
    'SELECT * FROM qualifications WHERE lead_id = $1 ORDER BY qualified_at DESC LIMIT 1',
    [leadId]
  );
  return result.rows[0] || null;
};