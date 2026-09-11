CREATE TABLE IF NOT EXISTS qualifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL UNIQUE REFERENCES calls(id) ON DELETE CASCADE,
    lead_id UUID NULL REFERENCES leads(id) ON DELETE SET NULL,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    tier VARCHAR(10) NOT NULL CHECK (tier IN ('HOT', 'WARM', 'COLD')),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    qualified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS qualifications_lead_id_qualified_at_idx
    ON qualifications (lead_id, qualified_at DESC);