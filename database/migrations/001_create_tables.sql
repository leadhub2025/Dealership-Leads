-- ============================================
-- Migration: 001 - Create Core Tables
-- Description: Initial database schema for AutoLead SA
-- Author: System
-- Date: 2025-12-16
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Table: dealerships
-- Purpose: Store dealership accounts and profiles
-- ============================================
CREATE TABLE IF NOT EXISTS public.dealerships (
  -- Primary Key
  id TEXT PRIMARY KEY DEFAULT ('d_' || substr(md5(random()::text), 1, 10)),

  -- Basic Information
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  region TEXT NOT NULL,
  detailed_aor TEXT,

  -- Contact Information
  contact_person TEXT NOT NULL,

  -- Authentication
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, -- Hashed password (SHA-256)

  -- Account Status
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Active', 'Pending', 'Suspended')),

  -- Lead Management
  leads_assigned INTEGER DEFAULT 0,
  max_leads_capacity INTEGER DEFAULT 50,

  -- Billing Configuration (JSONB for flexibility)
  billing JSONB NOT NULL DEFAULT '{
    "plan": "Standard",
    "costPerLead": 350,
    "credits": 0,
    "totalSpent": 0,
    "lastBilledDate": "",
    "currentUnbilledAmount": 0
  }'::jsonb,

  -- Lead Preferences (JSONB for flexibility)
  preferences JSONB DEFAULT '{
    "vehicleConditions": ["New", "Used"],
    "minScore": 50
  }'::jsonb,

  -- Audit Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Table: leads
-- Purpose: Store all discovered leads and their status
-- ============================================
CREATE TABLE IF NOT EXISTS public.leads (
  -- Primary Key
  id TEXT PRIMARY KEY DEFAULT ('l_' || substr(md5(random()::text), 1, 10)),

  -- Vehicle Information
  brand TEXT NOT NULL,
  model TEXT NOT NULL,

  -- Lead Source
  source TEXT NOT NULL,
  intent_summary TEXT NOT NULL,
  date_detected TEXT NOT NULL,

  -- Status & Sentiment
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'ARCHIVED')),
  sentiment TEXT,
  potential_value TEXT,
  region TEXT NOT NULL,
  grounding_url TEXT,

  -- Contact Details
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,

  -- Context
  context_dealer TEXT,

  -- Assignment
  assigned_dealer_id TEXT REFERENCES public.dealerships(id) ON DELETE SET NULL,
  assignment_type TEXT CHECK (assignment_type IN ('Direct', 'Fallback', 'National')),

  -- Follow-up Management
  follow_up_date TEXT,
  notes TEXT,

  -- Audit Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- COMMENTS for Documentation
-- ============================================
COMMENT ON TABLE public.dealerships IS 'Stores all dealership accounts with authentication and billing info';
COMMENT ON TABLE public.leads IS 'Stores all discovered leads from AI search with assignment tracking';

COMMENT ON COLUMN public.dealerships.status IS 'Account status: Pending (needs approval), Active (can use system), Suspended (temporarily blocked)';
COMMENT ON COLUMN public.dealerships.billing IS 'JSON object containing plan details, costs, and billing history';
COMMENT ON COLUMN public.leads.assignment_type IS 'How lead was assigned: Direct (exact match), Fallback (neighbor region), National (any region)';
