-- ============================================
-- Migration: 003 - Create Triggers
-- Description: Auto-update timestamps and data validation
-- Author: System
-- Date: 2025-12-16
-- ============================================

-- ============================================
-- FUNCTION: Update timestamp on row modification
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_updated_at_column() IS 'Automatically updates updated_at timestamp on row modification';

-- ============================================
-- TRIGGER: Auto-update dealerships.updated_at
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_dealerships_updated_at ON public.dealerships;

CREATE TRIGGER trigger_update_dealerships_updated_at
    BEFORE UPDATE ON public.dealerships
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TRIGGER trigger_update_dealerships_updated_at ON public.dealerships IS 'Updates updated_at timestamp when dealership record is modified';

-- ============================================
-- TRIGGER: Auto-update leads.updated_at
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_leads_updated_at ON public.leads;

CREATE TRIGGER trigger_update_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TRIGGER trigger_update_leads_updated_at ON public.leads IS 'Updates updated_at timestamp when lead record is modified';

-- ============================================
-- FUNCTION: Validate email format
-- ============================================
CREATE OR REPLACE FUNCTION public.validate_email()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format: %', NEW.email;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.validate_email() IS 'Validates email format before insert/update';

-- ============================================
-- TRIGGER: Validate dealership email
-- ============================================
DROP TRIGGER IF EXISTS trigger_validate_dealership_email ON public.dealerships;

CREATE TRIGGER trigger_validate_dealership_email
    BEFORE INSERT OR UPDATE OF email ON public.dealerships
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_email();

COMMENT ON TRIGGER trigger_validate_dealership_email ON public.dealerships IS 'Validates email format before inserting or updating dealership';
