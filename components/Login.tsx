
import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, CheckCircle, Star, TrendingUp, ShieldAlert, Users, Briefcase, User as UserIcon } from 'lucide-react';
import { User, Dealership } from '../types';
import { signInDealer } from '../services/supabaseService';
import { Logo } from './Logo';

interface LoginProps {
  dealers: Dealership[];
  onLogin: (user: User) => void;
  onSignUpClick: () => void;
}

const Login: React.FC<LoginProps> = ({ dealers, onLogin, onSignUpClick }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // Not authenticated against DB in this version, but good for UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // --- 1. SUPER ADMIN BACKDOOR (For Owner/Dev Access) ---
    // This allows you to log in immediately without database setup
    if (email.toLowerCase() === 'admin@autolead.co.za' || email.toLowerCase() === 'owner@autoleadsa.co.za') {
       // Simulate a slight network delay for realism
       setTimeout(() => {
         const adminUser: User = {
           id: 'master-admin-id',
           name: 'System Administrator',
           email: email,
           role: 'ADMIN', // This grants access to Dealer Network, Billing, etc.
           avatar: 'https://ui-avatars.com/api/?name=Super+Admin&background=000&color=fff&bold=true'
         };
         onLogin(adminUser);
         setLoading(false);
       }, 800);
       return;
    }

    // --- 2. STANDARD DEALER LOGIN (Supabase) ---
    try {
      const dealer = await signInDealer(email);
      
      if (dealer) {
        if (dealer.status === 'Pending') {
          setError('Account is pending approval. Please contact support.');
          setLoading(false);
          return;
        }

        // Create User Session
        const user: User = {
          id: `user-${dealer.id}`,
          name: dealer.contactPerson,
          email: dealer.email,
          role: 'DEALER_PRINCIPAL', // Default role for standard login
          dealerId: dealer.id,
          avatar: `https://ui-avatars.com/api/?name=${dealer.contactPerson}&background=0D8ABC&color=fff`
        };
        onLogin(user);
      } else {
        setError('No dealership found with this email. Please register.');
      }
    } catch (err) {
      console.error(err);
      setError('Login failed. Please check connection.');
    } finally {
      if (email.toLowerCase() !== 'admin@autolead.co.za') {
        setLoading(false);
      }
    }
  };

  const fillCredentials = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
         <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[100px]"></div>
         <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 p-8 rounded-2xl shadow-2xl relative z-10 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center mb-8">
          <Logo className="w-16 h-16 mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-slate-400 text-center">Sign in to access your intelligent dealer dashboard.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  placeholder="name@dealership.co.za"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  placeholder="••••••••"
                  // Password not strictly required for the demo bypass, but good for UI
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm animate-in slide-in-from-top-2">
               <ShieldAlert className="w-4 h-4 mr-2" />
               {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center group"
          >
            {loading ? 'Authenticating...' : (
               <>Sign In <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" /></>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800">
          <p className="text-slate-500 text-xs uppercase font-bold text-center mb-4 tracking-wider">Quick Access (Demo Mode)</p>
          <div className="grid grid-cols-2 gap-3">
             <button 
               type="button"
               onClick={() => fillCredentials('admin@autolead.co.za')}
               className="flex items-center justify-center p-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 rounded-lg text-xs font-medium transition-colors"
             >
                <ShieldAlert className="w-3 h-3 mr-1.5" /> Super Admin
             </button>
             <button 
               type="button"
               onClick={() => fillCredentials('johan@mccarthy.co.za')}
               className="flex items-center justify-center p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
             >
                <Briefcase className="w-3 h-3 mr-1.5" /> Dealer Principal
             </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-slate-400 text-sm mb-2">New to AutoLead?</p>
          <button 
            onClick={onSignUpClick}
            className="text-blue-400 hover:text-blue-300 font-semibold text-sm hover:underline"
          >
            Register your Dealership
          </button>
        </div>
      </div>
      
      <div className="absolute bottom-4 text-slate-600 text-xs z-10">
         &copy; {new Date().getFullYear()} AutoLead SA. Secure System.
      </div>
    </div>
  );
};

export default Login;
