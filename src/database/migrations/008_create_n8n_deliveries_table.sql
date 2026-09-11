-- 008_create_n8n_deliveries_table.sql (Phase 10 – n8n delivery status/error tracking)
-- One row per (event_id, workflow); duplicate emissions and retries converge
-- on the same row via the UNIQUE constraint. Discriminator suffixes
-- (:{n} in event_id) distinguish genuinely changed re-occurrences.

CREATE TABLE IF NOT EXISTS n8n_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event VARCHAR(50) NOT NULL,
    event_id VARCHAR(255) NOT NULL,
    workflow VARCHAR(255) NOT NULL,
    discriminator INTEGER NOT NULL DEFAULT 1,
    lead_id UUID NULL REFERENCES leads(id) ON DELETE SET NULL,
    call_id UUID NULL REFERENCES calls(id) ON DELETE CASCADE,
    qualification_id UUID NULL REFERENCES qualifications(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'delivered', 'failed', 'skipped_no_changes')),
    attempts INTEGER NOT NULL DEFAULT 0,
    payload_hash VARCHAR(64) NULL,
    http_status INTEGER NULL,
    last_error TEXT NULL,
    next_retry_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT n8n_deliveries_event_workflow_uidx UNIQUE (event_id, workflow)
);

CREATE INDEX IF NOT EXISTS n8n_deliveries_event_updated_at_idx
    ON n8n_deliveries (event, updated_at DESC);

CREATE INDEX IF NOT EXISTS n8n_deliveries_call_id_idx
    ON n8n_deliveries (call_id) WHERE call_id IS NOT NULL;
