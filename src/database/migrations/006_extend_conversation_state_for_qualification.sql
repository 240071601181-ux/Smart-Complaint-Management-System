ALTER TABLE conversation_state
    ADD COLUMN IF NOT EXISTS cargo_dimensions TEXT NULL,
    ADD COLUMN IF NOT EXISTS booking_intent VARCHAR(20) NULL;

ALTER TABLE conversation_state
    DROP CONSTRAINT IF EXISTS conversation_state_booking_intent_check;

ALTER TABLE conversation_state
    ADD CONSTRAINT conversation_state_booking_intent_check
    CHECK (booking_intent IS NULL OR booking_intent IN ('explicit', 'not_explicit', 'unknown'));