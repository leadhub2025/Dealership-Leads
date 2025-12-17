-- ============================================
-- Migration: 005 - Create Users Table
-- Description: Separate authentication from dealership business data
-- Author: AutoLead SA Development Team
-- Date: 2025-12-16
-- ============================================
-- Purpose: Enable multiple users per dealership with role-based access
-- ============================================

-- ============================================
-- CREATE USERS TABLE
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
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Fast email lookup for login
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Fast dealership user queries
CREATE INDEX IF NOT EXISTS idx_users_dealership ON public.users(dealership_id) WHERE dealership_id IS NOT NULL;

-- Role-based filtering
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Active users only
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status) WHERE status = 'Active';

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_users_dealership_role ON public.users(dealership_id, role) WHERE status = 'Active';

-- ============================================
-- CREATE TRIGGERS
-- ============================================

-- Auto-update timestamp trigger
DROP TRIGGER IF EXISTS trigger_update_users_updated_at ON public.users;
CREATE TRIGGER trigger_update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Email validation trigger
DROP TRIGGER IF EXISTS trigger_validate_user_email ON public.users;
CREATE TRIGGER trigger_validate_user_email
    BEFORE INSERT OR UPDATE OF email ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_email();

-- ============================================
-- CREATE ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow all for development (refine for production)
DROP POLICY IF EXISTS "policy_users_all" ON public.users;
CREATE POLICY "policy_users_all"
  ON public.users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- REMOVE PASSWORD FROM DEALERSHIPS TABLE
-- ============================================
-- Note: Run this AFTER migrating existing dealerships to users table

-- Step 1: Uncomment after data migration
-- ALTER TABLE public.dealerships DROP COLUMN IF EXISTS password;
-- ALTER TABLE public.dealerships DROP COLUMN IF EXISTS email;

COMMENT ON TABLE public.users IS 'Stores user authentication and profile data. Each user belongs to a dealership and has a specific role.';
COMMENT ON COLUMN public.users.role IS 'ADMIN: System admin | DEALER_PRINCIPAL: Dealership owner | SALES_MANAGER: Sales team manager | SALES_EXECUTIVE: Sales person';
COMMENT ON COLUMN public.users.dealership_id IS 'Links user to their dealership. NULL for system admins.';

-- ============================================
-- VERIFICATION QUERY
-- ============================================

SELECT
  'Users table created successfully! ✅' AS status,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') AS users_table_exists,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'users') AS index_count,
  (SELECT COUNT(*) FROM pg_trigger WHERE tgrelid = 'public.users'::regclass) AS trigger_count;
