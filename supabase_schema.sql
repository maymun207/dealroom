-- ============================================================================
-- DEAL ROOM (YAPRA.AI & ARDICTECH) - SUPABASE POSTGRESQL SCHEMA
-- Target Project: dealroom-ai (rcsfvpzmkqenghrngykf)
-- ============================================================================

-- 1. SELLERS TABLOSU (Satıcı Kullanıcılar)
CREATE TABLE IF NOT EXISTS public.sellers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'Satış Yöneticisi',
  brand_focus TEXT DEFAULT 'Her İkisi',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. HOLDINGS TABLOSU (Holding / Grup Şirketleri)
CREATE TABLE IF NOT EXISTS public.holdings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sector TEXT DEFAULT '',
  website TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. COMPANIES / DEAL ROOMS TABLOSU (Müşteri Genel Kartı + 6 Alıcı + Rakipler + Aksiyonlar + Teklifler)
CREATE TABLE IF NOT EXISTS public.companies (
  id TEXT PRIMARY KEY,
  owner_id TEXT REFERENCES public.sellers(id) ON DELETE SET NULL,
  owner_name TEXT DEFAULT '',
  owner_email TEXT DEFAULT '',
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  holding_id TEXT REFERENCES public.holdings(id) ON DELETE SET NULL,
  holding_name TEXT DEFAULT '',
  name TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT 'Yapra.ai',
  funnel_status TEXT NOT NULL DEFAULT 'Addressables',
  stage INTEGER NOT NULL DEFAULT 1,
  contact_person JSONB DEFAULT '{}'::jsonb,
  sector TEXT DEFAULT '',
  website TEXT DEFAULT '',
  city TEXT DEFAULT 'İstanbul',
  employee_size TEXT DEFAULT '',
  deal_value NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  expected_invoice_date TEXT DEFAULT '',
  summary_note TEXT DEFAULT '',
  manual_red_flags JSONB DEFAULT '[]'::jsonb,
  competitors JSONB DEFAULT '[]'::jsonb,
  buyers JSONB DEFAULT '[]'::jsonb,
  actions JSONB DEFAULT '[]'::jsonb,
  timeline JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Foreign key & filter indexes
CREATE INDEX IF NOT EXISTS idx_companies_owner_id ON public.companies(owner_id);
CREATE INDEX IF NOT EXISTS idx_companies_holding_id ON public.companies(holding_id);
CREATE INDEX IF NOT EXISTS idx_companies_funnel_status ON public.companies(funnel_status);
CREATE INDEX IF NOT EXISTS idx_companies_owner_email ON public.companies(owner_email);

-- Enable Row Level Security
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Grants for Data API (anon & authenticated)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sellers TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.holdings TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO anon, authenticated, service_role;

-- RLS Policies
CREATE POLICY "dealroom_sellers_access" ON public.sellers
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "dealroom_holdings_access" ON public.holdings
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "dealroom_companies_access" ON public.companies
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 4. SUPABASE STORAGE BUCKET: deal-documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('deal-documents', 'deal-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "deal_documents_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'deal-documents');

CREATE POLICY "deal_documents_insert" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'deal-documents');

CREATE POLICY "deal_documents_update" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'deal-documents')
  WITH CHECK (bucket_id = 'deal-documents');

CREATE POLICY "deal_documents_delete" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'deal-documents');

-- 5. ARCHIVE_ITEMS TABLOSU (Kurumsal Arşiv: Sunumlar, Email Şablonları, Dokümanlar, Fiyat Listeleri, Case Studies)
CREATE TABLE IF NOT EXISTS public.archive_items (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'document', -- 'presentation' | 'email_template' | 'document' | 'price_list' | 'case_study'
  brand TEXT NOT NULL DEFAULT 'Her İkisi',
  title TEXT NOT NULL,
  subject TEXT DEFAULT '',
  content TEXT DEFAULT '',
  file_name TEXT DEFAULT '',
  file_size TEXT DEFAULT '',
  file_url TEXT DEFAULT '',
  tags JSONB DEFAULT '[]'::jsonb,
  author_name TEXT DEFAULT '',
  author_email TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_archive_items_category ON public.archive_items(category);
CREATE INDEX IF NOT EXISTS idx_archive_items_brand ON public.archive_items(brand);

ALTER TABLE public.archive_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.archive_items TO anon, authenticated, service_role;

CREATE POLICY "dealroom_archive_items_access" ON public.archive_items
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);
