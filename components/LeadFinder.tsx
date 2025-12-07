
import React, { useState } from 'react';
import { Search, Loader2, ExternalLink, Plus, Info, MessageSquare, UserCheck, Copy, Check, Flame, Building2, ChevronDown, ChevronUp, MapPin, Target, AlertTriangle, X, Save, Eye, ShieldCheck, Globe, MessageCircle } from 'lucide-react';
import { NAAMSA_BRANDS, SA_REGIONS, BRAND_MODELS, COMMON_TRIMS } from '../constants';
import { searchMarketLeads, generateOutreachScript } from '../services/geminiService';
import { MarketInsight, Lead, LeadStatus, Dealership } from '../types';

interface LeadFinderProps {
  onAddLead: (lead: Lead) => string | undefined; 
  leads: Lead[];
  onUpdateLead: (id: string, name: string, phone: string, email: string) => void;
  dealers?: Dealership[];
}

const LeadFinder: React.FC<LeadFinderProps> = ({ onAddLead, leads, onUpdateLead, dealers }) => {
  // Search Filters
  const [tier, setTier] = useState<string>('All');
  const [brand, setBrand] = useState(NAAMSA_BRANDS[0].id);
  const [model, setModel] = useState('');
  const [trim, setTrim] = useState('');
  const [region, setRegion] = useState(SA_REGIONS[0]);
  const [type, setType] = useState<'New' | 'Used' | 'Demo'>('New');
  
  // Advanced Filters
  const [fuel, setFuel] = useState('Any');
  const [transmission, setTransmission] = useState('Any');
  const [mileage, setMileage] = useState({ min: '', max: '' });
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MarketInsight[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Script Modal State
  const [scriptModal, setScriptModal] = useState<{ open: boolean; script: string; loading: boolean; leadContext?: MarketInsight } | null>(null);
  const [scriptCopied, setScriptCopied] = useState(false);

  // Verification / Overwrite State
  const [verifyModal, setVerifyModal] = useState<{ open: boolean; item: MarketInsight; formData: { name: string; phone: string; email: string } } | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState<{ open: boolean; leadId: string; newData: { name?: string; phone?: string; email?: string } } | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  
  // Compliance State
  const [popiaConfirmed, setPopiaConfirmed] = useState(false);

  // Filter Brands by Tier
  const filteredBrands = tier === 'All' 
    ? NAAMSA_BRANDS 
    : NAAMSA_BRANDS.filter(b => b.tier === tier);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults([]);
    setAddSuccess(null);

    try {
      const brandName = NAAMSA_BRANDS.find(b => b.id === brand)?.name || brand;
      const data = await searchMarketLeads(
        brandName, 
        model, 
        trim, 
        region, 
        type,
        fuel,
        transmission,
        mileage
      );
      setResults(data);
    } catch (err) {
      setError("Failed to retrieve market data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const initiateAddLead = (item: MarketInsight) => {
    // Reset compliance check
    setPopiaConfirmed(false);

    // Check for existing lead by Source URI
    const existingLead = leads.find(l => l.groundingUrl === item.sources[0].uri);

    if (existingLead) {
       // Logic for existing lead (same as before)
       const hasNewData = item.extractedContact && (
        (item.extractedContact.name && existingLead.contactName !== item.extractedContact.name) ||
        (item.extractedContact.phone && existingLead.contactPhone !== item.extractedContact.phone) ||
        (item.extractedContact.email && existingLead.contactEmail !== item.extractedContact.email)
      );

      if (hasNewData) {
        if (existingLead.contactName || existingLead.contactPhone || existingLead.contactEmail) {
          setConfirmOverwrite({
            open: true,
            leadId: existingLead.id,
            newData: {
              name: item.extractedContact.name,
              phone: item.extractedContact.phone,
              email: item.extractedContact.email
            }
          });
        } else {
          onUpdateLead(
            existingLead.id, 
            item.extractedContact.name || '', 
            item.extractedContact.phone || '', 
            item.extractedContact.email || ''
          );
          setAddSuccess("Lead updated with new contact details.");
          setTimeout(() => setAddSuccess(null), 3000);
        }
      } else {
        setAddSuccess("Lead already exists in CRM.");
        setTimeout(() => setAddSuccess(null), 3000);
      }
      return;
    }

    // New Lead: Open Verification Modal
    setVerifyModal({
      open: true,
      item: item,
      formData: {
        name: item.extractedContact?.name || '',
        phone: item.extractedContact?.phone || '',
        email: item.extractedContact?.email || ''
      }
    });
  };

  const confirmAddLead = () => {
    if (!verifyModal) return;
    if (!popiaConfirmed) return; // Guard clause

    const { item, formData } = verifyModal;
    const brandName = NAAMSA_BRANDS.find(b => b.id === brand)?.name || brand;
    
    // Use the specific source platform if detected, otherwise fallback to title
    const specificSource = item.sourcePlatform || item.sources[0].title;

    const newLead: Lead = {
      id: Math.random().toString(36).substr(2, 9),
      brand: brandName,
      model: `${model} ${trim}`.trim(),
      source: specificSource,
      intentSummary: item.summary,
      dateDetected: new Date().toISOString().split('T')[0],
      status: LeadStatus.NEW,
      sentiment: item.sentiment,
      region: region,
      groundingUrl: item.sources[0].uri,
      contactName: formData.name,   // Use manual input
      contactPhone: formData.phone, // Use manual input
      contactEmail: formData.email, // Use manual input
      contextDealer: item.contextDealer
    };

    const assignedDealerId = onAddLead(newLead);
    
    let successMsg = "Lead added to CRM";
    if (assignedDealerId) {
       const dealer = dealers?.find(d => d.id === assignedDealerId);
       if (dealer) successMsg += ` & assigned to ${dealer.name}`;
    }
    setAddSuccess(successMsg);
    setVerifyModal(null);
    setTimeout(() => setAddSuccess(null), 3000);
  };

  const confirmUpdate = () => {
    if (confirmOverwrite) {
      onUpdateLead(
        confirmOverwrite.leadId, 
        confirmOverwrite.newData.name || '', 
        confirmOverwrite.newData.phone || '', 
        confirmOverwrite.newData.email || ''
      );
      setConfirmOverwrite(null);
      setAddSuccess("Lead contact details updated.");
      setTimeout(() => setAddSuccess(null), 3000);
    }
  };

  const handleGenerateScript = async (item: MarketInsight) => {
    setScriptModal({ open: true, script: '', loading: true, leadContext: item });
    const brandName = NAAMSA_BRANDS.find(b => b.id === brand)?.name || brand;
    try {
      const script = await generateOutreachScript(item.summary, item.sourcePlatform || item.sources[0].title, brandName);
      setScriptModal(prev => prev ? { ...prev, script, loading: false } : null);
    } catch (e) {
      setScriptModal(prev => prev ? { ...prev, script: "Error generating script.", loading: false } : null);
    }
  };

  const copyToClipboard = () => {
    if (scriptModal?.script) {
      navigator.clipboard.writeText(scriptModal.script);
      setScriptCopied(true);
      setTimeout(() => setScriptCopied(false), 2000);
    }
  };

  const getPlatformBadgeColor = (platform: string = '') => {
    const p = platform.toLowerCase();
    if (p.includes('facebook group')) return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
    if (p.includes('marketplace')) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    if (p.includes('whatsapp')) return 'bg-green-500/20 text-green-300 border-green-500/30';
    if (p.includes('forum') || p.includes('4x4')) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    if (p.includes('autotrader') || p.includes('cars.co.za')) return 'bg-red-500/20 text-red-300 border-red-500/30';
    return 'bg-slate-700 text-slate-300 border-slate-600';
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-white mb-2">Lead Finder</h2>
        <p className="text-slate-400">AI-powered market search to find in-market buyers from social, classifieds, and forums.</p>
      </header>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="bg-slate-800 border border-slate-700 rounded-xl p-4 md:p-6 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          
           {/* Brand Tier Filter - Mobile Optimized */}
           <div className="lg:col-span-4 flex gap-2 overflow-x-auto pb-2 mb-2 custom-scrollbar">
              {['All', 'Volume', 'Luxury', 'Commercial'].map(t => (
                <button 
                  key={t} 
                  type="button"
                  onClick={() => setTier(t)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap transition-colors ${
                    tier === t 
                      ? 'bg-blue-600 text-white border-blue-500' 
                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
           </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Brand</label>
            <div className="relative">
               <select 
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2.5 appearance-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
               >
                  {filteredBrands.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
               </select>
               <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Model</label>
            <div className="relative">
              <input 
                list="brand-models"
                type="text" 
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="e.g. Ranger, Hilux, Polo"
              />
              <datalist id="brand-models">
                 {BRAND_MODELS[brand]?.map(m => <option key={m} value={m} />)}
              </datalist>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none opacity-50" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Model Variant / Trim</label>
            <div className="relative">
               <input 
                  list="common-trims"
                  type="text" 
                  value={trim}
                  onChange={(e) => setTrim(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g. 2.8 GD-6 Double Cab"
               />
               <datalist id="common-trims">
                  {COMMON_TRIMS.map(t => <option key={t} value={t} />)}
               </datalist>
               <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none opacity-50" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Region</label>
            <div className="relative">
               <select 
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2.5 appearance-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
               >
                  {SA_REGIONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                  ))}
               </select>
               <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>
        
        {/* Advanced Filters Toggle */}
        <div className="mb-4">
           <button 
             type="button"
             onClick={() => setShowAdvanced(!showAdvanced)}
             className="text-xs text-blue-400 hover:text-blue-300 flex items-center"
           >
             {showAdvanced ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
             {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options (Condition, Fuel, Mileage, Transmission)'}
           </button>
        </div>

        {/* Advanced Filter Grid */}
        {showAdvanced && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 bg-slate-900/50 p-4 rounded-lg border border-slate-700/50 animate-in fade-in slide-in-from-top-2">
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Condition</label>
                 <select value={type} onChange={e => setType(e.target.value as any)} className="w-full bg-slate-800 border border-slate-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                    <option value="New">New</option>
                    <option value="Used">Used</option>
                    <option value="Demo">Demo</option>
                 </select>
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fuel Type</label>
                 <select value={fuel} onChange={e => setFuel(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                    <option value="Any">Any Fuel</option>
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Electric">Electric</option>
                 </select>
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Transmission</label>
                 <select value={transmission} onChange={e => setTransmission(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                    <option value="Any">Any Transmission</option>
                    <option value="Automatic">Automatic</option>
                    <option value="Manual">Manual</option>
                 </select>
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mileage (Km)</label>
                 <div className="flex items-center gap-2">
                    <input type="number" placeholder="Min" value={mileage.min} onChange={e => setMileage({...mileage, min: e.target.value})} className="w-full bg-slate-800 border border-slate-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                    <span className="text-slate-500">-</span>
                    <input type="number" placeholder="Max" value={mileage.max} onChange={e => setMileage({...mileage, max: e.target.value})} className="w-full bg-slate-800 border border-slate-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                 </div>
              </div>
           </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <><Loader2 className="animate-spin mr-2" /> Scanning Market Data...</>
          ) : (
            <><Search className="mr-2" /> Find Buyers</>
          )}
        </button>
      </form>

      {/* Results */}
      <div className="grid grid-cols-1 gap-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center">
            <AlertTriangle className="w-5 h-5 mr-3" />
            {error}
          </div>
        )}
        
        {addSuccess && (
          <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-2xl animate-in slide-in-from-bottom-5 z-50 flex items-center">
            <Check className="w-5 h-5 mr-2" />
            {addSuccess}
          </div>
        )}

        {results.map((item, idx) => (
          <div key={idx} className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg hover:border-slate-600 transition-colors animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${idx * 100}ms` }}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="font-bold text-lg text-white">{item.topic}</h3>
                  {item.sentiment === 'HOT' && (
                    <span className="bg-orange-500/10 text-orange-400 text-xs font-bold px-2 py-0.5 rounded border border-orange-500/20 flex items-center">
                      <Flame className="w-3 h-3 mr-1" /> HOT LEAD
                    </span>
                  )}
                </div>
                
                {/* Source Platform Badge */}
                <div className="flex items-center space-x-2 mb-1">
                   {item.sourcePlatform && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPlatformBadgeColor(item.sourcePlatform)}`}>
                         {item.sourcePlatform}
                      </span>
                   )}
                   <a href={item.sources[0].uri} target="_blank" rel="noreferrer" className="text-sm text-blue-400 hover:underline flex items-center">
                     <ExternalLink className="w-3 h-3 mr-1" /> View Source
                   </a>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                 <button 
                   onClick={() => initiateAddLead(item)}
                   className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center shadow-lg shadow-blue-900/20"
                 >
                   <Plus className="w-4 h-4 mr-2" /> Add to CRM
                 </button>
                 <button 
                   onClick={() => handleGenerateScript(item)}
                   className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
                 >
                   <MessageSquare className="w-4 h-4 mr-2" /> Connect
                 </button>
              </div>
            </div>

            <p className="text-slate-300 mb-4 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
              "{item.summary}"
            </p>

            {/* Competitor Analysis Section for HOT leads */}
            {item.sentiment === 'HOT' && item.contextDealer && (
              <div className="mb-4 bg-red-900/10 border border-red-500/20 rounded-lg p-3 flex items-start">
                 <div className="bg-red-500/20 p-1.5 rounded mr-3">
                    <Target className="w-4 h-4 text-red-400" />
                 </div>
                 <div>
                    <h4 className="text-xs font-bold text-red-400 uppercase mb-1">Competitor Intercept Opportunity</h4>
                    <p className="text-sm text-slate-300">
                       This lead was found on a listing by <span className="text-white font-bold">{item.contextDealer}</span>. 
                       They are actively looking. Engage with a better offer or immediate stock availability.
                    </p>
                 </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-700">
               <div className="flex items-center space-x-4">
                  {item.extractedContact ? (
                     <div className="flex items-center text-green-400 text-sm">
                        <UserCheck className="w-4 h-4 mr-2" />
                        <span>
                           {item.extractedContact.name || 'Unknown Name'} 
                           {item.extractedContact.phone ? ` • ${item.extractedContact.phone}` : ''}
                        </span>
                     </div>
                  ) : (
                     <span className="text-slate-500 text-sm italic">No direct contact info found</span>
                  )}
               </div>
               
               {item.contextDealer && (
                  <div className="flex items-center text-slate-400 text-sm">
                     <Building2 className="w-4 h-4 mr-2" />
                     <span>Found via: {item.contextDealer}</span>
                  </div>
               )}
            </div>
          </div>
        ))}
      </div>

      {/* SCRIPT MODAL */}
      {scriptModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Outreach Script</h3>
              <button onClick={() => setScriptModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              {scriptModal.loading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                  <p className="text-slate-400">Generating POPIA-compliant message...</p>
                </div>
              ) : (
                <>
                  <div className="bg-slate-900 rounded-lg p-4 mb-4 border border-slate-700 relative group">
                    <p className="text-slate-300 whitespace-pre-wrap">{scriptModal.script}</p>
                    <button 
                      onClick={copyToClipboard}
                      className="absolute top-2 right-2 p-2 bg-slate-800 rounded text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {scriptCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-start bg-blue-500/10 p-3 rounded-lg">
                    <Info className="w-5 h-5 text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-300">
                      This script is generated to be non-intrusive. Always identify yourself and your dealership clearly.
                    </p>
                  </div>
                </>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-700 flex justify-end">
              <button 
                onClick={() => setScriptModal(null)}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VERIFY / ENRICH MODAL */}
      {verifyModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-xl font-bold text-white mb-1">Verify Contact Details</h3>
              <p className="text-sm text-slate-400">Check the source link and add any missing details before saving.</p>
            </div>
            
            <div className="p-6 space-y-4">
               {/* Source Link Button */}
               <a 
                  href={verifyModal.item.sources[0].uri} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center justify-center w-full p-3 bg-slate-900 hover:bg-slate-950 border border-blue-500/30 text-blue-400 rounded-lg transition-colors group"
               >
                  <ExternalLink className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                  Open Source Link ({verifyModal.item.sources[0].title})
               </a>

               {verifyModal.item.sourcePlatform && (
                  <div className="text-center text-xs text-slate-500">
                     Detected Source: <span className="text-white font-bold">{verifyModal.item.sourcePlatform}</span>
                  </div>
               )}

               <div className="space-y-3 pt-2">
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contact Name</label>
                     <input 
                        type="text" 
                        value={verifyModal.formData.name}
                        onChange={(e) => setVerifyModal({...verifyModal, formData: {...verifyModal.formData, name: e.target.value}})}
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2.5 focus:border-blue-500 focus:outline-none"
                        placeholder="e.g. John Doe"
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                     <input 
                        type="text" 
                        value={verifyModal.formData.phone}
                        onChange={(e) => setVerifyModal({...verifyModal, formData: {...verifyModal.formData, phone: e.target.value}})}
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2.5 focus:border-blue-500 focus:outline-none"
                        placeholder="e.g. 082 123 4567"
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                     <input 
                        type="text" 
                        value={verifyModal.formData.email}
                        onChange={(e) => setVerifyModal({...verifyModal, formData: {...verifyModal.formData, email: e.target.value}})}
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2.5 focus:border-blue-500 focus:outline-none"
                        placeholder="e.g. buyer@gmail.com"
                     />
                  </div>
               </div>

               {/* POPIA Compliance Checkbox */}
               <div className="flex items-start space-x-3 bg-blue-900/20 p-3 rounded-lg border border-blue-500/30 mt-4">
                  <div className="flex items-center h-5">
                    <input
                      id="popia-check"
                      type="checkbox"
                      checked={popiaConfirmed}
                      onChange={(e) => setPopiaConfirmed(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800 cursor-pointer"
                    />
                  </div>
                  <label htmlFor="popia-check" className="text-xs text-slate-300 cursor-pointer select-none">
                    <span className="font-bold text-blue-400 block mb-0.5 flex items-center"><ShieldCheck className="w-3 h-3 mr-1"/> POPIA Compliance</span>
                    I confirm that I have a lawful basis (e.g., Legitimate Interest or Consent) to process this personal data and will adhere to POPIA regulations.
                  </label>
               </div>
            </div>

            <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
              <button 
                onClick={() => setVerifyModal(null)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmAddLead}
                disabled={!popiaConfirmed}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg font-bold flex items-center transition-colors shadow-lg shadow-blue-900/20"
              >
                <Save className="w-4 h-4 mr-2" /> Save to CRM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overwrite Confirmation Modal */}
      {confirmOverwrite && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center mb-4 text-amber-500">
               <AlertTriangle className="w-6 h-6 mr-2" />
               <h3 className="text-lg font-bold">Overwrite Data?</h3>
            </div>
            <p className="text-slate-300 mb-6">
               This lead already exists with contact details. Do you want to overwrite them with the new data found?
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmOverwrite(null)}
                className="px-4 py-2 text-slate-400 hover:text-white"
              >
                Keep Existing
              </button>
              <button 
                onClick={confirmUpdate}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                Overwrite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadFinder;
