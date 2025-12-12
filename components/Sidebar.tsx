
import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Search, Users, ShieldCheck, Network, X, CreditCard, Video, LogOut, Wifi, WifiOff, Info, Linkedin, Facebook, Twitter } from 'lucide-react';
import { ViewState, User, UserRole } from '../types';
import { Logo } from './Logo';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isOpen, onClose, currentUser, onLogout }) => {
  const [isConnected, setIsConnected] = useState(navigator.onLine);

  useEffect(() => {
    // Real-time network status detection for production
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
          className="fixed inset-0 bg-slate-950/80 z-30 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed md:static top-0 left-0 z-40 h-screen w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <div 
            onClick={() => handleNavigation('DASHBOARD')} 
            className="cursor-pointer hover:opacity-80 transition-opacity"
            title="Go to Dashboard"
          >
            <Logo className="w-8 h-8" showText={true} textSize="md" />
          </div>
          <button 
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* User Profile Snippet */}
        <div className="px-4 py-6 flex-1 overflow-y-auto custom-scrollbar">
           <div className="flex items-center space-x-3 mb-6 px-2">
              <img 
                src={currentUser.avatar || `https://ui-avatars.com/api/?name=${currentUser.name}&background=0D8ABC&color=fff`} 
                alt={currentUser.name}
                className="w-10 h-10 rounded-full border-2 border-slate-700"
              />
              <div className="flex-1 min-w-0">
                 <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                 <p className="text-xs text-slate-500 truncate">{getRoleLabel(currentUser.role)}</p>
              </div>
           </div>
           
           <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id as ViewState)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
           </nav>
        </div>

        {/* System Status Footer */}
        <div className="mt-auto border-t border-slate-800 bg-slate-950/30">
          {/* Social Links */}
          <div className="flex items-center justify-center gap-6 py-4 border-b border-slate-800">
             <a href="https://www.linkedin.com/" target="_blank" rel="noreferrer" className="text-slate-500 hover:text-blue-400 transition-colors" title="Follow AutoLead SA on LinkedIn">
                <Linkedin className="w-4 h-4" />
             </a>
             <a href="https://www.facebook.com/" target="_blank" rel="noreferrer" className="text-slate-500 hover:text-blue-600 transition-colors" title="Like AutoLead SA on Facebook">
                <Facebook className="w-4 h-4" />
             </a>
             <a href="https://twitter.com/" target="_blank" rel="noreferrer" className="text-slate-500 hover:text-sky-400 transition-colors" title="Follow AutoLead SA on X (Twitter)">
                <Twitter className="w-4 h-4" />
             </a>
          </div>

          <div className="px-6 py-3">
             <div className={`flex items-center space-x-2 text-xs font-medium ${isConnected ? 'text-green-400' : 'text-red-500'}`}>
                {isConnected ? <Wifi className="w-3 h-3 animate-pulse" /> : <WifiOff className="w-3 h-3" />}
                <span>System: {isConnected ? 'Online & Live' : 'Offline'}</span>
             </div>
             {!isConnected && (
                <p className="text-[10px] text-slate-600 mt-1 ml-5">Local storage active.</p>
             )}
          </div>
          
          <div className="p-4 border-t border-slate-800">
            <button 
              onClick={onLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
