-- ============================================
-- Migration: 004 - Row Level Security Policies
-- Description: Setup RLS for data access control
-- Author: System
-- Date: 2025-12-16
-- ============================================

-- ============================================
-- ENABLE Row Level Security
-- ============================================
ALTER TABLE public.dealerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DEALERSHIPS Table Policies
-- ============================================

-- Policy: Allow all operations (for development)
-- TODO: Refine these policies for production
DROP POLICY IF EXISTS "policy_dealerships_all" ON public.dealerships;

CREATE POLICY "policy_dealerships_all"
  ON public.dealerships
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "policy_dealerships_all" ON public.dealerships IS 'Temporary policy allowing all operations - refine for production';

-- ============================================
-- LEADS Table Policies
-- ============================================

-- Policy: Allow all operations (for development)
-- TODO: Refine these policies for production
DROP POLICY IF EXISTS "policy_leads_all" ON public.leads;

CREATE POLICY "policy_leads_all"
  ON public.leads
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "policy_leads_all" ON public.leads IS 'Temporary policy allowing all operations - refine for production';

-- ============================================
-- PRODUCTION-READY POLICY EXAMPLES (commented out)
-- Uncomment and modify when ready for production
-- ============================================

/*
-- Example: Dealers can only see their own leads
CREATE POLICY "policy_leads_select_own"
  ON public.leads
  FOR SELECT
  USING (
    assigned_dealer_id = current_setting('app.current_dealer_id', true)
  );

-- Example: Only active dealers can insert
CREATE POLICY "policy_dealerships_insert_active"
  ON public.dealerships
  FOR INSERT
  WITH CHECK (
    status = 'Active'
  );

-- Example: Admins can see all data
CREATE POLICY "policy_admin_access"
  ON public.dealerships
  FOR ALL
  USING (
    current_setting('app.user_role', true) = 'ADMIN'
  );
*/
