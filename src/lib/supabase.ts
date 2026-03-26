/**
 * Supabase Client for NyayAI RAG System
 * Uses pgvector for semantic search over Indian legal documents.
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY ?? "";
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";

// Server-side admin client (uses service role key - full access)
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })
  : null;

// Client-side public client (uses publishable key - read access)
export const supabasePublic = supabaseUrl && supabasePublishableKey
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null;

export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error(
      "Supabase admin client not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in environment variables."
    );
  }
  return supabaseAdmin;
}

// SQL setup script for Supabase
// Run this in the Supabase SQL editor to set up the RAG system
export const SUPABASE_SETUP_SQL = `
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Legal documents table for RAG + case learning
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
  embedding vector(1536),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- GIN index on metadata for fast lawyer_id filtering
CREATE INDEX IF NOT EXISTS legal_documents_metadata_idx ON legal_documents USING gin (metadata);
CREATE INDEX IF NOT EXISTS legal_documents_category_idx ON legal_documents (category);

-- Vector similarity index (adjust lists based on row count: sqrt(rows))
CREATE INDEX IF NOT EXISTS legal_documents_embedding_idx
  ON legal_documents USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Search function with optional lawyer filter for personalised case learning
CREATE OR REPLACE FUNCTION search_legal_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.60,
  match_count int DEFAULT 6,
  filter_lawyer_id text DEFAULT NULL
)
RETURNS TABLE(id uuid, title text, content text, category text, source text, metadata jsonb, similarity float)
LANGUAGE sql STABLE
AS \$\$
  SELECT id, title, content, category, source, metadata,
    1 - (embedding <=> query_embedding) AS similarity
  FROM legal_documents
  WHERE
    1 - (embedding <=> query_embedding) > match_threshold
    AND (
      -- When filter_lawyer_id is provided, return only that lawyer's case_notes
      -- OR all non-case_note entries (global legal knowledge)
      filter_lawyer_id IS NULL
      OR category != 'case_note'
      OR (category = 'case_note' AND metadata->>'lawyerId' = filter_lawyer_id)
    )
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
\$\$;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS \$\$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
\$\$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS legal_documents_updated_at ON legal_documents;
CREATE TRIGGER legal_documents_updated_at
  BEFORE UPDATE ON legal_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security (enable for multi-tenant safety)
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (used by server)
CREATE POLICY "service_role_all" ON legal_documents
  FOR ALL TO service_role USING (true) WITH CHECK (true);
`;
