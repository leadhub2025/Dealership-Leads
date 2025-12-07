
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
      // We need to update the dealer stats in DB too
      const newCount = (matchedDealer.leadsAssigned || 0) + 1;
      const newAmount = matchedDealer.billing.currentUnbilledAmount + matchedDealer.billing.costPerLead;
      
      updateDealer(matchedDealer.id, { 
        leadsAssigned: newCount,
        billing: { ...matchedDealer.billing, currentUnbilledAmount: newAmount }
      });
      
      // Update Local State for immediate UI feedback
      setDealers(prev => prev.map(d => d.id === matchedDealer!.id ? {
        ...d,
        leadsAssigned: newCount,
        billing: { ...d.billing, currentUnbilledAmount: newAmount }
      } : d));

      return { ...lead, assignedDealerId: matchedDealer.id, assignmentType };
    }
    return lead;
  };

  const handleAddLead = (lead: Lead) => {
    // 1. Determine Distribution locally
    const distributedLead = distributeLead(lead);
    
    // 2. Save to DB
    createLead(distributedLead).then(() => {
      setLeads(prev => [distributedLead, ...prev]);
    }).catch(err => {
      console.error("Failed to save lead", err);
      alert("Error: Lead could not be saved to database.");
    });

    // Return ID to notify LeadFinder
    return distributedLead.assignedDealerId;
  };

  const assignLeadToDealer = async (leadId: string, dealerId: string) => {
    // Find current lead to adjust counts if necessary
    const currentLead = leads.find(l => l.id === leadId);
    const oldDealerId = currentLead?.assignedDealerId;

    // Optimistic UI Update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, assignedDealerId: dealerId } : l));

    // DB Update
    try {
      await updateLead(leadId, { assignedDealerId: dealerId });
      
      // Update Dealer Counts in DB (Simplified for brevity - ideally transactional)
      const newDealer = dealers.find(d => d.id === dealerId);
      if (newDealer) {
         const newCount = (newDealer.leadsAssigned || 0) + 1;
         await updateDealer(dealerId, { leadsAssigned: newCount });
         
         // Local State Update
         setDealers(prev => prev.map(d => d.id === dealerId ? { ...d, leadsAssigned: newCount } : d));
      }

      if (oldDealerId) {
        const oldDealer = dealers.find(d => d.id === oldDealerId);
        if (oldDealer) {
          const reducedCount = Math.max(0, (oldDealer.leadsAssigned || 0) - 1);
          await updateDealer(oldDealerId, { leadsAssigned: reducedCount });
          
           // Local State Update
          setDealers(prev => prev.map(d => d.id === oldDealerId ? { ...d, leadsAssigned: reducedCount } : d));
        }
      }

    } catch (e) {
      console.error("Assignment failed", e);
    }
  };

  const updateLeadStatus = async (id: string, status: LeadStatus) => {
    // Optimistic Update
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    // DB Update
    await updateLead(id, { status });
  };

  const bulkUpdateLeadStatus = async (ids: string[], status: LeadStatus) => {
    setLeads(prev => prev.map(l => ids.includes(l.id) ? { ...l, status } : l));
    // DB Update (Batch)
    ids.forEach(id => updateLead(id, { status }));
  };

  const updateLeadContact = async (id: string, name: string, phone: string, email: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, contactName: name, contactPhone: phone, contactEmail: email } : l));
    await updateLead(id, { contactName: name, contactPhone: phone, contactEmail: email });
  };

  const scheduleFollowUp = async (id: string, date: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, followUpDate: date } : l));
    await updateLead(id, { followUpDate: date });
  };

  // --- Role Based Data Filtering ---
  // Dealers (of all levels) only see their own leads. Admin sees all.
  const isDealerRole = currentUser && ['DEALER_PRINCIPAL', 'SALES_MANAGER', 'SALES_EXECUTIVE'].includes(currentUser.role);
  
  const visibleLeads = isDealerRole 
      ? leads.filter(l => l.assignedDealerId === currentUser?.dealerId)
      : leads;

  // Dealers only see their own dealer details in lists/dropdowns
  const visibleDealers = isDealerRole
     ? dealers.filter(d => d.id === currentUser?.dealerId)
     : dealers;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>}>
        <Login 
          dealers={dealers} 
          onLogin={setCurrentUser} 
          onSignUpClick={() => setView('ONBOARDING')}
        />
        {currentView === 'ONBOARDING' && (
           <div className="fixed inset-0 z-50 bg-slate-950">
              <Onboarding onComplete={handleSignUp} onCancel={() => setView('DASHBOARD')} />
           </div>
        )}
      </Suspense>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        setView={setView} 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
           <div className="flex items-center gap-3">
              <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-400">
                 <Menu className="w-6 h-6" />
              </button>
              <Logo className="w-6 h-6" showText={false} />
              <span className="font-bold">AutoLead SA</span>
           </div>
           <img 
              src={currentUser.avatar || `https://ui-avatars.com/api/?name=${currentUser.name}`} 
              className="w-8 h-8 rounded-full border border-slate-600"
              alt="Profile"
           />
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
           <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                 <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              </div>
           }>
              {currentView === 'DASHBOARD' && (
                 <Dashboard leads={visibleLeads} dealers={visibleDealers} />
              )}
              {currentView === 'LEAD_FINDER' && (
                 <LeadFinder 
                    onAddLead={handleAddLead} 
                    leads={leads} 
                    onUpdateLead={updateLeadContact}
                    dealers={dealers}
                 />
              )}
              {currentView === 'MY_LEADS' && (
                 <LeadList 
                    leads={visibleLeads} 
                    dealers={visibleDealers}
                    updateStatus={updateLeadStatus}
                    bulkUpdateStatus={bulkUpdateLeadStatus}
                    updateContact={updateLeadContact}
                    assignDealer={assignLeadToDealer}
                    scheduleFollowUp={scheduleFollowUp}
                    onRefresh={loadData}
                 />
              )}
              {currentView === 'DEALER_NETWORK' && (
                 <DealerNetwork 
                    dealers={dealers} 
                    onAddDealer={registerDealership} 
                    onUpdateDealer={handleUpdateDealership}
                    onOpenOnboarding={() => setView('ONBOARDING')}
                 />
              )}
              {currentView === 'BILLING' && (
                 <Billing dealers={currentUser.role === 'ADMIN' ? dealers : visibleDealers} leads={leads} />
              )}
              {currentView === 'MARKETING' && <Marketing />}
              {currentView === 'POPIA_COMPLIANCE' && <Compliance />}
              {currentView === 'ABOUT' && <About />}
              
              {/* Modal overlay for onboarding if triggered from internal menu */}
              {currentView === 'ONBOARDING' && (
                 <div className="fixed inset-0 z-50 bg-slate-950">
                    <Onboarding onComplete={handleSignUp} onCancel={() => setView('DEALER_NETWORK')} />
                 </div>
              )}
           </Suspense>
        </main>
      </div>
    </div>
  );
};

export default App;
