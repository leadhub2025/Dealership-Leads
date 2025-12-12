
import { supabase } from '../lib/supabaseClient';
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
    id: 'l_manual_added',
    brand: 'Ford',
    model: '2022 Ranger Wildtrak',
    source: 'Facebook Marketplace',
    intentSummary: '2022 Ford Ranger Wildtrak - Private Sale',
    dateDetected: new Date().toISOString(),
    status: LeadStatus.NEW,
    sentiment: 'HOT',
    region: 'Gauteng',
    groundingUrl: 'https://www.facebook.com/marketplace',
    contactName: 'Private Seller',
    assignedDealerId: 'd3',
    assignmentType: 'Direct',
    contextDealer: 'Private Seller'
  },
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
  },
  {
    id: 'l4',
    brand: 'Kia',
    model: 'Sportage',
    source: 'Online Inquiry',
    intentSummary: 'Looking for a family SUV with good fuel economy',
    dateDetected: new Date().toISOString().split('T')[0],
    status: LeadStatus.NEW,
    sentiment: 'Warm',
    region: 'Western Cape',
    groundingUrl: '#',
    contactName: 'Aisha Khan',
    contactEmail: 'aisha.k@example.com',
    contactPhone: '081 555 9876',
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
    // Check if online before trying supabase to avoid timeout lag
    if (!navigator.onLine) throw new Error("Offline");

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('dateDetected', { ascending: false });

    if (error) throw error;
    if (data && data.length > 0) return data as Lead[];
    
    throw new Error("No data or connection failed");
  } catch (error) {
    // Info log instead of warning for cleaner console in Demo Mode
    return getLocalData('leads', MOCK_LEADS);
  }
};

export const createLead = async (lead: Lead) => {
  try {
    const { error } = await supabase.from('leads').insert([lead]);
    if (error) throw error;
  } catch (error) {
    const current = getLocalData('leads', MOCK_LEADS);
    setLocalData('leads', [lead, ...current]);
  }
};

export const updateLead = async (id: string, updates: Partial<Lead>) => {
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
  try {
    if (!navigator.onLine) throw new Error("Offline");

    const { data, error } = await supabase.from('dealerships').select('*');
    if (error) throw error;
    if (data && data.length > 0) return data as Dealership[];
    throw new Error("No data");
  } catch (error) {
    return getLocalData('dealers', MOCK_DEALERS);
  }
};

export const createDealer = async (dealer: Dealership) => {
  try {
    const { error } = await supabase.from('dealerships').insert([dealer]);
    if (error) throw error;
  } catch (error) {
     // Local Storage Fallback:
     const current = getLocalData<Dealership[]>('dealers', MOCK_DEALERS);
     
     // IMPORTANT: Remove any existing dealer with the same email to allow overwriting (re-registration)
     // This ensures the NEW password is used, not the old one.
     const filtered = current.filter(d => d.email.toLowerCase() !== dealer.email.toLowerCase());
     
     // Add the new dealer to the START of the array so .find() matches it first
     setLocalData('dealers', [dealer, ...filtered]);
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
    // Attempt Supabase Login first
    if (!navigator.onLine) throw new Error("Offline");

    const { data, error } = await supabase
      .from('dealerships')
      .select('*')
      .ilike('email', email)
      .single();
      
    if (error) throw error;
    
    if (password && data.password && data.password !== password) {
       return null;
    }
    
    return data as Dealership;
  } catch (error) {
    // Fallback Auth (Local Storage)
    const dealers = getLocalData<Dealership[]>('dealers', MOCK_DEALERS);
    const found = dealers.find(d => d.email.toLowerCase() === email.toLowerCase());
    
    if (found) {
       // Case 1: User has a specific password set (New Registrations)
       if (found.password) {
           if (password && found.password === password) {
               return found;
           }
           return null; // Password mismatch
       }
       
       // Case 2: Mock Data User (Default password)
       if (!found.password && password === 'password123') {
           return found;
       }
    }
    
    return null;
  }
};
