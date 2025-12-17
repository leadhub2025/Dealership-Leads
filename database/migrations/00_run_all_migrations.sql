-- ============================================
-- MASTER MIGRATION SCRIPT
-- AutoLead SA - Complete Database Setup
-- ============================================
-- Run this file in Supabase SQL Editor to setup everything
-- ============================================

-- ============================================
-- MIGRATION 001: Create Tables
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table: dealerships
CREATE TABLE IF NOT EXISTS public.dealerships (
  id TEXT PRIMARY KEY DEFAULT ('d_' || substr(md5(random()::text), 1, 10)),
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  region TEXT NOT NULL,
  detailed_aor TEXT,
  contact_person TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Active', 'Pending', 'Suspended')),
  leads_assigned INTEGER DEFAULT 0,
  max_leads_capacity INTEGER DEFAULT 50,
  billing JSONB NOT NULL DEFAULT '{
    "plan": "Standard",
    "costPerLead": 350,
    "credits": 0,
    "totalSpent": 0,
    "lastBilledDate": "",
    "currentUnbilledAmount": 0
  }'::jsonb,
  preferences JSONB DEFAULT '{
    "vehicleConditions": ["New", "Used"],
    "minScore": 50
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: leads
CREATE TABLE IF NOT EXISTS public.leads (
  id TEXT PRIMARY KEY DEFAULT ('l_' || substr(md5(random()::text), 1, 10)),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  source TEXT NOT NULL,
  intent_summary TEXT NOT NULL,
  date_detected TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'ARCHIVED')),
  sentiment TEXT,
  potential_value TEXT,
  region TEXT NOT NULL,
  grounding_url TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  context_dealer TEXT,
  assigned_dealer_id TEXT REFERENCES public.dealerships(id) ON DELETE SET NULL,
  assignment_type TEXT CHECK (assignment_type IN ('Direct', 'Fallback', 'National')),
  follow_up_date TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- MIGRATION 002: Create Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_dealerships_email ON public.dealerships(email);
CREATE INDEX IF NOT EXISTS idx_dealerships_status ON public.dealerships(status) WHERE status = 'Active';
CREATE INDEX IF NOT EXISTS idx_dealerships_brand ON public.dealerships(brand);
CREATE INDEX IF NOT EXISTS idx_dealerships_region ON public.dealerships(region);
CREATE INDEX IF NOT EXISTS idx_dealerships_brand_region ON public.dealerships(brand, region) WHERE status = 'Active';
CREATE INDEX IF NOT EXISTS idx_dealerships_created ON public.dealerships(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_dealer ON public.leads(assigned_dealer_id) WHERE assigned_dealer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_brand ON public.leads(brand);
CREATE INDEX IF NOT EXISTS idx_leads_region ON public.leads(region);
CREATE INDEX IF NOT EXISTS idx_leads_brand_region ON public.leads(brand, region);
CREATE INDEX IF NOT EXISTS idx_leads_date_detected ON public.leads(date_detected DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON public.leads(follow_up_date) WHERE follow_up_date IS NOT NULL AND status NOT IN ('CONVERTED', 'ARCHIVED');

-- ============================================
-- MIGRATION 003: Create Triggers
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_dealerships_updated_at ON public.dealerships;
CREATE TRIGGER trigger_update_dealerships_updated_at
    BEFORE UPDATE ON public.dealerships
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_leads_updated_at ON public.leads;
CREATE TRIGGER trigger_update_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_email()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format: %', NEW.email;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_dealership_email ON public.dealerships;
CREATE TRIGGER trigger_validate_dealership_email
    BEFORE INSERT OR UPDATE OF email ON public.dealerships
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_email();

-- ============================================
-- MIGRATION 004: Row Level Security
-- ============================================

ALTER TABLE public.dealerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "policy_dealerships_all" ON public.dealerships;
CREATE POLICY "policy_dealerships_all"
  ON public.dealerships
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "policy_leads_all" ON public.leads;
CREATE POLICY "policy_leads_all"
  ON public.leads
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- VERIFICATION QUERY
-- ============================================

SELECT
  'Migration completed successfully! ✅' AS status,
  '2 tables created' AS tables,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('dealerships', 'leads')) AS table_count,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('dealerships', 'leads')) AS index_count,
  (SELECT COUNT(*) FROM pg_trigger WHERE tgrelid IN ('public.dealerships'::regclass, 'public.leads'::regclass)) AS trigger_count;
