-- ============================================================================
-- DEAL ROOM (YAPRA.AI & ARDICTECH) - SUPABASE POSTGRESQL SCHEMA (V2)
-- Satıcı (Seller) Kaydı, Public/Private Görünürlük ve Akıllı Müşteri Girişi
-- ============================================================================

-- 1. SELLERS TABLOSU (Satıcı Kullanıcılar)
CREATE TABLE IF NOT EXISTS sellers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'Satış Yöneticisi',
  brand_focus TEXT DEFAULT 'Her İkisi',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. HOLDINGS TABLOSU (Holding / Grup Şirketleri)
CREATE TABLE IF NOT EXISTS holdings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sector TEXT,
  website TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. COMPANIES / DEAL ROOMS TABLOSU (Müşteri Genel Kartı + Public/Private)
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  owner_id TEXT REFERENCES sellers(id) ON DELETE SET NULL,
  owner_name TEXT,
  owner_email TEXT,
  is_private BOOLEAN NOT NULL DEFAULT FALSE, -- Default: FALSE (Public). Satıcı isterse TRUE (Private) yapar.
  holding_id TEXT REFERENCES holdings(id) ON DELETE SET NULL,
  holding_name TEXT,
  name TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT 'Yapra.ai',
  funnel_status TEXT NOT NULL DEFAULT 'Addressables', -- 'Addressables' | 'Contacted' | 'Engaged'
  stage INTEGER NOT NULL DEFAULT 1, -- 1..9 Stepper
  contact_person JSONB DEFAULT '{}'::jsonb, -- İlk girilen Contact Person bilgisi
  sector TEXT,
  website TEXT,
  city TEXT DEFAULT 'İstanbul',
  employee_size TEXT,
  deal_value NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  expected_invoice_date DATE,
  summary_note TEXT,
  manual_red_flags JSONB DEFAULT '[]'::jsonb,
  buyers JSONB DEFAULT '[]'::jsonb,
  timeline JSONB DEFAULT '[]'::jsonb,
  actions JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to sellers" ON sellers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to holdings" ON holdings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public or owner access to companies" ON companies
  FOR ALL USING (is_private = false OR owner_email = current_setting('request.jwt.claims', true)::json->>'email')
  WITH CHECK (true);
