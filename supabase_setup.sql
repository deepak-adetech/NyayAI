-- =====================================================
-- NyayaSahayak RAG Setup — Run in Supabase SQL Editor
-- https://supabase.com/dashboard/project/tsmiyomiifkrzuhtlpff/sql
-- Embedding model: voyage-law-2 (1024 dims)
-- =====================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Legal documents table for RAG + case learning
-- NOTE: voyage-law-2 produces 1024-dimensional vectors
CREATE TABLE IF NOT EXISTS legal_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'bns_sections', 'ipc_sections', 'sc_judgment', 'hc_judgment',
    'bare_act', 'legal_article', 'procedural_guide', 'bnss_sections',
    'crpc_sections', 'bsa_sections', 'evidence_act', 'case_note', 'other'
  )),
  source text,
  metadata jsonb DEFAULT '{}',
  embedding vector(1024),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- GIN index on metadata for fast lawyer_id filtering
CREATE INDEX IF NOT EXISTS legal_documents_metadata_idx ON legal_documents USING gin (metadata);
CREATE INDEX IF NOT EXISTS legal_documents_category_idx ON legal_documents (category);

-- Vector similarity index
CREATE INDEX IF NOT EXISTS legal_documents_embedding_idx
  ON legal_documents USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Search function with optional lawyer filter for personalised case learning
CREATE OR REPLACE FUNCTION search_legal_documents(
  query_embedding vector(1024),
  match_threshold float DEFAULT 0.60,
  match_count int DEFAULT 6,
  filter_lawyer_id text DEFAULT NULL
)
RETURNS TABLE(id uuid, title text, content text, category text, source text, metadata jsonb, similarity float)
LANGUAGE sql STABLE
AS $$
  SELECT id, title, content, category, source, metadata,
    1 - (embedding <=> query_embedding) AS similarity
  FROM legal_documents
  WHERE
    1 - (embedding <=> query_embedding) > match_threshold
    AND (
      filter_lawyer_id IS NULL
      OR category != 'case_note'
      OR (category = 'case_note' AND metadata->>'lawyerId' = filter_lawyer_id)
    )
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS legal_documents_updated_at ON legal_documents;
CREATE TRIGGER legal_documents_updated_at
  BEFORE UPDATE ON legal_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (used by server)
DROP POLICY IF EXISTS "service_role_all" ON legal_documents;
CREATE POLICY "service_role_all" ON legal_documents
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow anon/authenticated read access for search
DROP POLICY IF EXISTS "anon_read" ON legal_documents;
CREATE POLICY "anon_read" ON legal_documents
  FOR SELECT TO anon, authenticated USING (true);

SELECT 'Setup complete! Tables and functions created.' as status;
