import { pool } from '../database';
import { ConversationState } from '../models/ConversationState';

export const findStateByCallId = async (callId: string): Promise<ConversationState | null> => {
  const res = await pool.query('SELECT * FROM conversation_state WHERE call_id = $1', [callId]);
  return res.rows[0] || null;
};

export const findStateById = async (id: string): Promise<ConversationState | null> => {
  const res = await pool.query('SELECT * FROM conversation_state WHERE id = $1', [id]);
  return res.rows[0] || null;
};

export const createState = async (state: Partial<ConversationState> & { call_id: string }): Promise<ConversationState> => {
  const existing = await findStateByCallId(state.call_id);
  if (existing) {
    return existing;
  }
  const query = `INSERT INTO conversation_state (
    call_id, lead_id, customer_name, pickup_location, destination,
    vehicle_type, cargo_type, cargo_weight, required_date, budget,
    urgency, additional_requirements, cargo_dimensions, booking_intent
  ) VALUES (
    $1, $2, $3, $4, $5,
    $6, $7, $8, $9, $10,
    $11, $12, $13, $14
  ) ON CONFLICT (call_id) DO NOTHING RETURNING *`;
  const values = [
    state.call_id,
    state.lead_id || null,
    state.customer_name || null,
    state.pickup_location || null,
    state.destination || null,
    state.vehicle_type || null,
    state.cargo_type || null,
    state.cargo_weight || null,
    state.required_date || null,
    state.budget || null,
    state.urgency || null,
    state.additional_requirements || null,
    state.cargo_dimensions || null,
    state.booking_intent || null,
  ];
  const res = await pool.query(query, values);
  if (res.rows[0]) {
    return res.rows[0];
  }
  const fallback = await findStateByCallId(state.call_id);
  return fallback!;
};

export const updateState = async (callId: string, updates: Partial<ConversationState>): Promise<ConversationState | null> => {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;
  if (updates.lead_id !== undefined) { fields.push(`lead_id = $${idx++}`); values.push(updates.lead_id); }
  if (updates.customer_name !== undefined) { fields.push(`customer_name = $${idx++}`); values.push(updates.customer_name); }
  if (updates.pickup_location !== undefined) { fields.push(`pickup_location = $${idx++}`); values.push(updates.pickup_location); }
  if (updates.destination !== undefined) { fields.push(`destination = $${idx++}`); values.push(updates.destination); }
  if (updates.vehicle_type !== undefined) { fields.push(`vehicle_type = $${idx++}`); values.push(updates.vehicle_type); }
  if (updates.cargo_type !== undefined) { fields.push(`cargo_type = $${idx++}`); values.push(updates.cargo_type); }
  if (updates.cargo_weight !== undefined) { fields.push(`cargo_weight = $${idx++}`); values.push(updates.cargo_weight); }
  if (updates.required_date !== undefined) { fields.push(`required_date = $${idx++}`); values.push(updates.required_date); }
  if (updates.budget !== undefined) { fields.push(`budget = $${idx++}`); values.push(updates.budget); }
  if (updates.urgency !== undefined) { fields.push(`urgency = $${idx++}`); values.push(updates.urgency); }
  if (updates.additional_requirements !== undefined) { fields.push(`additional_requirements = $${idx++}`); values.push(updates.additional_requirements); }
  if (updates.cargo_dimensions !== undefined) { fields.push(`cargo_dimensions = $${idx++}`); values.push(updates.cargo_dimensions); }
  if (updates.booking_intent !== undefined) { fields.push(`booking_intent = $${idx++}`); values.push(updates.booking_intent); }
  if (fields.length === 0) {
    return findStateByCallId(callId);
  }
  const query = `UPDATE conversation_state SET ${fields.join(', ')}, updated_at = NOW() WHERE call_id = $${idx} RETURNING *`;
  values.push(callId);
  const res = await pool.query(query, values);
  return res.rows[0] || null;
};
