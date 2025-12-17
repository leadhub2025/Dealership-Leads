
// ============================================
// Data Models for AutoLead SA
// Professional TypeScript interfaces with clear separation of concerns
// ============================================

export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  CONVERTED = 'CONVERTED',
  ARCHIVED = 'ARCHIVED'
}

export type UserRole = 'ADMIN' | 'DEALER_PRINCIPAL' | 'SALES_MANAGER' | 'SALES_EXECUTIVE';
export type UserStatus = 'Active' | 'Inactive' | 'Suspended';

// ============================================
// USER AUTHENTICATION MODELS
// ============================================

/**
 * Database User Model - Matches users table schema
 * Used for authentication and user management
 */
export interface DBUser {
  id: string;
  email: string;
  password?: string; // Only present during registration, never exposed after
  full_name: string;
  role: UserRole;
  dealership_id: string | null; // NULL for ADMIN users
  status: UserStatus;
  is_verified: boolean;
  last_login: string | null;
  login_count: number;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Frontend User Session Model
 * Used throughout the application for UI logic
 */
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  dealerId?: string | null; // Links to dealership
  avatar?: string;
}

export interface BillingProfile {
  plan: 'Standard' | 'Pro' | 'Enterprise';
  costPerLead: number; // e.g. 250 (ZAR)
  credits: number; // For pre-paid model
  totalSpent: number;
  lastBilledDate: string;
  currentUnbilledAmount: number;
}

// ============================================
// DEALERSHIP MODELS
// ============================================

/**
 * Dealership Model - Business data only (no authentication)
 * Authentication is handled by DBUser model
 */
export interface Dealership {
  id: string;
  name: string;
  brand: string;
  region: string;
  detailedAor?: string; // Specific towns or districts
  contactPerson?: string; // Optional reference (actual contact is in users table)
  phone?: string;
  address?: string;
  status: 'Active' | 'Pending' | 'Suspended';
  leadsAssigned: number;
  maxLeadsCapacity?: number; // Optional cap for distribution logic
  billing: BillingProfile;
  preferences?: {
    vehicleConditions: string[]; // ['New', 'Used', 'Demo']
    minScore: number; // 0-100
  };
  created_at?: string;
  updated_at?: string;
}

/**
 * Registration Payload - Combines dealership + user data
 * Used only during dealership registration flow
 */
export interface DealershipRegistration {
  // Dealership Info
  dealership: {
    name: string;
    brand: string;
    region: string;
    detailedAor?: string;
    phone?: string;
    address?: string;
  };
  // User Info (creates DEALER_PRINCIPAL user)
  user: {
    full_name: string;
    email: string;
    password: string;
    phone?: string;
  };
}

export interface Lead {
  id: string;
  brand: string;
  model: string;
  source: string;
  intentSummary: string;
  dateDetected: string;
  status: LeadStatus;
  sentiment?: string; // Added for Lead Scoring
  potentialValue?: string;
  region: string;
  groundingUrl?: string;
  // Contact Details
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  // Context
  contextDealer?: string; // The dealer associated with the finding (e.g. Competitor or Listing Owner)
  // Distribution
  assignedDealerId?: string; // ID of the dealer this lead was distributed to
  assignmentType?: 'Direct' | 'Fallback' | 'National'; // How the lead was routed
  // Reminders
  followUpDate?: string; // ISO String for scheduled reminder
  notes?: string; // Optional notes added by the user
}

export interface NaamsaBrand {
  id: string;
  name: string;
  tier: 'Volume' | 'Luxury' | 'Commercial';
}

export interface MarketInsight {
  topic: string;
  sentiment: string;
  summary: string;
  sources: Array<{ title: string; uri: string }>;
  // Extracted public info
  extractedContact?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  contextDealer?: string;
  sourcePlatform?: string; // e.g. "Facebook Group", "AutoTrader", "WhatsApp Community"
}

export type ViewState = 'DASHBOARD' | 'LEAD_FINDER' | 'MY_LEADS' | 'DEALER_NETWORK' | 'BILLING' | 'MARKETING' | 'POPIA_COMPLIANCE' | 'ONBOARDING' | 'ABOUT';
