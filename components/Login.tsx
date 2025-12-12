
import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldAlert, X, CheckCircle, Loader2 } from 'lucide-react';
import { User, Dealership } from '../types';
import { signInDealer } from '../services/supabaseService';
import { sendPasswordResetEmail } from '../services/emailService';
import { Logo } from './Logo';

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
      // Pass both email and password to the service
      const dealer = await signInDealer(email, password);
      
      if (dealer) {
        if (dealer.status === 'Pending') {
          setError('Account is pending approval. Please contact support.');
          setLoading(false);
          return;
        }

        // Determine Role based on specific email patterns or DB flags
        let role: any = 'DEALER_PRINCIPAL';
        
        if (email.toLowerCase().includes('admin') || email.toLowerCase() === 'owner@autoleadsa.co.za') {
           role = 'ADMIN';
        } else if (email.toLowerCase().includes('manager')) {
           role = 'SALES_MANAGER';
        } else if (email.toLowerCase().includes('sales')) {
           role = 'SALES_EXECUTIVE';
        }

        // Create User Session
        const user: User = {
          id: `user-${dealer.id}`,
          name: dealer.contactPerson,
          email: dealer.email,
          role: role, 
          dealerId: dealer.id,
          avatar: `https://ui-avatars.com/api/?name=${dealer.contactPerson}&background=0D8ABC&color=fff`
        };
        
        // Handle "Keep me signed in" logic
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

    // Check if email exists in our local dealer list (simulating backend check)
    // In a real app, the API would handle this check securely.
    const exists = dealers.some(d => d.email.toLowerCase() === forgotEmail.toLowerCase());

    if (!exists) {
        // Security: Usually we shouldn't reveal if email exists, but for UX in this app we will show a friendly error
        setForgotError("We couldn't find an account with that email address.");
        setForgotLoading(false);
        return;
    }

    try {
        await sendPasswordResetEmail(forgotEmail);
        setForgotSuccess(true);
    } catch (e) {
        setForgotError("Failed to send reset email. Please try again.");
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
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={keepSignedIn}
                onChange={(e) => setKeepSignedIn(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-950 text-blue-600 focus:ring-offset-slate-900 focus:ring-blue-500 transition-colors"
              />
              <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">Keep me signed in</span>
            </label>
            <button 
                type="button" 
                onClick={() => setShowForgotModal(true)}
                className="text-sm text-blue-400 hover:text-blue-300 font-medium"
            >
              Forgot Password?
            </button>
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

        <div className="mt-6 text-center pt-6 border-t border-slate-800">
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

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-white">Reset Password</h3>
                    <button onClick={closeForgotModal} className="text-slate-500 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {!forgotSuccess ? (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                        <p className="text-slate-400 text-sm">
                            Enter your registered email address below. We'll send you a secure link to reset your password.
                        </p>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                            <input 
                                type="email" 
                                value={forgotEmail}
                                onChange={(e) => setForgotEmail(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="name@dealership.co.za"
                                required
                            />
                        </div>

                        {forgotError && (
                            <div className="flex items-center p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                <ShieldAlert className="w-4 h-4 mr-2" />
                                {forgotError}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={forgotLoading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center transition-all"
                        >
                            {forgotLoading ? (
                                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending Link...</>
                            ) : (
                                "Send Reset Link"
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="text-center py-6">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-green-500" />
                        </div>
                        <h4 className="text-lg font-bold text-white mb-2">Check your Email</h4>
                        <p className="text-slate-400 text-sm mb-6">
                            We've sent a password reset link to <span className="text-white font-medium">{forgotEmail}</span>.
                        </p>
                        <button 
                            onClick={closeForgotModal}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                        >
                            Return to Login
                        </button>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default Login;
