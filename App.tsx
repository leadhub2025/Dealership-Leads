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
  const [showOnboarding, setShowOnboarding] = useState(false);

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
        avatar: `https://ui-avatars.com/api/?name=${dealerWithBilling.id}`
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
      return { 
        ...lead, 
        assignedDealerId: matchedDealer.id, 
        assignmentType: assignmentType 
      };
    }

    // No dealer found - keep unassigned
    return lead;
  };

  const handleAddLead = (lead: Lead) => {
    // 1. Run Distribution Logic
    const distributedLead = distributeLead(lead);

    // 2. Optimistic UI Update
    setLeads(prev => [distributedLead, ...prev]);

    // 3. DB Persist
    createLead(distributedLead).then(() => {
       // 4. Update Dealer Stats if assigned
       if (distributedLead.assignedDealerId) {
          const dealer = dealers.find(d => d.id === distributedLead.assignedDealerId);
          if (dealer) {
             const newCount = (dealer.leadsAssigned || 0) + 1;
             const newBill = dealer.billing.currentUnbilledAmount + dealer.billing.costPerLead;
             const newTotal = dealer.billing.totalSpent + dealer.billing.costPerLead;
             
             handleUpdateDealership({
                ...dealer,
                leadsAssigned: newCount,
                billing: {
                   ...dealer.billing,
                   currentUnbilledAmount: newBill,
                   totalSpent: newTotal
                }
             });
          }
       }
    });

    return distributedLead.assignedDealerId;
  };

  const handleUpdateLeadStatus = async (id: string, status: LeadStatus) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    await updateLead(id, { status });
  };
  
  const handleBulkUpdateLeadStatus = async (ids: string[], status: LeadStatus) => {
    setLeads(prev => prev.map(l => ids.includes(l.id) ? { ...l, status } : l));
    // Supabase naive implementation loop (in prod use 'in' query)
    for (const id of ids) {
       await updateLead(id, { status });
    }
  };

  const handleUpdateLeadContact = async (id: string, name: string, phone: string, email: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, contactName: name, contactPhone: phone, contactEmail: email } : l));
    await updateLead(id, { contactName: name, contactPhone: phone, contactEmail: email });
  };

  const handleAssignDealer = async (leadId: string, dealerId: string) => {
    const lead = leads.find(l => l.id === leadId);
    const oldDealerId = lead?.assignedDealerId;
    
    // Update Lead UI
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, assignedDealerId: dealerId, assignmentType: 'Direct' } : l));
    
    // Update DB
    await updateLead(leadId, { assignedDealerId: dealerId, assignmentType: 'Direct' });

    // Update Dealer Counts
    // Decrement old
    if (oldDealerId) {
       const oldD = dealers.find(d => d.id === oldDealerId);
       if (oldD) handleUpdateDealership({ ...oldD, leadsAssigned: Math.max(0, (oldD.leadsAssigned || 0) - 1) });
    }
    // Increment new
    const newD = dealers.find(d => d.id === dealerId);
    if (newD) handleUpdateDealership({ ...newD, leadsAssigned: (newD.leadsAssigned || 0) + 1 });
  };

  const handleScheduleFollowUp = async (id: string, date: string) => {
     setLeads(prev => prev.map(l => l.id === id ? { ...l, followUpDate: date } : l));
     await updateLead(id, { followUpDate: date });
  };

  // --- Views ---

  if (loading) {
     return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
           <Logo className="w-16 h-16 mb-6" />
           <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
           <p className="text-slate-400">Connecting to AutoLead Secure Cloud...</p>
        </div>
     );
  }

  if (showOnboarding) {
     return (
       <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}>
         <Onboarding 
            onComplete={(d) => {
               handleSignUp(d);
               setShowOnboarding(false);
            }}
            onCancel={() => setShowOnboarding(false)}
         />
       </Suspense>
     );
  }

  if (!currentUser) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}>
        <Login 
          dealers={dealers} 
          onLogin={(user) => setCurrentUser(user)} 
          onSignUpClick={() => setShowOnboarding(true)}
        />
      </Suspense>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden text-slate-200 font-sans">
      <Sidebar 
        currentView={currentView} 
        setView={setView} 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header */}
        <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
             <button onClick={() => setIsMobileMenuOpen(true)} className="text-white">
               <Menu className="w-6 h-6" />
             </button>
             <Logo className="w-8 h-8" showText={false} />
             <span className="font-bold text-white">AutoLead SA</span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            <Suspense fallback={
               <div className="flex flex-col items-center justify-center h-64">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                  <p className="text-slate-500">Loading Module...</p>
               </div>
            }>
              {currentView === 'DASHBOARD' && (
                <Dashboard 
                   leads={leads} 
                   dealers={dealers} 
                />
              )}
              {currentView === 'LEAD_FINDER' && (
                <LeadFinder 
                   onAddLead={handleAddLead} 
                   leads={leads} 
                   onUpdateLead={handleUpdateLeadContact} 
                   dealers={dealers} 
                />
              )}
              {currentView === 'MY_LEADS' && (
                <LeadList 
                   leads={leads} 
                   dealers={dealers}
                   updateStatus={handleUpdateLeadStatus}
                   bulkUpdateStatus={handleBulkUpdateLeadStatus}
                   updateContact={handleUpdateLeadContact}
                   assignDealer={handleAssignDealer}
                   scheduleFollowUp={handleScheduleFollowUp}
                   onRefresh={loadData}
                />
              )}
              {currentView === 'DEALER_NETWORK' && (
                <DealerNetwork 
                   dealers={dealers} 
                   onAddDealer={registerDealership} 
                   onUpdateDealer={handleUpdateDealership}
                   onOpenOnboarding={() => setShowOnboarding(true)}
                />
              )}
              {currentView === 'BILLING' && (
                <Billing dealers={dealers} leads={leads} />
              )}
              {currentView === 'MARKETING' && (
                <Marketing />
              )}
              {currentView === 'POPIA_COMPLIANCE' && (
                <Compliance />
              )}
              {currentView === 'ABOUT' && (
                <About />
              )}
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
