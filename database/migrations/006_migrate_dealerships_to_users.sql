-- ============================================
-- Migration: 006 - Migrate Dealerships to Users
-- Description: One-time migration to move auth data from dealerships to users
-- Author: AutoLead SA Development Team
-- Date: 2025-12-16
-- ============================================
-- WARNING: Only run this if you have existing dealerships with credentials
-- For fresh installations, skip this migration
-- ============================================

-- ============================================
-- MIGRATE EXISTING DEALERSHIPS TO USERS
-- ============================================

-- Create a user for each existing dealership
INSERT INTO public.users (
  email,
  password,
  full_name,
  role,
  dealership_id,
  status,
  is_verified,
  created_at
)
SELECT
  d.email,
  d.password,
  d.contact_person,
  -- Assign role based on email pattern (can be updated later)
  CASE
    WHEN LOWER(d.email) LIKE '%admin%' OR LOWER(d.email) = 'owner@autoleadsa.co.za' THEN 'ADMIN'
    WHEN LOWER(d.email) LIKE '%manager%' THEN 'SALES_MANAGER'
    WHEN LOWER(d.email) LIKE '%sales%' THEN 'SALES_EXECUTIVE'
    ELSE 'DEALER_PRINCIPAL'
  END,
  d.id,
  CASE
    WHEN d.status = 'Active' THEN 'Active'
    WHEN d.status = 'Suspended' THEN 'Suspended'
    ELSE 'Inactive'
  END,
  true, -- Existing accounts are verified
  d.created_at
FROM public.dealerships d
WHERE d.email IS NOT NULL AND d.password IS NOT NULL
ON CONFLICT (email) DO NOTHING; -- Skip if user already exists

-- ============================================
-- VERIFICATION
-- ============================================

SELECT
  'Migration completed! ✅' AS status,
  (SELECT COUNT(*) FROM public.dealerships WHERE email IS NOT NULL) AS dealerships_with_email,
  (SELECT COUNT(*) FROM public.users) AS users_created,
  'Review users table and then run cleanup migration to remove email/password from dealerships' AS next_step;
