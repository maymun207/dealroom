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
