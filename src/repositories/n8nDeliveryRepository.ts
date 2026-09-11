/**
 * Phase 10 – n8n delivery status persistence.
 *
 * Pure persistence for outbound n8n workflow deliveries.
 * No n8n knowledge, no business rules, no HTTP: only SQL.
 * One row per (event_id, workflow); concurrent double-fires converge
 * on the same row via the UNIQUE constraint.
 */
import { pool } from '../database';

export type N8nDeliveryStatus = 'pending' | 'delivered' | 'failed' | 'skipped_no_changes';

export interface N8nDeliveryRow {
  id: string;
  event: string;
  event_id: string;
  workflow: string;
  discriminator: number;
  lead_id: string | null;
  call_id: string | null;
  qualification_id: string | null;
  status: N8nDeliveryStatus;
  attempts: number;
  payload_hash: string | null;
  http_status: number | null;
  last_error: string | null;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface N8nDeliveryAttemptInput {
  event: string;
  event_id: string;
  workflow: string;
  discriminator: number;
  lead_id?: string | null;
  call_id?: string | null;
  qualification_id?: string | null;
  payload_hash: string;
}

export const findDeliveryByEventId = async (
  eventId: string,
  workflow: string
): Promise<N8nDeliveryRow | null> => {
  const result = await pool.query(
    'SELECT * FROM n8n_deliveries WHERE event_id = $1 AND workflow = $2',
    [eventId, workflow]
  );
  return result.rows[0] || null;
};

export const upsertDeliveryAttempt = async (
  input: N8nDeliveryAttemptInput
): Promise<N8nDeliveryRow> => {
  const result = await pool.query(
    `INSERT INTO n8n_deliveries (event, event_id, workflow, discriminator, lead_id, call_id, qualification_id, status, attempts, payload_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 1, $8)
     ON CONFLICT (event_id, workflow) DO UPDATE SET
       status = 'pending',
       attempts = n8n_deliveries.attempts + 1,
       payload_hash = EXCLUDED.payload_hash,
       updated_at = NOW()
     RETURNING *`,
    [
      input.event,
      input.event_id,
      input.workflow,
      input.discriminator,
      input.lead_id || null,
      input.call_id || null,
      input.qualification_id || null,
      input.payload_hash
    ]
  );
  return result.rows[0];
};

export const markDeliveryDelivered = async (
  id: string,
  httpStatus: number
): Promise<N8nDeliveryRow> => {
  const result = await pool.query(
    `UPDATE n8n_deliveries
     SET status = 'delivered', http_status = $2, last_error = NULL, next_retry_at = NULL, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, httpStatus]
  );
  return result.rows[0];
};

export const markDeliverySkipped = async (id: string): Promise<N8nDeliveryRow> => {
  const result = await pool.query(
    `UPDATE n8n_deliveries SET status = 'skipped_no_changes', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0];
};

export const markDeliveryFailed = async (
  id: string,
  lastError: string,
  httpStatus?: number | null
): Promise<N8nDeliveryRow> => {
  const result = await pool.query(
    `UPDATE n8n_deliveries SET status = 'failed', last_error = $2, http_status = $3, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, lastError, httpStatus ?? null]
  );
  return result.rows[0];
};
