-- 004_create_knowledge_tables.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    source VARCHAR(255) NULL,
    metadata JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    metadata JSONB NULL,
    embedding vector(1536) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updating updated_at on knowledge_documents
CREATE OR REPLACE FUNCTION update_updated_at_column_knowledge_documents()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_knowledge_documents ON knowledge_documents;
CREATE TRIGGER set_timestamp_knowledge_documents
BEFORE UPDATE ON knowledge_documents
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column_knowledge_documents();

-- Trigger for updating updated_at on knowledge_chunks
CREATE OR REPLACE FUNCTION update_updated_at_column_knowledge_chunks()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_knowledge_chunks ON knowledge_chunks;
CREATE TRIGGER set_timestamp_knowledge_chunks
BEFORE UPDATE ON knowledge_chunks
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column_knowledge_chunks();
