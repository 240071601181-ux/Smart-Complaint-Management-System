-- 003_create_conversation_state_table.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS conversation_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL UNIQUE REFERENCES calls(id) ON DELETE CASCADE,
    lead_id UUID NULL REFERENCES leads(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NULL,
    pickup_location VARCHAR(255) NULL,
    destination VARCHAR(255) NULL,
    vehicle_type VARCHAR(100) NULL,
    cargo_type VARCHAR(100) NULL,
    cargo_weight NUMERIC NULL,
    required_date DATE NULL,
    budget NUMERIC NULL,
    urgency VARCHAR(50) NULL,
    additional_requirements TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to update updated_at on row modification
CREATE OR REPLACE FUNCTION update_updated_at_column_conversation_state()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_conversation_state ON conversation_state;
CREATE TRIGGER set_timestamp_conversation_state
BEFORE UPDATE ON conversation_state
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column_conversation_state();
