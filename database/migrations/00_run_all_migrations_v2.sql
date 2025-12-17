-- ============================================
-- MASTER MIGRATION SCRIPT V2
-- AutoLead SA - Complete Database Setup with Users Table
-- ============================================
-- Run this file in Supabase SQL Editor for FRESH installations
-- This version includes separate users table for authentication
-- ============================================

-- ============================================
-- EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- MIGRATION 001: Create Dealerships Table (First - no dependencies)
-- ============================================

CREATE TABLE IF NOT EXISTS public.dealerships (
  id TEXT PRIMARY KEY DEFAULT ('d_' || substr(md5(random()::text), 1, 10)),

  -- Business Information
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  region TEXT NOT NULL,
  detailed_aor TEXT,

  -- Contact Information (reference only, auth is in users table)
  contact_person TEXT,
  phone TEXT,
  address TEXT,

  -- Business Metrics
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Active', 'Pending', 'Suspended')),
  leads_assigned INTEGER DEFAULT 0,
  max_leads_capacity INTEGER DEFAULT 50,

  -- Billing Configuration
  billing JSONB NOT NULL DEFAULT '{
    "plan": "Standard",
    "costPerLead": 350,
    "credits": 0,
    "totalSpent": 0,
    "lastBilledDate": "",
    "currentUnbilledAmount": 0
  }'::jsonb,

  -- Lead Preferences
  preferences JSONB DEFAULT '{
    "vehicleConditions": ["New", "Used"],
    "minScore": 50
  }'::jsonb,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- MIGRATION 002: Create Users Table (Second - references dealerships)
-- ============================================

CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY DEFAULT ('u_' || substr(md5(random()::text), 1, 10)),

  -- Authentication Fields
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,

  -- User Profile
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'DEALER_PRINCIPAL', 'SALES_MANAGER', 'SALES_EXECUTIVE')),

  -- Dealership Relationship
  dealership_id TEXT REFERENCES public.dealerships(id) ON DELETE CASCADE,

  -- Account Status
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Suspended')),
  is_verified BOOLEAN DEFAULT false,

  -- Session Management
  last_login TIMESTAMP WITH TIME ZONE,
  login_count INTEGER DEFAULT 0,

  -- Metadata
  avatar_url TEXT,
  phone TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- MIGRATION 003: Create Leads Table (Third - references both dealerships and users)
-- ============================================

CREATE TABLE IF NOT EXISTS public.leads (
  id TEXT PRIMARY KEY DEFAULT ('l_' || substr(md5(random()::text), 1, 10)),

  -- Vehicle Information
  brand TEXT NOT NULL,
  model TEXT NOT NULL,

  -- Lead Source
  source TEXT NOT NULL,
  intent_summary TEXT NOT NULL,
  date_detected TEXT NOT NULL,
  grounding_url TEXT,

  -- Lead Status
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'ARCHIVED')),
  sentiment TEXT,
  potential_value TEXT,

  -- Location
  region TEXT NOT NULL,

  -- Contact Information
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  context_dealer TEXT,

  -- Assignment (links to both dealership and specific user)
  assigned_dealer_id TEXT REFERENCES public.dealerships(id) ON DELETE SET NULL,
  assigned_user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  assignment_type TEXT CHECK (assignment_type IN ('Direct', 'Fallback', 'National')),

  -- Follow-up
  follow_up_date TEXT,
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- MIGRATION 004: Create Indexes
-- ============================================

-- Dealerships Indexes
CREATE INDEX IF NOT EXISTS idx_dealerships_status ON public.dealerships(status) WHERE status = 'Active';
CREATE INDEX IF NOT EXISTS idx_dealerships_brand ON public.dealerships(brand);
CREATE INDEX IF NOT EXISTS idx_dealerships_region ON public.dealerships(region);
CREATE INDEX IF NOT EXISTS idx_dealerships_brand_region ON public.dealerships(brand, region) WHERE status = 'Active';
CREATE INDEX IF NOT EXISTS idx_dealerships_created ON public.dealerships(created_at DESC);

-- Users Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_dealership ON public.users(dealership_id) WHERE dealership_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status) WHERE status = 'Active';
CREATE INDEX IF NOT EXISTS idx_users_dealership_role ON public.users(dealership_id, role) WHERE status = 'Active';

-- Leads Indexes
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_dealer ON public.leads(assigned_dealer_id) WHERE assigned_dealer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_assigned_user ON public.leads(assigned_user_id) WHERE assigned_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_brand ON public.leads(brand);
CREATE INDEX IF NOT EXISTS idx_leads_region ON public.leads(region);
CREATE INDEX IF NOT EXISTS idx_leads_brand_region ON public.leads(brand, region);
CREATE INDEX IF NOT EXISTS idx_leads_date_detected ON public.leads(date_detected DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON public.leads(follow_up_date) WHERE follow_up_date IS NOT NULL AND status NOT IN ('CONVERTED', 'ARCHIVED');

-- ============================================
-- MIGRATION 005: Create Functions & Triggers
-- ============================================

-- Function: Auto-update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Validate email format
CREATE OR REPLACE FUNCTION public.validate_email()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format: %', NEW.email;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers: Dealerships
DROP TRIGGER IF EXISTS trigger_update_dealerships_updated_at ON public.dealerships;
CREATE TRIGGER trigger_update_dealerships_updated_at
    BEFORE UPDATE ON public.dealerships
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Triggers: Users
DROP TRIGGER IF EXISTS trigger_update_users_updated_at ON public.users;
CREATE TRIGGER trigger_update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_validate_user_email ON public.users;
CREATE TRIGGER trigger_validate_user_email
    BEFORE INSERT OR UPDATE OF email ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_email();

-- Triggers: Leads
DROP TRIGGER IF EXISTS trigger_update_leads_updated_at ON public.leads;
CREATE TRIGGER trigger_update_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- MIGRATION 006: Row Level Security
-- ============================================

ALTER TABLE public.dealerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Dealerships Policies
DROP POLICY IF EXISTS "policy_dealerships_all" ON public.dealerships;
CREATE POLICY "policy_dealerships_all"
  ON public.dealerships
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Users Policies
DROP POLICY IF EXISTS "policy_users_all" ON public.users;
CREATE POLICY "policy_users_all"
  ON public.users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Leads Policies
DROP POLICY IF EXISTS "policy_leads_all" ON public.leads;
CREATE POLICY "policy_leads_all"
  ON public.leads
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- TABLE COMMENTS (Documentation)
-- ============================================

COMMENT ON TABLE public.dealerships IS 'Stores dealership business information and configuration';
COMMENT ON TABLE public.users IS 'Stores user authentication and profile data. Each user belongs to a dealership.';
COMMENT ON TABLE public.leads IS 'Stores all lead data with assignment tracking';

COMMENT ON COLUMN public.users.role IS 'ADMIN: System admin | DEALER_PRINCIPAL: Dealership owner | SALES_MANAGER: Sales team manager | SALES_EXECUTIVE: Sales person';
COMMENT ON COLUMN public.users.dealership_id IS 'Links user to their dealership. NULL for system admins.';
COMMENT ON COLUMN public.leads.assigned_dealer_id IS 'The dealership this lead is assigned to';
COMMENT ON COLUMN public.leads.assigned_user_id IS 'The specific user handling this lead';

-- ============================================
-- VERIFICATION QUERY
-- ============================================

SELECT
  'Migration completed successfully! ✅' AS status,
  '3 tables created (dealerships, users, leads)' AS tables,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('dealerships', 'users', 'leads')) AS table_count,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('dealerships', 'users', 'leads')) AS index_count,
  (SELECT COUNT(*) FROM pg_trigger WHERE tgrelid IN ('public.dealerships'::regclass, 'public.users'::regclass, 'public.leads'::regclass)) AS trigger_count;
