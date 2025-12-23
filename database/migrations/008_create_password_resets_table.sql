-- ============================================
-- Migration: 008 - Create Password Resets Table
-- Description: Store password reset tokens securely
-- Author: AutoLead SA Development Team
-- Date: 2025-12-22
-- ============================================
-- Purpose: Enable secure password reset functionality with token expiry
-- ============================================

-- ============================================
-- CREATE PASSWORD_RESETS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.password_resets (
  id TEXT PRIMARY KEY DEFAULT ('pr_' || substr(md5(random()::text), 1, 10)),

  -- Token & User Relationship
  token TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Token Status
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Fast token lookup
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON public.password_resets(token);

-- Fast user lookup
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON public.password_resets(user_id);

-- Clean up expired tokens query
CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON public.password_resets(expires_at);

-- Unused tokens only
CREATE INDEX IF NOT EXISTS idx_password_resets_unused ON public.password_resets(used) WHERE used = false;

-- ============================================
-- CREATE ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;

-- Allow all for development (refine for production)
DROP POLICY IF EXISTS "policy_password_resets_all" ON public.password_resets;
CREATE POLICY "policy_password_resets_all"
  ON public.password_resets
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- CREATE CLEANUP FUNCTION
-- ============================================

-- Function to clean up expired tokens (can be run via cron or manually)
CREATE OR REPLACE FUNCTION public.cleanup_expired_password_resets()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.password_resets
  WHERE expires_at < NOW() OR used = true;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE public.password_resets IS 'Stores password reset tokens with expiry. Tokens are single-use and expire after 1 hour.';
COMMENT ON FUNCTION public.cleanup_expired_password_resets() IS 'Removes expired or used password reset tokens. Run periodically to keep table clean.';

-- ============================================
-- VERIFICATION QUERY
-- ============================================

SELECT
  'Password resets table created successfully! ✅' AS status,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'password_resets') AS table_exists,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'password_resets') AS index_count;
