
import React, { useState, useEffect } from 'react';
import { NAAMSA_BRANDS, SA_REGIONS } from '../constants';
import { createLead } from '../services/supabaseService';
import { Lead, LeadStatus } from '../types';
import { Logo } from './Logo';
import { Car, Send, CheckCircle, ChevronLeft } from 'lucide-react';

interface Props {
    dealerId?: string | null;
    onComplete?: () => void;
}

const PublicLeadForm: React.FC<Props> = ({ dealerId }) => {
    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [region, setRegion] = useState('');
    const [message, setMessage] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Check for Brand Pre-fill
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const prefilledBrand = params.get('brand');
        if (prefilledBrand) {
            setBrand(prefilledBrand);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const newLead: Lead = {
            id: Math.random().toString(36).substr(2, 9),
            brand: brand || 'Other',
            model: model || 'General Inquiry',
            source: 'Direct Website Inquiry',
            intentSummary: message || `Customer inquiry for ${brand} ${model}`,
            dateDetected: new Date().toISOString(),
            status: LeadStatus.NEW,
            sentiment: 'HOT', // Direct inquiries are usually hot
            region: region || 'Gauteng',
            contactName: name,
            contactPhone: phone,
            contactEmail: email,
            assignedDealerId: dealerId || undefined, // Direct assignment if link belonged to dealer
            assignmentType: dealerId ? 'Direct' : undefined
        };

        await createLead(newLead);
        setLoading(false);
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
                 <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6 animate-in zoom-in">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                 </div>
                 <h2 className="text-3xl font-bold text-white mb-2">Request Received!</h2>
                 <p className="text-slate-400 max-w-md mb-8">
                    Thank you, {name}. We have received your inquiry for the {brand} {model}. A registered dealer will contact you shortly.
                 </p>
                 <button 
                    onClick={() => window.location.reload()}
                    className="text-blue-400 font-bold hover:text-white"
                 >
                    Submit Another Request
                 </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-lg">
                <div className="text-center mb-8">
                    <Logo className="w-12 h-12 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white">Find Your Next Car</h1>
                    <p className="text-slate-400">Tell us what you are looking for and we'll connect you with approved dealers.</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Brand</label>
                                <select 
                                    required
                                    value={brand}
                                    onChange={e => setBrand(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">Select Brand</option>
                                    <option value="Any">Any / All Brands</option>
                                    {NAAMSA_BRANDS.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Region</label>
                                <select 
                                    required
                                    value={region}
                                    onChange={e => setRegion(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">Select Region</option>
                                    {SA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Model / Vehicle Type</label>
                            <input 
                                required
                                type="text"
                                value={model}
                                onChange={e => setModel(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g. Hilux Double Cab or SUV"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Your Name</label>
                                <input 
                                    required
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                                <input 
                                    required
                                    type="tel"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                            <input 
                                required
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Message (Optional)</label>
                             <textarea 
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                                placeholder="Any specific requirements?"
                             />
                        </div>

                        <button 
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-900/20 flex items-center justify-center transition-all disabled:opacity-50"
                        >
                            {loading ? 'Submitting...' : <><Send className="w-4 h-4 mr-2" /> Send Inquiry</>}
                        </button>

                        <div className="text-center">
                            <a href="/" className="text-xs text-slate-500 hover:text-white flex items-center justify-center">
                                <ChevronLeft className="w-3 h-3 mr-1" /> Back to Login
                            </a>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PublicLeadForm;
