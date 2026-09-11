import { pool } from '../database';
import { Call } from '../models/Call';

export const findCallByVapiId = async (vapiCallId: string): Promise<Call | null> => {
  const res = await pool.query('SELECT * FROM calls WHERE vapi_call_id = $1', [vapiCallId]);
  return res.rows[0] || null;
};

export const findCallById = async (id: string): Promise<Call | null> => {
  const res = await pool.query('SELECT * FROM calls WHERE id = $1', [id]);
  return res.rows[0] || null;
};

export const upsertCall = async (callData: Partial<Call> & { vapi_call_id: string }): Promise<Call> => {
  const existing = await findCallByVapiId(callData.vapi_call_id);
  if (existing) {
    // Update only provided fields
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (callData.lead_id !== undefined) { fields.push(`lead_id = $${idx++}`); values.push(callData.lead_id); }
    if (callData.status) { fields.push(`status = $${idx++}`); values.push(callData.status); }
    if (callData.started_at !== undefined) { fields.push(`started_at = $${idx++}`); values.push(callData.started_at); }
    if (callData.answered_at !== undefined) { fields.push(`answered_at = $${idx++}`); values.push(callData.answered_at); }
    if (callData.ended_at !== undefined) { fields.push(`ended_at = $${idx++}`); values.push(callData.ended_at); }
    if (callData.duration_seconds !== undefined) { fields.push(`duration_seconds = $${idx++}`); values.push(callData.duration_seconds); }
    if (fields.length > 0) {
      const query = `UPDATE calls SET ${fields.join(', ')}, updated_at = NOW() WHERE vapi_call_id = $${idx} RETURNING *`;
      values.push(callData.vapi_call_id);
      const res = await pool.query(query, values);
      return res.rows[0];
    }
    return existing;
  } else {
    const query = `INSERT INTO calls (vapi_call_id, lead_id, status, started_at, answered_at, ended_at, duration_seconds) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`;
    const res = await pool.query(query, [
      callData.vapi_call_id,
      callData.lead_id || null,
      callData.status || 'initiated',
      callData.started_at || null,
      callData.answered_at || null,
      callData.ended_at || null,
      callData.duration_seconds || null,
    ]);
    return res.rows[0];
  }
};
