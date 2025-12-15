
import React, { useState, useEffect, Suspense, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import { ViewState, Lead, LeadStatus, Dealership, User } from './types';
import { Menu, Loader2, CheckCircle, Mail, ArrowRight, Sparkles } from 'lucide-react';
import { REGION_ADJACENCY } from './constants';
import { fetchLeads, fetchDealers, createLead, updateLead, createDealer, updateDealer } from './services/supabaseService';
import { sendWelcomeEmail } from './services/emailService';
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
const PublicLeadForm = React.lazy(() => import('./components/PublicLeadForm'));

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setView] = useState<ViewState>('DASHBOARD');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Public Form Mode
  const [isPublicMode, setIsPublicMode] = useState(false);
  const [targetDealerId, setTargetDealerId] = useState<string | null>(null);

  // --- State Management ---
  const [dealers, setDealers] = useState<Dealership[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Notification State
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState<{name: string, email: string} | null>(null);

  // --- Session Check & Data Fetching Logic ---
  const loadData = useCallback(async () => {
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

  // Initial Session Check
  useEffect(() => {
    // Check for Public Capture Mode in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'capture') {
        setIsPublicMode(true);
        setTargetDealerId(params.get('dealer'));
        setLoading(false);
        return;
    }

    const checkSession = async () => {
      setLoading(true);
      
      const savedSession = localStorage.getItem('autolead_session');
      if (savedSession) {
        try {
          const user = JSON.parse(savedSession);
          setCurrentUser(user);
        } catch (e) {
          console.error("Failed to parse session", e);
          localStorage.removeItem('autolead_session');
        }
      }
      
      await loadData();
      setLoading(false);
    };
    checkSession();
  }, [loadData]);


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
    setShowOnboarding(false);
    
    try {
       const dealerWithBilling: Dealership = {
        ...dealer,
        password: dealer.password,
        billing: dealer.billing || {
          plan: 'Standard',
          costPerLead: 350,
          credits: 0,
          totalSpent: 0,
          lastBilledDate: new Date().toISOString().split('T')[0],
          currentUnbilledAmount: 0
        }
      };
      
      await createDealer(dealerWithBilling);
      
      setDealers(prev => {
         const others = prev.filter(d => d.email.toLowerCase() !== dealerWithBilling.email.toLowerCase());
         return [...others, dealerWithBilling];
      });

      try {
        await sendWelcomeEmail(dealerWithBilling.email, dealerWithBilling.contactPerson);
      } catch (emailError) {
        console.warn("Email sending failed slightly but flow continues", emailError);
      }
      
      const newUser: User = {
        id: `user-${dealerWithBilling.id}`,
        name: dealerWithBilling.contactPerson,
        email: dealerWithBilling.email,
        role: 'DEALER_PRINCIPAL',
        dealerId: dealerWithBilling.id,
        avatar: `https://ui-avatars.com/api/?name=${dealerWithBilling.id}`
      };
      
      localStorage.setItem('autolead_session', JSON.stringify(newUser));

      setCurrentUser(newUser);
      setView('DASHBOARD');

      setNotification({
        message: `Welcome aboard! Confirmation email sent to ${dealerWithBilling.email}`,
        type: 'success'
      });
      setTimeout(() => setNotification(null), 5000);
      
      setRegistrationSuccess({ 
        name: dealerWithBilling.contactPerson, 
        email: dealerWithBilling.email 
      });

    } catch (e) {
      console.error("Signup failed", e);
      setNotification({
        message: "Registration failed. Please try again.",
        type: 'error'
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('DASHBOARD');
    localStorage.removeItem('autolead_session');
  };

  // --- Lead Distribution Logic ---
  const distributeLead = (lead: Lead): Lead => {
    const dealerRoles = ['DEALER_PRINCIPAL', 'SALES_MANAGER', 'SALES_EXECUTIVE'];
    if (currentUser && dealerRoles.includes(currentUser.role) && currentUser.dealerId) {
       return { ...lead, assignedDealerId: currentUser.dealerId, assignmentType: 'Direct' };
    }

    const normalizedBrand = lead.brand.toLowerCase();
    const normalizedRegion = lead.region.toLowerCase();
    let assignmentType: 'Direct' | 'Fallback' | 'National' = 'Direct';

    const filterAvailableDealers = (list: Dealership[]) => {
      return list.filter(d => 
        d.status === 'Active' && 
        (!d.maxLeadsCapacity || (d.leadsAssigned || 0) < d.maxLeadsCapacity)
      );
    };

    const pickBestDealer = (candidates: Dealership[]) => {
        const available = filterAvailableDealers(candidates);
        if (available.length === 0) return null;
        
        return available.sort((a, b) => {
          const planWeight = { 'Enterprise': 3, 'Pro': 2, 'Standard': 1 };
          const weightA = planWeight[a.billing.plan] || 0;
          const weightB = planWeight[b.billing.plan] || 0;
          
          if (weightA !== weightB) return weightB - weightA;
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
       for (const neighbor of neighbors) {
          candidates = dealers.filter(d => 
            d.brand.toLowerCase() === normalizedBrand && 
            d.region.toLowerCase() === neighbor.toLowerCase()
          );
          matchedDealer = pickBestDealer(candidates);
          if (matchedDealer) break; 
       }
    }

    // 3. Tertiary: National Fallback
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

    return lead;
  };

  const handleAddLead = (lead: Lead) => {
    const distributedLead = distributeLead(lead);

    setLeads(prev => [distributedLead, ...prev]);

    createLead(distributedLead).then(() => {
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
    
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, assignedDealerId: dealerId, assignmentType: 'Direct' } : l));
    await updateLead(leadId, { assignedDealerId: dealerId, assignmentType: 'Direct' });

    if (oldDealerId) {
       const oldD = dealers.find(d => d.id === oldDealerId);
       if (oldD) handleUpdateDealership({ ...oldD, leadsAssigned: Math.max(0, (oldD.leadsAssigned || 0) - 1) });
    }
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

  // PUBLIC FORM MODE
  if (isPublicMode) {
      return (
         <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}>
            <PublicLeadForm dealerId={targetDealerId} />
         </Suspense>
      );
  }

  if (showOnboarding) {
     return (
       <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}>
         <Onboarding 
            onComplete={(d) => handleSignUp(d)}
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
    <div className="flex h-screen bg-slate-950 overflow-hidden text-slate-200 font-sans relative">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-2xl flex items-center animate-in slide-in-from-top-2 border ${
          notification.type === 'success' ? 'bg-green-600/20 border-green-500/50 text-green-400' : 'bg-red-600/20 border-red-500/50 text-red-400'
        }`}>
           <CheckCircle className="w-5 h-5 mr-3" />
           <span className="font-medium">{notification.message}</span>
        </div>
      )}

      {/* Registration Success Modal */}
      {registrationSuccess && (
        <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Sparkles className="w-10 h-10 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Registration Successful!</h2>
              <p className="text-slate-400 mb-6 leading-relaxed">
                 Welcome aboard, <span className="text-white font-medium">{registrationSuccess.name}</span>. 
                 Your dealership is now active on the network.
              </p>
              
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-8 text-left flex items-start">
                 <Mail className="w-5 h-5 text-blue-400 mr-3 mt-0.5 shrink-0" />
                 <div>
                    <h4 className="text-blue-300 font-bold text-sm mb-1">Confirmation Email Sent</h4>
                    <p className="text-xs text-blue-200/70">
                       We've sent a welcome pack and verification link to <span className="text-white">{registrationSuccess.email}</span>. Please check your inbox.
                    </p>
                 </div>
              </div>

              <button 
                 onClick={() => setRegistrationSuccess(null)}
                 className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-900/20 flex items-center justify-center transition-all group"
              >
                 Go to Dashboard <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
           </div>
        </div>
      )}

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
