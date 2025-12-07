
// Data Models for AutoLead SA

export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  CONVERTED = 'CONVERTED',
  ARCHIVED = 'ARCHIVED'
}

export type UserRole = 'ADMIN' | 'DEALER_PRINCIPAL' | 'SALES_MANAGER' | 'SALES_EXECUTIVE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  dealerId?: string; // If role is a DEALER role, this links to the specific dealership
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

export interface Dealership {
  id: string;
  name: string;
  brand: string;
  region: string;
  detailedAor?: string; // Specific towns or districts
  contactPerson: string;
  email: string;
  password?: string; // Added for registration flow
  status: 'Active' | 'Pending';
  leadsAssigned: number;
  maxLeadsCapacity?: number; // Optional cap for distribution logic
  billing: BillingProfile;
  preferences?: {
    vehicleConditions: string[]; // ['New', 'Used', 'Demo']
    minScore: number; // 0-100
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
