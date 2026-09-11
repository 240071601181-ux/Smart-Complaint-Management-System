-- 007_create_crm_syncs_table.sql (Phase 9 – CRM sync status/error tracking)
-- One row per provider+call sync lifecycle; duplicate call.ended events and
-- retries converge on the same row via the idempotency key.

CREATE TABLE IF NOT EXISTS crm_syncs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NULL REFERENCES leads(id) ON DELETE SET NULL,
    call_id UUID NULL REFERENCES calls(id) ON DELETE CASCADE,
    qualification_id UUID NULL REFERENCES qualifications(id) ON DELETE SET NULL,
    provider VARCHAR(50) NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    crm_contact_id VARCHAR(255) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'success', 'failed', 'skipped_no_changes')),
    attempts INTEGER NOT NULL DEFAULT 0,
    payload_hash VARCHAR(64) NULL,
    last_error TEXT NULL,
    next_retry_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_syncs_provider_call_id_uidx
    ON crm_syncs (provider, call_id) WHERE call_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS crm_syncs_lead_id_updated_at_idx
    ON crm_syncs (lead_id, updated_at DESC);
