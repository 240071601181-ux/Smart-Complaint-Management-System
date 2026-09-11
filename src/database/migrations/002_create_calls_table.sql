-- 002_create_calls_table.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NULL REFERENCES leads(id) ON DELETE SET NULL,
    vapi_call_id VARCHAR NOT NULL UNIQUE,
    status VARCHAR NOT NULL,
    started_at TIMESTAMPTZ NULL,
    answered_at TIMESTAMPTZ NULL,
    ended_at TIMESTAMPTZ NULL,
    duration_seconds INTEGER NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to update updated_at on row modification
CREATE OR REPLACE FUNCTION update_updated_at_column_calls()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_calls ON calls;
CREATE TRIGGER set_timestamp_calls
BEFORE UPDATE ON calls
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column_calls();
