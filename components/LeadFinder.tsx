import React, { useState } from 'react';
import { Search, Loader2, ExternalLink, Plus, MessageSquare, UserCheck, Copy, Check, Flame, Building2, ChevronDown, ChevronUp, MapPin, AlertTriangle, X, MessageCircle, BarChart } from 'lucide-react';
import { NAAMSA_BRANDS, SA_REGIONS, BRAND_MODELS, COMMON_TRIMS } from '../constants';
import { searchMarketLeads, generateOutreachScript } from '../services/geminiService';
import { MarketInsight, Lead, LeadStatus, Dealership } from '../types';
import { calculateInsightScore } from '../services/scoringService';

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
      // Handle "Any" brand case
      const brandName = brand === 'Any' ? 'Any' : (NAAMSA_BRANDS.find(b => b.id === brand)?.name || brand);
      
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
    if (!popiaConfirmed) return; // Guard clause to ensure checkbox is checked

    const { item, formData } = verifyModal;
    const brandName = brand === 'Any' ? 'Unknown Brand' : (NAAMSA_BRANDS.find(b => b.id === brand)?.name || brand);
    
    // Use the specific source platform if detected, otherwise fallback to title
    const specificSource = item.sourcePlatform || item.sources[0].title;

    const newLead: Lead = {
      id: Math.random().toString(36).substr(2, 9),
      brand: brandName,
      model: `${model} ${trim}`.trim(),
      source: specificSource,
      intentSummary: item.summary,
      // Use full ISO string to capture time of day for scoring
      dateDetected: new Date().toISOString(), 
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
    const brandName = brand === 'Any' ? 'Our Dealership' : (NAAMSA_BRANDS.find(b => b.id === brand)?.name || brand);
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
      <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Lead Finder (AI)</h2>
          <p className="text-slate-400">Search the open web for active buying intent.</p>
        </div>
        {addSuccess && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-2 rounded-lg flex items-center animate-in slide-in-from-top-2">
            <Check className="w-4 h-4 mr-2" /> {addSuccess}
          </div>
        )}
      </header>

      {/* Search Panel */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             {/* Tier Filter */}
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Segment</label>
                <select 
                  value={tier}
                  onChange={(e) => {
                     setTier(e.target.value);
                     // Reset brand if not in new tier
                     if (e.target.value !== 'All' && !NAAMSA_BRANDS.find(b => b.id === brand && b.tier === e.target.value)) {
                        setBrand(NAAMSA_BRANDS.filter(b => b.tier === e.target.value)[0].id);
                     }
                  }}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="All">All Segments</option>
                  <option value="Volume">Volume Brands</option>
                  <option value="Luxury">Luxury Brands</option>
                  <option value="Commercial">Commercial</option>
                </select>
             </div>

             {/* Brand Filter */}
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Brand</label>
                <select 
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Any">Any / All Brands</option>
                  {filteredBrands.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
             </div>

             {/* Model Input */}
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Model / Keyword</label>
                <input 
                  type="text" 
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  list="brand-models"
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g. Ranger, SUV, Bakkie"
                />
                <datalist id="brand-models">
                  {/* Show models if a specific brand is selected, otherwise show nothing or popular models */}
                  {brand !== 'Any' && (BRAND_MODELS[brand] || []).map(m => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
             </div>

             {/* Region Filter */}
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Region</label>
                <select 
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {SA_REGIONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
             </div>
          </div>

          {/* Advanced Toggle */}
          <div className="flex items-center justify-between">
             <button 
               type="button" 
               onClick={() => setShowAdvanced(!showAdvanced)}
               className="text-xs text-blue-400 hover:text-blue-300 flex items-center font-medium"
             >
               {showAdvanced ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
               {showAdvanced ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
             </button>

             <button 
               type="submit"
               disabled={loading}
               className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-lg flex items-center shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all relative overflow-hidden"
             >
               {loading && <span className="absolute inset-0 bg-white/20 animate-pulse"></span>}
               {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
               {loading ? 'Analyzing Market...' : 'Find Leads'}
             </button>
          </div>

          {/* Advanced Filters Panel */}
          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 animate-in slide-in-from-top-2">
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Trim / Variant</label>
                  <input 
                    type="text" 
                    value={trim}
                    onChange={(e) => setTrim(e.target.value)}
                    list="common-trims"
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none"
                    placeholder="e.g. Wildtrak"
                  />
                  <datalist id="common-trims">
                    {COMMON_TRIMS.map(t => <option key={t} value={t} />)}
                  </datalist>
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                  <select 
                     value={type}
                     onChange={(e) => setType(e.target.value as any)}
                     className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none"
                  >
                     <option value="New">New Vehicle</option>
                     <option value="Used">Used Vehicle</option>
                     <option value="Demo">Demo Vehicle</option>
                  </select>
               </div>
               <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Min Mileage (km)</label>
                   <input type="number" placeholder="0" value={mileage.min} onChange={e => setMileage({...mileage, min: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none" />
               </div>
               <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Max Mileage (km)</label>
                   <input type="number" placeholder="Any" value={mileage.max} onChange={e => setMileage({...mileage, max: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none" />
               </div>
            </div>
          )}
        </form>
      </div>

      {/* Results Area */}
      <div className="space-y-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
             <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
             <p className="animate-pulse">Scanning social platforms & classifieds...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center">
             <AlertTriangle className="w-5 h-5 mr-3" />
             {error}
          </div>
        )}

        {!loading && results.length === 0 && !error && (
           <div className="text-center py-12 text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800/50 border-dashed">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No results yet. Start a search to find leads.</p>
           </div>
        )}

        {results.map((item, idx) => {
           const potentialScore = calculateInsightScore(item, region);
           
           return (
           <div key={idx} className="bg-slate-800 rounded-xl border border-slate-700 p-4 md:p-6 shadow-lg hover:border-blue-500/30 transition-all group">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                 <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPlatformBadgeColor(item.sourcePlatform)}`}>
                          {item.sourcePlatform || 'Web'}
                       </span>
                       {item.sentiment === 'HOT' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center">
                             <Flame className="w-3 h-3 mr-1" /> High Intent
                          </span>
                       )}
                       <span className="text-slate-500 text-xs flex items-center">
                          <MapPin className="w-3 h-3 mr-1" /> {region}
                       </span>
                       <span className="text-slate-500 text-xs flex items-center" title="Potential Lead Score">
                          <BarChart className="w-3 h-3 mr-1" /> Score: {potentialScore}
                       </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{item.topic}</h3>
                    <p className="text-slate-300 text-sm mb-4 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                       "{item.summary}"
                    </p>
                    
                    {/* Detected Contact Info */}
                    <div className="flex flex-wrap gap-4 text-xs text-slate-400 mb-4">
                       {item.extractedContact?.name && (
                          <span className="flex items-center bg-slate-900 px-2 py-1 rounded border border-slate-800">
                             <UserCheck className="w-3 h-3 mr-1.5 text-blue-400" /> {item.extractedContact.name}
                          </span>
                       )}
                       {item.extractedContact?.phone && (
                          <span className="flex items-center bg-slate-900 px-2 py-1 rounded border border-slate-800">
                             <MessageSquare className="w-3 h-3 mr-1.5 text-green-400" /> {item.extractedContact.phone}
                          </span>
                       )}
                       {item.contextDealer && (
                          <span className="flex items-center bg-slate-900 px-2 py-1 rounded border border-slate-800">
                             <Building2 className="w-3 h-3 mr-1.5 text-purple-400" /> {item.contextDealer}
                          </span>
                       )}
                    </div>
                 </div>

                 <div className="flex flex-row md:flex-col gap-2 shrink-0">
                    <button 
                      onClick={() => initiateAddLead(item)}
                      className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-blue-900/20 flex items-center justify-center"
                    >
                       <Plus className="w-4 h-4 mr-2" /> Add to CRM
                    </button>
                    <button 
                      onClick={() => handleGenerateScript(item)}
                      className="flex-1 md:flex-none bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium text-sm border border-slate-600 flex items-center justify-center"
                    >
                       <MessageCircle className="w-4 h-4 mr-2" /> Draft Msg
                    </button>
                    <a 
                      href={item.sources[0].uri} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex-1 md:flex-none bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white px-4 py-2 rounded-lg font-medium text-sm border border-slate-600 flex items-center justify-center"
                    >
                       <ExternalLink className="w-4 h-4 mr-2" /> View Source
                    </a>
                 </div>
              </div>
           );
        })}
      </div>

      {/* Verify Lead Modal */}
      {verifyModal && (
         <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
               <div className="p-5 border-b border-slate-700 flex justify-between items-center">
                  <h3 className="font-bold text-white text-lg">Verify Lead Details</h3>
                  <button onClick={() => setVerifyModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
               </div>
               
               <div className="p-6 space-y-4">
                  <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 text-sm text-slate-300">
                     <p className="font-bold text-white mb-1">{verifyModal.item.topic}</p>
                     <p>{verifyModal.item.summary}</p>
                  </div>

                  <div className="space-y-3">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contact Name</label>
                        <input 
                           type="text" 
                           value={verifyModal.formData.name}
                           onChange={(e) => setVerifyModal({...verifyModal, formData: {...verifyModal.formData, name: e.target.value}})}
                           className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2 text-sm"
                           placeholder="Unknown"
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                        <input 
                           type="text" 
                           value={verifyModal.formData.phone}
                           onChange={(e) => setVerifyModal({...verifyModal, formData: {...verifyModal.formData, phone: e.target.value}})}
                           className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2 text-sm"
                           placeholder="Unknown"
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email (Optional)</label>
                        <input 
                           type="text" 
                           value={verifyModal.formData.email}
                           onChange={(e) => setVerifyModal({...verifyModal, formData: {...verifyModal.formData, email: e.target.value}})}
                           className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2 text-sm"
                           placeholder="Unknown"
                        />
                     </div>
                  </div>
                  
                  {/* POPIA Compliance Check */}
                  <div className="pt-2">
                     <label className="flex items-start space-x-3 cursor-pointer p-3 rounded-lg hover:bg-slate-700/50 border border-transparent hover:border-slate-600 transition-all">
                        <input 
                           type="checkbox" 
                           checked={popiaConfirmed}
                           onChange={(e) => setPopiaConfirmed(e.target.checked)}
                           className="mt-1 rounded border-slate-500 bg-slate-800 text-blue-600 focus:ring-offset-slate-900"
                        />
                        <div className="text-xs text-slate-400">
                           <span className="font-bold text-white">I confirm POPIA Compliance</span>
                           <p>The data being saved was obtained from a public source. I will not spam or harass the contact.</p>
                        </div>
                     </label>
                  </div>

                  <div className="flex gap-3 pt-2">
                     <button onClick={() => setVerifyModal(null)} className="flex-1 py-2 text-slate-400 hover:text-white">Cancel</button>
                     <button 
                        onClick={confirmAddLead}
                        disabled={!popiaConfirmed}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-2 rounded-lg"
                     >
                        Confirm & Save
                     </button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* Script Modal */}
      {scriptModal && (
         <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
               <div className="p-5 border-b border-slate-700 flex justify-between items-center">
                  <h3 className="font-bold text-white text-lg">AI Outreach Script</h3>
                  <button onClick={() => setScriptModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
               </div>
               <div className="p-6">
                  {scriptModal.loading ? (
                     <div className="py-8 flex flex-col items-center text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-3 text-purple-500" />
                        <p>Generating personalized message...</p>
                     </div>
                  ) : (
                     <>
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-4 relative group">
                           <button 
                              onClick={copyToClipboard}
                              className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                              title="Copy to clipboard"
                           >
                              {scriptCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                           </button>
                           <p className="text-slate-300 text-sm whitespace-pre-wrap font-mono leading-relaxed">
                              {scriptModal.script}
                           </p>
                        </div>
                        <div className="flex justify-between items-center">
                           <p className="text-xs text-slate-500 italic">
                              Context: {scriptModal.leadContext?.sourcePlatform}
                           </p>
                           <button onClick={() => setScriptModal(null)} className="text-sm text-blue-400 hover:underline">
                              Close
                           </button>
                        </div>
                     </>
                  )}
               </div>
            </div>
         </div>
      )}

      {/* Overwrite Confirmation Modal */}
      {confirmOverwrite && (
         <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-sm shadow-2xl p-6 text-center">
               <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
               <h3 className="text-lg font-bold text-white mb-2">Lead Already Exists</h3>
               <p className="text-sm text-slate-400 mb-6">
                  We found new contact details for this lead. Do you want to update the existing record?
               </p>
               <div className="flex gap-3">
                  <button 
                     onClick={() => setConfirmOverwrite(null)} 
                     className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                  >
                     Cancel
                  </button>
                  <button 
                     onClick={confirmUpdate} 
                     className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold"
                  >
                     Update Lead
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default LeadFinder;
