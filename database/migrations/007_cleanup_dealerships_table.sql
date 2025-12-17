-- ============================================
-- Migration: 007 - Cleanup Dealerships Table
-- Description: Remove authentication fields from dealerships table
-- Author: AutoLead SA Development Team
-- Date: 2025-12-16
-- ============================================
-- WARNING: Only run AFTER verifying migration 006 was successful
-- This will permanently remove email and password columns
-- ============================================

-- ============================================
-- REMOVE AUTHENTICATION COLUMNS
-- ============================================

-- Remove password column (authentication now in users table)
ALTER TABLE public.dealerships DROP COLUMN IF EXISTS password;

-- Remove email column (authentication now in users table)
ALTER TABLE public.dealerships DROP COLUMN IF EXISTS email;

-- Update contact_person to be nullable (user's name is now in users table)
ALTER TABLE public.dealerships ALTER COLUMN contact_person DROP NOT NULL;

-- ============================================
-- ADD HELPFUL COLUMNS
-- ============================================

-- Add primary contact user reference (optional)
ALTER TABLE public.dealerships ADD COLUMN IF NOT EXISTS primary_contact_user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.dealerships.primary_contact_user_id IS 'The main user contact for this dealership (usually DEALER_PRINCIPAL)';

-- ============================================
-- UPDATE INDEXES
-- ============================================

-- Remove old email index (no longer exists)
DROP INDEX IF EXISTS idx_dealerships_email;

-- Add index for primary contact lookup
CREATE INDEX IF NOT EXISTS idx_dealerships_primary_contact ON public.dealerships(primary_contact_user_id) WHERE primary_contact_user_id IS NOT NULL;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT
  'Cleanup completed! ✅' AS status,
  'Dealerships table now contains only business data' AS result,
  'Authentication is handled by users table' AS note,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'dealerships' AND column_name IN ('email', 'password')) AS auth_columns_remaining;
