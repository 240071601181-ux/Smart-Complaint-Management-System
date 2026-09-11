-- 010_create_calendar_bookings_table.sql (Phase 12 – Calendar/Meet booking status tracking)
-- One row per stable booking key; duplicate requests and retries converge on
-- the same row via the UNIQUE constraint. Changed slots for the same anchor
-- use a deterministic :n discriminator suffix (mirrors n8n event_ids).

CREATE TABLE IF NOT EXISTS calendar_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_key VARCHAR(255) NOT NULL UNIQUE,
    lead_id UUID NULL REFERENCES leads(id) ON DELETE SET NULL,
    call_id UUID NULL REFERENCES calls(id) ON DELETE CASCADE,
    qualification_id UUID NULL REFERENCES qualifications(id) ON DELETE SET NULL,
    provider VARCHAR(50) NOT NULL,
    calendar_id VARCHAR(255) NULL,
    external_event_id VARCHAR(255) NULL,
    meet_url VARCHAR(1024) NULL,
    scheduled_start TIMESTAMPTZ NULL,
    scheduled_end TIMESTAMPTZ NULL,
    timezone VARCHAR(64) NULL,
    status VARCHAR(25) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'booked', 'failed',
                          'skipped_unavailable', 'skipped_invalid_slot',
                          'skipped_tier', 'skipped_no_data')),
    attempts INTEGER NOT NULL DEFAULT 0,
    slot_hash VARCHAR(64) NULL,
    last_error TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS calendar_bookings_lead_id_updated_at_idx
    ON calendar_bookings (lead_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS calendar_bookings_call_id_idx
    ON calendar_bookings (call_id) WHERE call_id IS NOT NULL;
