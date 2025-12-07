
import { supabase } from '../lib/supabaseClient';
import { Lead, Dealership, LeadStatus } from '../types';
import { NAAMSA_BRANDS, SA_REGIONS } from '../constants';

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
  },
  {
    id: 'd3',
    name: 'Ford Kempton Park',
    brand: 'Ford',
    region: 'Gauteng',
    contactPerson: 'Mike Botha',
    email: 'mike@fordkp.co.za',
    password: 'password123',
    status: 'Active',
    leadsAssigned: 45,
    billing: { plan: 'Standard', costPerLead: 350, credits: 0, totalSpent: 15750, lastBilledDate: '2023-10-01', currentUnbilledAmount: 700 }
  },
  {
    id: 'd4',
    name: 'Halfway Toyota Durban',
    brand: 'Toyota',
    region: 'KwaZulu-Natal',
    contactPerson: 'Suresh Naidoo',
    email: 'suresh@halfway.co.za',
    password: 'password123',
    status: 'Active',
    leadsAssigned: 156,
    billing: { plan: 'Enterprise', costPerLead: 150, credits: 0, totalSpent: 23400, lastBilledDate: '2023-10-01', currentUnbilledAmount: 0 }
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
  },
  {
    id: 'l3',
    brand: 'Ford',
    model: 'Ranger Raptor',
    source: 'AutoTrader Request',
    intentSummary: 'Requesting test drive availability for next week.',
    dateDetected: new Date(Date.now() - 172800000).toISOString().split('T')[0],
    status: LeadStatus.NEW,
    sentiment: 'HOT',
    region: 'Gauteng',
    contactName: 'Thabo Mbeki',
    contactPhone: '082 555 1234',
    assignedDealerId: 'd3',
    assignmentType: 'Direct'
  }
];

// --- HELPER: LOCAL STORAGE FALLBACK ---

const getLocalData = <T>(key: string, defaultData: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
    localStorage.setItem(key, JSON.stringify(defaultData));
    return defaultData;
  } catch (e) {
    return defaultData;
  }
};

const setLocalData = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error("Local Storage Error", e);
  }
};

// --- SERVICE METHODS ---

export const fetchLeads = async (): Promise<Lead[]> => {
  try {
    // Try Supabase first
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('dateDetected', { ascending: false });

    if (error) throw error;
    if (data && data.length > 0) return data as Lead[];
    
    // If Supabase returns empty (and we expect data) or fails, fall through
    throw new Error("No data or connection failed");
  } catch (error) {
    console.warn('Supabase unreachable, using local storage fallback for Leads.');
    return getLocalData('leads', MOCK_LEADS);
  }
};

export const createLead = async (lead: Lead) => {
  try {
    const { error } = await supabase.from('leads').insert([lead]);
    if (error) throw error;
  } catch (error) {
    // Fallback
    const current = getLocalData('leads', MOCK_LEADS);
    setLocalData('leads', [lead, ...current]);
  }
};

export const updateLead = async (id: string, updates: Partial<Lead>) => {
  try {
    const { error } = await supabase.from('leads').update(updates).eq('id', id);
    if (error) throw error;
  } catch (error) {
    // Fallback
    const current = getLocalData<Lead[]>('leads', MOCK_LEADS);
    const updated = current.map(l => l.id === id ? { ...l, ...updates } : l);
    setLocalData('leads', updated);
  }
};

// --- DEALERSHIPS ---

export const fetchDealers = async (): Promise<Dealership[]> => {
  try {
    const { data, error } = await supabase.from('dealerships').select('*');
    if (error) throw error;
    if (data && data.length > 0) return data as Dealership[];
    throw new Error("No data");
  } catch (error) {
    console.warn('Supabase unreachable, using local storage fallback for Dealers.');
    return getLocalData('dealers', MOCK_DEALERS);
  }
};

export const createDealer = async (dealer: Dealership) => {
  try {
    const { error } = await supabase.from('dealerships').insert([dealer]);
    if (error) throw error;
  } catch (error) {
     const current = getLocalData('dealers', MOCK_DEALERS);
     setLocalData('dealers', [...current, dealer]);
  }
};

export const updateDealer = async (id: string, updates: Partial<Dealership>) => {
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
  try {
    const { data, error } = await supabase
      .from('dealerships')
      .select('*')
      .ilike('email', email)
      .single();
      
    if (error) throw error;
    
    // Basic password check for Supabase DB row (Production would use supabase.auth)
    if (password && data.password && data.password !== password) {
       return null;
    }
    
    return data as Dealership;
  } catch (error) {
    // Fallback Auth
    const dealers = getLocalData('dealers', MOCK_DEALERS);
    const found = dealers.find(d => d.email.toLowerCase() === email.toLowerCase());
    
    if (found && password) {
       // If dealer has no password set (old mock data), allow any or default 'password123' check
       if (found.password && found.password !== password) return null;
       // If no password exists on record, we allow it (development mode) or check against default
       if (!found.password && password !== 'password123') return null; 
    }
    
    return found || null;
  }
};
