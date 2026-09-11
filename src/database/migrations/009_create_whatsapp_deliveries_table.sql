-- 009_create_whatsapp_deliveries_table.sql (Phase 11 – WhatsApp delivery status/error tracking)
-- One row per stable message key; duplicate emissions and retries converge
-- on the same row via the UNIQUE constraint. No consent columns: the
-- repository has no consent source yet, so sends are deny-by-default
-- (see WHATSAPP_REQUIRE_CONSENT) until a real source is integrated.

CREATE TABLE IF NOT EXISTS whatsapp_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template VARCHAR(50) NOT NULL,
    message_key VARCHAR(255) NOT NULL UNIQUE,
    lead_id UUID NULL REFERENCES leads(id) ON DELETE SET NULL,
    call_id UUID NULL REFERENCES calls(id) ON DELETE CASCADE,
    qualification_id UUID NULL REFERENCES qualifications(id) ON DELETE SET NULL,
    provider VARCHAR(50) NOT NULL,
    provider_message_id VARCHAR(255) NULL,
    language VARCHAR(10) NULL,
    status VARCHAR(25) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'delivered', 'failed', 'skipped_no_changes',
                          'skipped_no_consent', 'skipped_no_phone', 'skipped_suppressed')),
    attempts INTEGER NOT NULL DEFAULT 0,
    payload_hash VARCHAR(64) NULL,
    last_error TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS whatsapp_deliveries_lead_id_updated_at_idx
    ON whatsapp_deliveries (lead_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS whatsapp_deliveries_call_id_idx
    ON whatsapp_deliveries (call_id) WHERE call_id IS NOT NULL;
