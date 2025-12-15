
import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Search, Users, ShieldCheck, Network, X, CreditCard, Video, LogOut, Wifi, WifiOff, Info } from 'lucide-react';
import { ViewState, User, UserRole } from '../types';
import { Logo } from './Logo';
import { isDemoMode } from '../lib/supabaseClient';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isOpen, onClose, currentUser, onLogout }) => {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    // Check initial status
    setIsConnected(navigator.onLine);
    
    // Real-time network status detection
    const handleOnline = () => setIsConnected(true);
    const handleOffline = () => setIsConnected(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Define all items with Role Based Access Control
  const allMenuItems: { id: ViewState; label: string; icon: any; roles: UserRole[] }[] = [
    { id: 'DASHBOARD', label: 'Overview', icon: LayoutDashboard, roles: ['ADMIN', 'DEALER_PRINCIPAL', 'SALES_MANAGER'] },
    { id: 'LEAD_FINDER', label: 'Lead Finder', icon: Search, roles: ['ADMIN', 'DEALER_PRINCIPAL', 'SALES_MANAGER', 'SALES_EXECUTIVE'] },
    { id: 'MY_LEADS', label: 'My Leads CRM', icon: Users, roles: ['ADMIN', 'DEALER_PRINCIPAL', 'SALES_MANAGER', 'SALES_EXECUTIVE'] },
    { id: 'DEALER_NETWORK', label: 'Dealer Network', icon: Network, roles: ['ADMIN'] },
    { id: 'BILLING', label: 'Billing & Finance', icon: CreditCard, roles: ['ADMIN', 'DEALER_PRINCIPAL'] },
    { id: 'MARKETING', label: 'Marketing Kit', icon: Video, roles: ['ADMIN', 'DEALER_PRINCIPAL', 'SALES_MANAGER'] },
    { id: 'POPIA_COMPLIANCE', label: 'Compliance (POPIA)', icon: ShieldCheck, roles: ['ADMIN', 'DEALER_PRINCIPAL', 'SALES_MANAGER', 'SALES_EXECUTIVE'] },
    { id: 'ABOUT', label: 'About & Support', icon: Info, roles: ['ADMIN', 'DEALER_PRINCIPAL', 'SALES_MANAGER', 'SALES_EXECUTIVE'] },
  ];

  const menuItems = allMenuItems.filter(item => item.roles.includes(currentUser.role));

  const handleNavigation = (view: ViewState) => {
    setView(view);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return 'Administrator';
      case 'DEALER_PRINCIPAL': return 'Dealer Principal';
      case 'SALES_MANAGER': return 'Sales Manager';
      case 'SALES_EXECUTIVE': return 'Sales Executive';
      default: return 'User';
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-30 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
           <Logo textSize="md" />
           <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
             <X className="w-6 h-6" />
           </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
           {menuItems.map(item => {
             const Icon = item.icon;
             const isActive = currentView === item.id;
             return (
               <button
                 key={item.id}
                 onClick={() => handleNavigation(item.id)}
                 className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium text-sm mb-1 ${
                   isActive 
                     ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                     : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                 }`}
               >
                 <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                 {item.label}
               </button>
             );
           })}
        </nav>

        {/* Footer / Status */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
           {/* Connection Status */}
           <div className={`flex items-center justify-between px-4 py-3 rounded-lg border mb-4 ${
              isConnected && !isDemoMode
                 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                 : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
           }`}>
              <div className="flex items-center">
                 {isConnected && !isDemoMode ? <Wifi className="w-4 h-4 mr-2" /> : <WifiOff className="w-4 h-4 mr-2" />}
                 <span className="text-xs font-bold">
                    {isDemoMode ? 'Demo / Offline' : (isConnected ? 'System Online' : 'Connecting...')}
                 </span>
              </div>
           </div>

           {/* User Profile */}
           <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                 {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt="User" className="w-full h-full object-cover" />
                 ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">
                       {currentUser.name.charAt(0)}
                    </div>
                 )}
              </div>
              <div className="flex-1 min-w-0">
                 <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                 <p className="text-xs text-slate-500 truncate">{getRoleLabel(currentUser.role)}</p>
              </div>
              <button 
                 onClick={onLogout}
                 className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                 title="Logout"
              >
                 <LogOut className="w-5 h-5" />
              </button>
           </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
