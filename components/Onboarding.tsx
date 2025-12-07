
import React, { useState } from 'react';
import { Dealership } from '../types';
import { NAAMSA_BRANDS, SA_REGIONS } from '../constants';
import { Building2, MapPin, User, CheckCircle, ArrowRight, ArrowLeft, ShieldCheck, Car, CreditCard, Settings, BarChart3, X, Lock } from 'lucide-react';

interface OnboardingProps {
  onComplete: (dealer: Dealership) => void;
  onCancel: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const [formData, setFormData] = useState<Partial<Dealership> & { 
    vehicleConditions: string[];
    minScore: number;
    plan: 'Standard' | 'Pro' | 'Enterprise';
    password?: string;
  }>({
    name: '',
    contactPerson: '',
    email: '',
    password: '',
    brand: NAAMSA_BRANDS[0].id,
    region: SA_REGIONS[0],
    detailedAor: '',
    status: 'Active',
    leadsAssigned: 0,
    maxLeadsCapacity: 50,
    vehicleConditions: ['New', 'Used'],
    minScore: 50,
    plan: 'Standard'
  });

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleCondition = (condition: string) => {
    setFormData(prev => {
      const current = prev.vehicleConditions || [];
      if (current.includes(condition)) {
        return { ...prev, vehicleConditions: current.filter(c => c !== condition) };
      }
      return { ...prev, vehicleConditions: [...current, condition] };
    });
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    // Validation Logic
    if (step === 1) {
      if (!formData.name || !formData.email || !formData.contactPerson) {
        alert("Please fill in all dealership details.");
        return;
      }
      if (!formData.password || formData.password.length < 6) {
        alert("Please enter a secure password (min 6 chars).");
        return;
      }
    }
    
    if (step === 2) {
      if (!formData.brand || !formData.region) {
        alert("Please select a valid Brand and Region.");
        return;
      }
    }

    if (step < totalSteps) {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (step > 1) setStep(prev => prev - 1);
  };

  const handleSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    const brandName = NAAMSA_BRANDS.find(b => b.id === formData.brand)?.name || formData.brand || 'Unknown';
    const cost = formData.plan === 'Enterprise' ? 150 : formData.plan === 'Pro' ? 250 : 350;

    const newDealer: Dealership = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name!,
      brand: brandName,
      region: formData.region || 'Gauteng',
      detailedAor: formData.detailedAor,
      contactPerson: formData.contactPerson!,
      email: formData.email!,
      password: formData.password!, // Pass the password
      status: 'Active',
      leadsAssigned: 0,
      maxLeadsCapacity: formData.maxLeadsCapacity || 50,
      billing: {
        plan: formData.plan || 'Standard',
        costPerLead: cost,
        credits: 0,
        totalSpent: 0,
        lastBilledDate: new Date().toISOString().split('T')[0],
        currentUnbilledAmount: 0
      },
      preferences: {
        vehicleConditions: formData.vehicleConditions || [],
        minScore: formData.minScore || 0
      }
    };
    
    onComplete(newDealer);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 p-4 overflow-y-auto">
      {/* Background Decoration */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-1/4 -left-64 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-64 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden my-auto min-h-[600px] z-10">
        
        {/* Sidebar Steps */}
        <div className="bg-slate-800 p-6 md:w-1/3 border-r border-slate-700 hidden md:block">
          <div className="flex items-center space-x-2 mb-8 text-white font-bold text-xl">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><Car className="w-5 h-5 text-white" /></div>
             <span>AutoLead SA</span>
          </div>
          <div className="space-y-6 relative">
             <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-slate-700 -z-10"></div>
             {[
                { s: 1, label: 'Dealership Details', icon: Building2 },
                { s: 2, label: 'Region & Brand', icon: MapPin },
                { s: 3, label: 'Lead Settings', icon: Settings },
                { s: 4, label: 'Plan & Review', icon: CreditCard },
             ].map((item) => (
                <div key={item.s} className={`flex items-center space-x-3 ${step === item.s ? 'text-white' : step > item.s ? 'text-blue-400' : 'text-slate-500'}`}>
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors z-10 bg-slate-800 ${
                      step === item.s ? 'border-white bg-slate-700' : 
                      step > item.s ? 'border-blue-500 bg-blue-500/10' : 
                      'border-slate-600'
                   }`}>
                      {step > item.s ? <CheckCircle className="w-4 h-4" /> : <span className="text-xs font-bold">{item.s}</span>}
                   </div>
                   <div className="text-sm font-medium">{item.label}</div>
                </div>
             ))}
          </div>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
           <h2 className="text-lg font-bold text-white">Setup Step {step} of 4</h2>
           <button type="button" onClick={onCancel} className="text-slate-500"><X className="w-6 h-6"/></button>
        </div>

        {/* Form Content */}
        <div className="p-6 md:p-8 flex-1 flex flex-col overflow-y-auto custom-scrollbar relative">
           <div className="flex-1">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-bold text-white hidden md:block">
                    {step === 1 && 'Tell us about your Dealership'}
                    {step === 2 && 'Area of Responsibility (AOR)'}
                    {step === 3 && 'Lead Configuration'}
                    {step === 4 && 'Select your Plan'}
                 </h2>
                 <button type="button" onClick={onCancel} className="text-slate-500 hover:text-white hidden md:block"><X className="w-5 h-5"/></button>
              </div>

              {step === 1 && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div>
                       <label className="block text-sm text-slate-400 mb-1">Dealership Registered Name</label>
                       <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <input 
                             type="text" 
                             value={formData.name}
                             onChange={(e) => updateField('name', e.target.value)}
                             className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                             placeholder="e.g. McCarthy Toyota Centurion"
                          />
                       </div>
                    </div>
                    <div>
                       <label className="block text-sm text-slate-400 mb-1">Contact Person (Principal/Manager)</label>
                       <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <input 
                             type="text" 
                             value={formData.contactPerson}
                             onChange={(e) => updateField('contactPerson', e.target.value)}
                             className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                             placeholder="e.g. Johan Smit"
                          />
                       </div>
                    </div>
                    <div>
                       <label className="block text-sm text-slate-400 mb-1">Business Email</label>
                       <div className="relative">
                          <input 
                             type="email" 
                             value={formData.email}
                             onChange={(e) => updateField('email', e.target.value)}
                             className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                             placeholder="e.g. sales@mccarthy.co.za"
                          />
                       </div>
                       <p className="text-xs text-slate-500 mt-1">Used for login and lead notifications.</p>
                    </div>
                    <div>
                       <label className="block text-sm text-slate-400 mb-1">Set Password</label>
                       <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <input 
                             type="password" 
                             value={formData.password}
                             onChange={(e) => updateField('password', e.target.value)}
                             className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                             placeholder="••••••••"
                          />
                       </div>
                       <p className="text-xs text-slate-500 mt-1">Create a secure password for your dashboard access.</p>
                    </div>
                 </div>
              )}

              {step === 2 && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div>
                       <label className="block text-sm text-slate-400 mb-1">Franchise Brand</label>
                       <select 
                          value={formData.brand}
                          onChange={(e) => updateField('brand', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                       >
                          {NAAMSA_BRANDS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                       </select>
                    </div>
                    <div>
                       <label className="block text-sm text-slate-400 mb-1">Primary Region</label>
                       <select 
                          value={formData.region}
                          onChange={(e) => updateField('region', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                       >
                          {SA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                       </select>
                    </div>
                    <div>
                       <label className="block text-sm text-slate-400 mb-1">Specific Districts / Towns</label>
                       <input 
                          type="text" 
                          value={formData.detailedAor}
                          onChange={(e) => updateField('detailedAor', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          placeholder="e.g. Centurion, Midrand, Pretoria East"
                       />
                       <p className="text-xs text-slate-500 mt-2">Optional: Used for more granular matching.</p>
                    </div>
                    <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/20 flex items-start">
                       <ShieldCheck className="w-5 h-5 text-blue-400 mr-3 mt-0.5" />
                       <div className="text-sm text-blue-300">
                          <p className="font-bold mb-1">AOR Protection</p>
                          <p className="opacity-80">Leads detected for your brand in {formData.region} will be routed to you first.</p>
                       </div>
                    </div>
                 </div>
              )}

              {step === 3 && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div>
                       <label className="block text-sm text-slate-400 mb-2">Vehicle Categories</label>
                       <div className="grid grid-cols-3 gap-3">
                          {['New', 'Used', 'Demo'].map(c => (
                             <button
                                key={c}
                                type="button"
                                onClick={() => toggleCondition(c)}
                                className={`py-3 rounded-lg border text-sm font-medium transition-colors ${
                                   formData.vehicleConditions?.includes(c)
                                   ? 'bg-blue-600 text-white border-blue-500'
                                   : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                                }`}
                             >
                                {formData.vehicleConditions?.includes(c) && <CheckCircle className="w-4 h-4 mr-2" />}
                                {c}
                             </button>
                          ))}
                       </div>
                    </div>
                    
                    <div>
                       <label className="block text-sm font-medium text-slate-400 mb-2">Monthly Lead Capacity</label>
                       <div className="relative">
                          <BarChart3 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                          <input 
                             type="number" 
                             value={formData.maxLeadsCapacity}
                             onChange={(e) => updateField('maxLeadsCapacity', parseInt(e.target.value))}
                             className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-12 pr-5 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                             placeholder="50"
                          />
                       </div>
                       <p className="text-xs text-slate-500 mt-2">Maximum leads you can handle per month. We stop routing when hit.</p>
                    </div>

                    <div>
                       <div className="flex justify-between items-center mb-2">
                          <label className="text-sm text-slate-400">Minimum Lead Score</label>
                          <span className="text-white font-bold">{formData.minScore}/100</span>
                       </div>
                       <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          step="10"
                          value={formData.minScore}
                          onChange={(e) => updateField('minScore', parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                       />
                       <div className="flex justify-between text-xs text-slate-500 mt-1">
                          <span>Any Lead (0)</span>
                          <span>High Intent Only (80)</span>
                       </div>
                    </div>
                 </div>
              )}

              {step === 4 && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="grid grid-cols-1 gap-4">
                       {[
                          { id: 'Standard', price: 'R350', label: 'Standard', desc: 'Pay per lead only.' },
                          { id: 'Pro', price: 'R250', label: 'Pro Partner', desc: 'Lower lead cost + Analytics.' },
                          { id: 'Enterprise', price: 'R150', label: 'Enterprise', desc: 'Lowest cost + Priority Routing.' }
                       ].map((p) => (
                          <div 
                             key={p.id}
                             onClick={() => updateField('plan', p.id)}
                             className={`p-4 rounded-xl border cursor-pointer flex justify-between items-center transition-all ${
                                formData.plan === p.id 
                                ? 'bg-blue-600/10 border-blue-500 ring-1 ring-blue-500'
                                : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                             }`}
                          >
                             <div>
                                <h4 className={`font-bold ${formData.plan === p.id ? 'text-blue-400' : 'text-white'}`}>{p.label}</h4>
                                <p className="text-xs text-slate-400">{p.desc}</p>
                             </div>
                             <div className="text-right">
                                <p className="text-lg font-bold text-white">{p.price}</p>
                                <p className="text-[10px] text-slate-500">per lead</p>
                             </div>
                          </div>
                       ))}
                    </div>
                    
                    {/* Summary Check */}
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                       <h4 className="text-sm font-bold text-white mb-2">Configuration Summary</h4>
                       <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                          <div>Dealership: <span className="text-white">{formData.name}</span></div>
                          <div>Capacity: <span className="text-white">{formData.maxLeadsCapacity} / month</span></div>
                          <div>Types: <span className="text-white">{formData.vehicleConditions?.join(', ')}</span></div>
                          <div>AOR: <span className="text-white">{formData.region} {formData.detailedAor ? `(${formData.detailedAor})` : ''}</span></div>
                       </div>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg text-xs text-slate-400 border border-slate-800">
                       By clicking Complete, you agree to our Terms of Service. Billing is calculated monthly based on accepted leads.
                    </div>
                 </div>
              )}
           </div>

           <div className="flex justify-between mt-8 pt-4 border-t border-slate-800 sticky bottom-0 bg-slate-900 z-20 pb-4 md:pb-0">
              <button 
                 type="button"
                 onClick={handleBack}
                 disabled={step === 1}
                 className={`flex items-center text-slate-400 hover:text-white transition-colors ${step === 1 ? 'opacity-0 pointer-events-none' : ''}`}
              >
                 <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </button>
              <button 
                 type="button"
                 onClick={step === totalSteps ? handleSubmit : handleNext}
                 className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold flex items-center shadow-lg shadow-blue-900/30 transition-all"
              >
                 {step === totalSteps ? (
                    <>Complete Setup <CheckCircle className="w-4 h-4 ml-2" /></>
                 ) : (
                    <>Continue <ArrowRight className="w-4 h-4 ml-2" /></>
                 )}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
