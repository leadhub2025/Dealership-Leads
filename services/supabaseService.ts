
import { supabase, isDemoMode } from '../lib/supabaseClient';
import { Lead, Dealership, LeadStatus } from '../types';

// --- MOCK DATA FOR OFFLINE/DEMO MODE ---
const MOCK_DEALERS: Dealership[] = [
  {
    id: 'd1',
    name: 'McCarthy Toyota Centurion',
    brand: 'Toyota',
    region: 'Gauteng',
    contactPerson: 'Johan Smit',
    email: 'johan@mccarthy.co.za',
    password: 'password123',
    status: 'Active',
    leadsAssigned: 124,
    billing: { plan: 'Enterprise', costPerLead: 150, credits: 5000, totalSpent: 18600, lastBilledDate: '2023-10-01', currentUnbilledAmount: 450 }
  },
  {
    id: 'd2',
    name: 'Barons VW Woodmead',
    brand: 'Volkswagen',
    region: 'Gauteng',
    contactPerson: 'Sarah Jones',
    email: 'sarah@barons.co.za',
    password: 'password123',
    status: 'Active',
    leadsAssigned: 89,
    billing: { plan: 'Pro', costPerLead: 250, credits: 0, totalSpent: 22250, lastBilledDate: '2023-10-01', currentUnbilledAmount: 1250 }
  }
];

const MOCK_LEADS: Lead[] = [
  {
    id: 'l1',
    brand: 'Toyota',
    model: 'Hilux 2.8 GD-6',
    source: 'Facebook Marketplace',
    intentSummary: 'Looking for a 2021+ double cab, white, low mileage.',
    dateDetected: new Date().toISOString().split('T')[0],
    status: LeadStatus.NEW,
    sentiment: 'HOT',
    region: 'Gauteng',
    groundingUrl: 'https://facebook.com',
    contactName: 'Piet Pompies',
    assignedDealerId: 'd1',
    assignmentType: 'Direct',
    contextDealer: 'Private Seller'
  },
  {
    id: 'l2',
    brand: 'Volkswagen',
    model: 'Polo GTI',
    source: '4x4 Community Forum',
    intentSummary: 'Asking about financing options for a new GTI.',
    dateDetected: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    status: LeadStatus.CONTACTED,
    sentiment: 'Warm',
    region: 'Gauteng',
    groundingUrl: 'https://4x4community.co.za',
    assignedDealerId: 'd2',
    assignmentType: 'Direct'
  }
];

// --- HELPER: LOCAL STORAGE FALLBACK ---

const getLocalData = <T>(key: string, defaultData: T): T => {
  try {
    const saved = localStorage.getItem(`autolead_${key}`);
    if (saved) return JSON.parse(saved);
    localStorage.setItem(`autolead_${key}`, JSON.stringify(defaultData));
    return defaultData;
  } catch (e) {
    return defaultData;
  }
};

const setLocalData = (key: string, data: any) => {
  try {
    localStorage.setItem(`autolead_${key}`, JSON.stringify(data));
  } catch (e) {
    console.error("Local Storage Error", e);
  }
};

// --- SERVICE METHODS ---

export const fetchLeads = async (): Promise<Lead[]> => {
  // 1. Force Local Mode if Demo/Offline
  if (isDemoMode) {
    console.log("App in Demo Mode - using local mock data for leads.");
    return getLocalData('leads', MOCK_LEADS);
  }

  // 2. Attempt Supabase
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('dateDetected', { ascending: false });

    if (error) throw error;
    
    if (data) return data as Lead[];
    return [];
  } catch (error) {
    console.warn("Supabase fetch failed, falling back to local data", error);
    return getLocalData('leads', MOCK_LEADS);
  }
};

export const createLead = async (lead: Lead) => {
  if (isDemoMode) {
    const current = getLocalData('leads', MOCK_LEADS);
    setLocalData('leads', [lead, ...current]);
    return;
  }

  try {
    const { error } = await supabase.from('leads').insert([lead]);
    if (error) throw error;
  } catch (error) {
    console.error("Create Lead Error", error);
    const current = getLocalData('leads', MOCK_LEADS);
    setLocalData('leads', [lead, ...current]);
  }
};

export const updateLead = async (id: string, updates: Partial<Lead>) => {
  if (isDemoMode) {
    const current = getLocalData<Lead[]>('leads', MOCK_LEADS);
    const updated = current.map(l => l.id === id ? { ...l, ...updates } : l);
    setLocalData('leads', updated);
    return;
  }

  try {
    const { error } = await supabase.from('leads').update(updates).eq('id', id);
    if (error) throw error;
  } catch (error) {
    const current = getLocalData<Lead[]>('leads', MOCK_LEADS);
    const updated = current.map(l => l.id === id ? { ...l, ...updates } : l);
    setLocalData('leads', updated);
  }
};

// --- DEALERSHIPS ---

export const fetchDealers = async (): Promise<Dealership[]> => {
  if (isDemoMode) {
    return getLocalData('dealers', MOCK_DEALERS);
  }

  try {
    const { data, error } = await supabase.from('dealerships').select('*');
    if (error) throw error;
    if (data) return data as Dealership[];
    return [];
  } catch (error) {
    console.warn("Fetch Dealers Error", error);
    return getLocalData('dealers', MOCK_DEALERS);
  }
};

export const createDealer = async (dealer: Dealership) => {
  if (isDemoMode) {
     const current = getLocalData<Dealership[]>('dealers', MOCK_DEALERS);
     const filtered = current.filter(d => d.email.toLowerCase() !== dealer.email.toLowerCase());
     setLocalData('dealers', [...filtered, dealer]);
     return;
  }

  try {
    const { error } = await supabase.from('dealerships').insert([dealer]);
    if (error) {
        console.error("Supabase Create Dealer Error:", error);
        throw error;
    }
  } catch (error) {
     const current = getLocalData<Dealership[]>('dealers', MOCK_DEALERS);
     const filtered = current.filter(d => d.email.toLowerCase() !== dealer.email.toLowerCase());
     setLocalData('dealers', [...filtered, dealer]);
  }
};

export const updateDealer = async (id: string, updates: Partial<Dealership>) => {
  if (isDemoMode) {
    const current = getLocalData<Dealership[]>('dealers', MOCK_DEALERS);
    const updated = current.map(d => d.id === id ? { ...d, ...updates } : d);
    setLocalData('dealers', updated);
    return;
  }

  try {
    const { error } = await supabase.from('dealerships').update(updates).eq('id', id);
    if (error) throw error;
  } catch (error) {
    const current = getLocalData<Dealership[]>('dealers', MOCK_DEALERS);
    const updated = current.map(d => d.id === id ? { ...d, ...updates } : d);
    setLocalData('dealers', updated);
  }
};

// --- AUTH HELPER ---

export const signInDealer = async (email: string, password?: string) => {
  // 1. Check Local Data First 
  const dealers = getLocalData<Dealership[]>('dealers', MOCK_DEALERS);
  const localUser = dealers.find(d => d.email.toLowerCase() === email.toLowerCase());
  
  if (isDemoMode && localUser) {
      if (localUser.password && password) {
          if (localUser.password === password) return localUser;
      } else if (password === 'password123') {
          return localUser;
      }
      return null;
  }

  // 2. Attempt Supabase Auth 
  try {
    const { data, error } = await supabase
      .from('dealerships')
      .select('*')
      .ilike('email', email)
      .maybeSingle(); 
      
    if (error) {
        console.error("Supabase Login Query Error:", error);
        throw error;
    }
    
    if (data) {
        if (data.password && password && data.password !== password) return null;
        return data as Dealership;
    } 
  } catch (error) {
    console.error("Login Exception:", error);
  }
  
  // Fallback to local 
  if (localUser) {
       if (localUser.password && password) {
          if (localUser.password === password) return localUser;
      } else if (password === 'password123') {
          return localUser;
      }
  }
  
  return null;
};
