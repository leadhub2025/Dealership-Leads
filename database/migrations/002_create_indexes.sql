-- ============================================
-- Migration: 002 - Create Performance Indexes
-- Description: Add indexes for query optimization
-- Author: System
-- Date: 2025-12-16
-- ============================================

-- ============================================
-- INDEXES for dealerships table
-- ============================================

-- Authentication & Lookup
CREATE INDEX IF NOT EXISTS idx_dealerships_email
  ON public.dealerships(email);

CREATE INDEX IF NOT EXISTS idx_dealerships_status
  ON public.dealerships(status)
  WHERE status = 'Active';

-- Lead Distribution
CREATE INDEX IF NOT EXISTS idx_dealerships_brand
  ON public.dealerships(brand);

CREATE INDEX IF NOT EXISTS idx_dealerships_region
  ON public.dealerships(region);

CREATE INDEX IF NOT EXISTS idx_dealerships_brand_region
  ON public.dealerships(brand, region)
  WHERE status = 'Active';

-- Audit & Reporting
CREATE INDEX IF NOT EXISTS idx_dealerships_created
  ON public.dealerships(created_at DESC);

-- ============================================
-- INDEXES for leads table
-- ============================================

-- Status Management
CREATE INDEX IF NOT EXISTS idx_leads_status
  ON public.leads(status);

-- Assignment Queries
CREATE INDEX IF NOT EXISTS idx_leads_assigned_dealer
  ON public.leads(assigned_dealer_id)
  WHERE assigned_dealer_id IS NOT NULL;

-- Search & Filtering
CREATE INDEX IF NOT EXISTS idx_leads_brand
  ON public.leads(brand);

CREATE INDEX IF NOT EXISTS idx_leads_region
  ON public.leads(region);

CREATE INDEX IF NOT EXISTS idx_leads_brand_region
  ON public.leads(brand, region);

-- Date Queries
CREATE INDEX IF NOT EXISTS idx_leads_date_detected
  ON public.leads(date_detected DESC);

CREATE INDEX IF NOT EXISTS idx_leads_created
  ON public.leads(created_at DESC);

-- Follow-up Management
CREATE INDEX IF NOT EXISTS idx_leads_follow_up
  ON public.leads(follow_up_date)
  WHERE follow_up_date IS NOT NULL AND status NOT IN ('CONVERTED', 'ARCHIVED');

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON INDEX idx_dealerships_brand_region IS 'Composite index for fast lead distribution queries';
COMMENT ON INDEX idx_leads_follow_up IS 'Partial index for active leads with scheduled follow-ups';
