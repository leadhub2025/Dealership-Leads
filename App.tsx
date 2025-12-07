
import React, { useState, useEffect, Suspense, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import { ViewState, Lead, LeadStatus, Dealership, User } from './types';
import { Menu, Loader2 } from 'lucide-react';
import { REGION_ADJACENCY } from './constants';
import { fetchLeads, fetchDealers, createLead, updateLead, createDealer, updateDealer } from './services/supabaseService';
import { Logo } from './components/Logo';

// --- Lazy Load Components for Performance ---
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const LeadFinder = React.lazy(() => import('./components/LeadFinder'));
const LeadList = React.lazy(() => import('./components/LeadList'));
const DealerNetwork = React.lazy(() => import('./components/DealerNetwork'));
const Billing = React.lazy(() => import('./components/Billing'));
const Compliance = React.lazy(() => import('./components/Compliance'));
const Onboarding = React.lazy(() => import('./components/Onboarding'));
const Marketing = React.lazy(() => import('./components/Marketing'));
const About = React.lazy(() => import('./components/About'));
const Login = React.lazy(() => import('./components/Login'));

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setView] = useState<ViewState>('DASHBOARD');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // --- State Management (Now sourced from DB) ---
  const [dealers, setDealers] = useState<Dealership[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);

  // --- Data Fetching Logic ---
  const loadData = useCallback(async () => {
    // We don't set global loading true here to allow background refreshes
    try {
      const [loadedLeads, loadedDealers] = await Promise.all([
        fetchLeads(),
        fetchDealers()
      ]);
      setLeads(loadedLeads);
      setDealers(loadedDealers);
    } catch (error) {
      console.error("Failed to load data", error);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    };
    init();
  }, [currentUser, loadData]); // Reload when user logs in


  // --- Dealer Logic ---
  const registerDealership = async (dealer: Dealership) => {
    try {
      await createDealer(dealer);
      setDealers(prev => [...prev, dealer]);
    } catch (e) {
      console.error("Failed to register dealer", e);
      alert("Database Error: Could not register dealer.");
    }
  };

  const handleUpdateDealership = async (updatedDealer: Dealership) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...updates } = updatedDealer;
      await updateDealer(updatedDealer.id, updates);
      setDealers(prev => prev.map(d => d.id === updatedDealer.id ? updatedDealer : d));
    } catch (e) {
      console.error("Failed to update dealer", e);
    }
  };

  // Handle Sign Up completion for new users (Public Flow)
  const handleSignUp = async (dealer: Dealership) => {
    setLoading(true);
    try {
       // 1. Register the dealer in DB
       const dealerWithBilling = {
        ...dealer,
        billing: dealer.billing || {
          plan: 'Standard',
          costPerLead: 350,
          credits: 0,
          totalSpent: 0,
          lastBilledDate: new Date().toISOString().split('T')[0],
          currentUnbilledAmount: 0
        }
      } as Dealership;
      
      await createDealer(dealerWithBilling);
      setDealers(prev => [...prev, dealerWithBilling]);

      // 2. Create a user session for them (Auto Login as Principal)
      const newUser: User = {
        id: `user-${dealerWithBilling.id}`,
        name: dealerWithBilling.contactPerson,
        email: dealerWithBilling.email,
        role: 'DEALER_PRINCIPAL', // Default for new signups
        dealerId: dealerWithBilling.id,
        avatar: `https://i.pravatar.cc/150?u=${dealerWithBilling.id}`
      };
      
      setCurrentUser(newUser);
      setView('DASHBOARD');
    } catch (e) {
      console.error("Signup failed", e);
      alert("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('DASHBOARD');
  };

  // --- Lead Distribution Logic ---
  const distributeLead = (lead: Lead): Lead => {
    const dealerRoles = ['DEALER_PRINCIPAL', 'SALES_MANAGER', 'SALES_EXECUTIVE'];
    // If a Dealer User is adding a lead manually via Lead Finder, assign to themselves automatically
    if (currentUser && dealerRoles.includes(currentUser.role) && currentUser.dealerId) {
       return { ...lead, assignedDealerId: currentUser.dealerId, assignmentType: 'Direct' };
    }

    const normalizedBrand = lead.brand.toLowerCase();
    const normalizedRegion = lead.region.toLowerCase();
    let assignmentType: 'Direct' | 'Fallback' | 'National' = 'Direct';

    // Helper: Filter dealers who have hit their capacity
    const filterAvailableDealers = (list: Dealership[]) => {
      return list.filter(d => 
        d.status === 'Active' && 
        (!d.maxLeadsCapacity || (d.leadsAssigned || 0) < d.maxLeadsCapacity)
      );
    };

    // Helper: Prioritization Logic (Enterprise > Pro > Standard, then fewest leads)
    const pickBestDealer = (candidates: Dealership[]) => {
        const available = filterAvailableDealers(candidates);
        if (available.length === 0) return null;
        
        return available.sort((a, b) => {
          // 1. Priority by Plan Tier (Rule Override)
          const planWeight = { 'Enterprise': 3, 'Pro': 2, 'Standard': 1 };
          const weightA = planWeight[a.billing.plan] || 0;
          const weightB = planWeight[b.billing.plan] || 0;
          
          if (weightA !== weightB) return weightB - weightA; // Higher weight first

          // 2. Load Balancing (Fewest leads first)
          return (a.leadsAssigned || 0) - (b.leadsAssigned || 0);
        })[0];
    };

    // 1. Primary: Exact Match (Brand + Region)
    let candidates = dealers.filter(d => 
      d.brand.toLowerCase() === normalizedBrand && 
      d.region.toLowerCase() === normalizedRegion
    );
    let matchedDealer = pickBestDealer(candidates);

    // 2. Secondary: Nearest Neighboring Region (Same Brand)
    if (!matchedDealer) {
       assignmentType = 'Fallback';
       const neighbors = REGION_ADJACENCY[lead.region] || [];
       
       // Iterate neighbors in priority order
       for (const neighbor of neighbors) {
          candidates = dealers.filter(d => 
            d.brand.toLowerCase() === normalizedBrand && 
            d.region.toLowerCase() === neighbor.toLowerCase()
          );
          matchedDealer = pickBestDealer(candidates);
          if (matchedDealer) break; // Stop at first valid neighbor region
       }
    }

    // 3. Tertiary: National Fallback (Any dealer of same brand)
    if (!matchedDealer) {
       assignmentType = 'National';
       candidates = dealers.filter(d => d.brand.toLowerCase() === normalizedBrand);
       matchedDealer = pickBestDealer(candidates);
    }

    if (matchedDealer) {
      