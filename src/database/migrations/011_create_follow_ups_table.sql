-- 011_create_follow_ups_table.sql (Phase 13 – Follow-up automation scheduling/execution tracking)
-- One row per stable follow-up key; repeated webhook/event processing converges
-- on the same row via the UNIQUE constraint. Changed re-schedules for the same
-- anchor use a deterministic :n discriminator suffix (mirrors n8n/calendar keys).
-- Execution rows are claimed by a future scheduler via executeDueFollowUps();
-- no cron/workers/queues exist in this phase.

CREATE TABLE IF NOT EXISTS follow_ups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    followup_key VARCHAR(255) NOT NULL UNIQUE,
    lead_id UUID NULL REFERENCES leads(id) ON DELETE SET NULL,
    call_id UUID NULL REFERENCES calls(id) ON DELETE CASCADE,
    qualification_id UUID NULL REFERENCES qualifications(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL
        CHECK (action IN ('whatsapp_followup', 'crm_followup', 'missed_reminder')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS follow_ups_due_idx
    ON follow_ups (status, scheduled_at) WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS follow_ups_lead_id_updated_at_idx
    ON follow_ups (lead_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS follow_ups_call_id_idx
    ON follow_ups (call_id) WHERE call_id IS NOT NULL;
