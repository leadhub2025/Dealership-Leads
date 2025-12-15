
import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldAlert, X, CheckCircle, Loader2 } from 'lucide-react';
import { User, Dealership } from '../types';
import { signInDealer } from '../services/supabaseService';
import { sendPasswordResetEmail } from '../services/emailService';
import { Logo } from './Logo';
import { isDemoMode } from '../lib/supabaseClient';

interface LoginProps {
  dealers: Dealership[];
  onLogin: (user: User) => void;
  onSignUpClick: () => void;
}

const Login: React.FC<LoginProps> = ({ dealers, onLogin, onSignUpClick }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); 
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-fill for convenience during testing/review, but quiet about it
  React.useEffect(() => {
    if (isDemoMode && dealers.length > 0) {
        setEmail(dealers[0].email);
        setPassword('password123');
    }
  }, [dealers]);

  // Forgot Password State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const dealer = await signInDealer(email, password);
      
      if (dealer) {
        if (dealer.status === 'Pending') {
          setError('Account is pending approval. Please contact support.');
          setLoading(false);
          return;
        }

        let role: any = 'DEALER_PRINCIPAL';
        if (email.toLowerCase().includes('admin') || email.toLowerCase() === 'owner@autoleadsa.co.za') {
           role = 'ADMIN';
        } else if (email.toLowerCase().includes('manager')) {
           role = 'SALES_MANAGER';
        } else if (email.toLowerCase().includes('sales')) {
           role = 'SALES_EXECUTIVE';
        }

        const user: User = {
          id: `user-${dealer.id}`,
          name: dealer.contactPerson,
          email: dealer.email,
          role: role, 
          dealerId: dealer.id,
          avatar: `https://ui-avatars.com/api/?name=${dealer.contactPerson}&background=0D8ABC&color=fff`
        };
        
        if (keepSignedIn) {
          localStorage.setItem('autolead_session', JSON.stringify(user));
        } else {
          localStorage.removeItem('autolead_session');
        }

        onLogin(user);
      } else {
        setError('Invalid credentials or no dealership found. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setError('Login failed. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    setForgotError('');

    // Check against local list for visual feedback
    const exists = dealers.some(d => d.email.toLowerCase() === forgotEmail.toLowerCase());
    if (!exists) {
        setForgotError("We couldn't find an account with that email address.");
        setForgotLoading(false);
        return;
    }

    try {
        await sendPasswordResetEmail(forgotEmail);
        setForgotSuccess(true);
    } catch (e) {
        setForgotError("Failed to send reset email.");
    } finally {
        setForgotLoading(false);
    }
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotEmail('');
    setForgotSuccess(false);
    setForgotError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
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
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-300">Password</label>
                <button 
                  type="button" 
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <input 
              id="keep-signed-in" 
              type="checkbox" 
              checked={keepSignedIn}
              onChange={(e) => setKeepSignedIn(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
            />
            <label htmlFor="keep-signed-in" className="ml-2 text-sm text-slate-400">Keep me signed in</label>
          </div>

          {error && (
             <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400 text-sm animate-in slide-in-from-top-1">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <span>{error}</span>
             </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center group disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sign In <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
          </button>
        </form>
        
        <div className="mt-8 text-center border-t border-slate-800 pt-6">
           <p className="text-slate-400 text-sm mb-4">Don't have a dealership account?</p>
           <button 
             onClick={onSignUpClick}
             className="text-blue-400 hover:text-white font-semibold transition-colors text-sm hover:underline"
           >
             Register New Dealership
           </button>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white">Reset Password</h3>
                  <button onClick={closeForgotModal} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
               </div>
               
               {!forgotSuccess ? (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                     <p className="text-sm text-slate-400">Enter your email address and we'll send you a link to reset your password.</p>
                     <input 
                        type="email" 
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="name@dealership.co.za"
                        required
                     />
                     {forgotError && <p className="text-xs text-red-400">{forgotError}</p>}
                     <button 
                        type="submit" 
                        disabled={forgotLoading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center"
                     >
                        {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
                     </button>
                  </form>
               ) : (
                  <div className="text-center py-4">
                     <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                     </div>
                     <h4 className="text-white font-bold mb-2">Check your email</h4>
                     <p className="text-sm text-slate-400 mb-4">We've sent a password reset link to <span className="text-white">{forgotEmail}</span>.</p>
                     <button onClick={closeForgotModal} className="text-blue-400 hover:text-blue-300 text-sm font-bold">Return to Login</button>
                  </div>
               )}
            </div>
         </div>
      )}
    </div>
  );
};

export default Login;
