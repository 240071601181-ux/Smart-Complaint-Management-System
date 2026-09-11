/**
 * Phase 11 – WhatsApp delivery status persistence.
 *
 * Pure persistence for outbound WhatsApp template sends.
 * No provider knowledge, no business rules, no HTTP: only SQL.
 */
import { pool } from '../database';

export type WhatsappDeliveryStatus =
  | 'pending'
  | 'delivered'
  | 'failed'
  | 'skipped_no_changes'
  | 'skipped_no_consent'
  | 'skipped_no_phone'
  | 'skipped_suppressed';

export interface WhatsappDeliveryRow {
  id: string;
  template: string;
  message_key: string;
  lead_id: string | null;
  call_id: string | null;
  qualification_id: string | null;
  provider: string;
  provider_message_id: string | null;
  language: string | null;
  status: WhatsappDeliveryStatus;
  attempts: number;
  payload_hash: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsappDeliveryAttemptInput {
  template: string;
  message_key: string;
  lead_id?: string | null;
  call_id?: string | null;
  qualification_id?: string | null;
  provider: string;
  language: string;
  payload_hash: string;
}

export const findDeliveryByMessageKey = async (
  messageKey: string
): Promise<WhatsappDeliveryRow | null> => {
  const result = await pool.query('SELECT * FROM whatsapp_deliveries WHERE message_key = $1', [
    messageKey
  ]);
  return result.rows[0] || null;
};

export const upsertDeliveryAttempt = async (
  input: WhatsappDeliveryAttemptInput
): Promise<WhatsappDeliveryRow> => {
  const result = await pool.query(
    `INSERT INTO whatsapp_deliveries (template, message_key, lead_id, call_id, qualification_id, provider, language, status, attempts, payload_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 1, $8)
     ON CONFLICT (message_key) DO UPDATE SET
       status = 'pending',
       attempts = whatsapp_deliveries.attempts + 1,
       payload_hash = EXCLUDED.payload_hash,
       language = EXCLUDED.language,
       updated_at = NOW()
     RETURNING *`,
    [
      input.template,
      input.message_key,
      input.lead_id || null,
      input.call_id || null,
      input.qualification_id || null,
      input.provider,
      input.language,
      input.payload_hash
    ]
  );
  return result.rows[0];
};

export const markDeliveryDelivered = async (
  id: string,
  providerMessageId: string
): Promise<WhatsappDeliveryRow> => {
  const result = await pool.query(
    `UPDATE whatsapp_deliveries
     SET status = 'delivered', provider_message_id = $2, last_error = NULL, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, providerMessageId]
  );
  return result.rows[0];
};

export const markDeliverySkipped = async (
  id: string,
  status: Extract<
    WhatsappDeliveryStatus,
    'skipped_no_changes' | 'skipped_no_consent' | 'skipped_no_phone' | 'skipped_suppressed'
  >
): Promise<WhatsappDeliveryRow> => {
  const result = await pool.query(
    `UPDATE whatsapp_deliveries SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, status]
  );
  return result.rows[0];
};

export const markDeliveryFailed = async (
  id: string,
  lastError: string
): Promise<WhatsappDeliveryRow> => {
  const result = await pool.query(
    `UPDATE whatsapp_deliveries SET status = 'failed', last_error = $2, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, lastError]
  );
  return result.rows[0];
};
