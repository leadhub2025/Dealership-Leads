
import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, ExternalLink, Plus, MessageSquare, UserCheck, Copy, Check, Flame, Building2, ChevronDown, ChevronUp, MapPin, AlertTriangle, X, MessageCircle, BarChart, Zap, Clock, History, Play, Pause } from 'lucide-react';
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

export default function LeadFinder({ onAddLead, leads, onUpdateLead, dealers }: LeadFinderProps) {
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

  // --- AUTO PILOT STATE ---
  const [isAutoPilot, setIsAutoPilot] = useState(false);
  const [nextScanTime, setNextScanTime] = useState<Date | null>(null);
  const [scanLog, setScanLog] = useState<string[]>([]);
  
  // Refs for Intervals
  const autoPilotIntervalRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Filter Brands by Tier
  const filteredBrands = tier === 'All' 
    ? NAAMSA_BRANDS 
    : NAAMSA_BRANDS.filter(b => b.tier === tier);

  // Use a ref to access latest state inside the interval without resetting the timer
  const latestStateRef = useRef({ brand, model, trim, region, type, fuel, transmission, mileage, filteredBrands, results });
  
  useEffect(() => {
      latestStateRef.current = { brand, model, trim, region, type, fuel, transmission, mileage, filteredBrands, results };
  }, [brand, model, trim, region, type, fuel, transmission, mileage, filteredBrands, results]);

  // --- AUTO PILOT LOGIC ---
  const handleAutoPilotCycle = async () => {
    const state = latestStateRef.current;
    
    // Logic: If brand is "Any", pick a random brand from the list to search this cycle
    let searchBrand = state.brand;
    if (state.brand === 'Any' && state.filteredBrands.length > 0) {
      const randomIndex = Math.floor(Math.random() * state.filteredBrands.length);
      searchBrand = state.filteredBrands[randomIndex].id;
    }
    const brandName = NAAMSA_BRANDS.find(b => b.id === searchBrand)?.name || searchBrand;

    // Add to log
    const timestamp = new Date().toLocaleTimeString();
    setScanLog(prev => [`[${timestamp}] Scanning ${brandName} in ${state.region}...`, ...prev].slice(0, 5));
    
    try {
      const data = await searchMarketLeads(
        brandName, 
        state.model, 
        state.trim, 
        state.region, 
        state.type, 
        state.fuel, 
        state.transmission, 
        state.mileage
      );

      if (data && data.length > 0) {
        setResults(prevResults => {
           const existingUris = new Set(prevResults.map(p => p.sources?.[0]?.uri));
           const newItems = data.filter(d => d.sources?.[0]?.uri && !existingUris.has(d.sources[0].uri));
           
           if (newItems.length > 0) {
              setScanLog(prevLog => [`[${timestamp}] Found ${newItems.length} new leads!`, ...prevLog].slice(0, 5));
              return [...newItems, ...prevResults];
           } else {
              setScanLog(prevLog => [`[${timestamp}] No new unique leads found.`, ...prevLog].slice(0, 5));
              return prevResults;
           }
        });
      } else {
         setScanLog(prevLog => [`[${timestamp}] No results found.`, ...prevLog].slice(0, 5));
      }
    } catch (e) {
       console.error("AutoPilot Error", e);
       setScanLog(prevLog => [`[${timestamp}] Error during scan.`, ...prevLog].slice(0, 5));
    }
  };
  
  useEffect(() => {
    if (isAutoPilot) {
      // Run first scan immediately
      handleAutoPilotCycle();
      
      // Set 15 minute interval (15 * 60 * 1000 = 900000ms)
      const intervalDuration = 15 * 60 * 1000; 
      setNextScanTime(new Date(Date.now() + intervalDuration));

      autoPilotIntervalRef.current = setInterval(() => {
        handleAutoPilotCycle();
        setNextScanTime(new Date(Date.now() + intervalDuration));
      }, intervalDuration);

      // Countdown timer for UI
      countdownIntervalRef.current = setInterval(() => {
        setNextScanTime(prev => {
          if (!prev) return null;
          const diff = prev.getTime() - Date.now();
          
          if (diff <= 0) {
             setTimeRemaining("Scanning...");
             return prev; 
          }
          
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          setTimeRemaining(`${minutes}m ${seconds}s`);
          return prev;
        });
      }, 1000);

    } else {
      // Cleanup
      if (autoPilotIntervalRef.current) clearInterval(autoPilotIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setNextScanTime(null);
      setTimeRemaining('');
    }

    return () => {
      if (autoPilotIntervalRef.current) clearInterval(autoPilotIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isAutoPilot]);


  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults([]);
    setAddSuccess(null);

    try {
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
      if (data && Array.isArray(data)) {
        setResults(data);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error("Search failed", err);
      setError("Failed to retrieve market data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const initiateAddLead = (item: MarketInsight) => {
    setPopiaConfirmed(false);
    const uri = item.sources?.[0]?.uri || '#';
    const existingLead = leads.find(l => l.groundingUrl === uri && uri !== '#');

    if (existingLead) {
       const hasNewData = item.extractedContact && (
        (item.extractedContact.name && existingLead.contactName !== item.extractedContact.name) ||
        (item.extractedContact.phone && existingLead.contactPhone !== item.extractedContact.phone) ||
        (item.extractedContact.email && existingLead.contactEmail !== item.extractedContact.email)
      );

      if (hasNewData) {
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
        setAddSuccess("Lead already exists in CRM.");
        setTimeout(() => setAddSuccess(null), 3000);
      }
      return;
    }

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
    if (!popiaConfirmed) return;

    const { item, formData } = verifyModal;
    const brandName = brand === 'Any' ? 'Unknown Brand' : (NAAMSA_BRANDS.find(b => b.id === brand)?.name || brand);
    
    const specificSource = item.sourcePlatform || item.sources?.[0]?.title || 'Web Search';

    const newLead: Lead = {
      id: Math.random().toString(36).substr(2, 9),
      brand: brandName,
      model: `${model} ${trim}`.trim(),
      source: specificSource,
      intentSummary: item.summary || 'No summary available',
      dateDetected: new Date().toISOString(), 
      status: LeadStatus.NEW,
      sentiment: item.sentiment || 'Warm',
      region: region,
      groundingUrl: item.sources?.[0]?.uri || '#',
      contactName: formData.name,
      contactPhone: formData.phone,
      contactEmail: formData.email,
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

  const handleGenerateScript = async (item: MarketInsight) => {
    setScriptModal({ open: true, script: '', loading: true, leadContext: item });
    const brandName = brand === 'Any' ? 'Our Dealership' : (NAAMSA_BRANDS.find(b => b.id === brand)?.name || brand);
    try {
      const source = item.sourcePlatform || item.sources?.[0]?.title || 'Web';
      const script = await generateOutreachScript(item.summary, source, brandName);
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
    const p = platform ? platform.toLowerCase() : '';
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

      {/* AUTO PILOT CONTROL BAR */}
      <div className={`rounded-xl border p-4 transition-all duration-300 ${isAutoPilot ? 'bg-indigo-900/20 border-indigo-500/50 shadow-lg shadow-indigo-900/20' : 'bg-slate-800 border-slate-700'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${isAutoPilot ? 'bg-indigo-500 text-white animate-pulse' : 'bg-slate-700 text-slate-400'}`}>
                 <Zap className="w-5 h-5" />
              </div>
              <div>
                 <h3 className={`font-bold ${isAutoPilot ? 'text-indigo-300' : 'text-white'}`}>Auto-Pilot Scanner</h3>
                 <p className="text-xs text-slate-400">
                    {isAutoPilot 
                      ? `Active: Scanning ${region} every 15 mins` 
                      : "Automatically find leads in your AOR while you work."}
                 </p>
              </div>
           </div>

           <div className="flex items-center gap-4">
              {isAutoPilot && (
                 <div className="flex items-center gap-2 text-xs font-mono text-indigo-300 bg-indigo-950 px-3 py-1.5 rounded-lg border border-indigo-500/30">
                    <Clock className="w-3 h-3" />
                    <span>Next Scan: {timeRemaining}</span>
                 </div>
              )}
              
              <button 
                 onClick={() => setIsAutoPilot(!isAutoPilot)}
                 className={`flex items-center px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                    isAutoPilot 
                    ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg'
                 }`}
              >
                 {isAutoPilot ? <><Pause className="w-4 h-4 mr-2" /> Stop Auto-Pilot</> : <><Play className="w-4 h-4 mr-2" /> Start Auto-Pilot</>}
              </button>
           </div>
        </div>
        
        {isAutoPilot && scanLog.length > 0 && (
           <div className="mt-4 pt-4 border-t border-indigo-500/20">
              <div className="flex items-center gap-2 text-xs text-indigo-400 font-bold mb-2">
                 <History className="w-3 h-3" /> Recent Activity
              </div>
              <div className="space-y-1">
                 {scanLog.map((log, i) => (
                    <p key={i} className="text-xs text-slate-400 font-mono">{log}</p>
                 ))}
              </div>
           </div>
        )}
      </div>

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
                  {brand !== 'Any' && (BRAND_MODELS[brand] || []).map(m => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
             </div>

             {/* Region Filter */}
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Region (AOR)</label>
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
               {loading ? 'Analyzing Market...' : 'Find Leads Now'}
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
        {loading && !isAutoPilot && (
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

        {!loading && (!results || results.length === 0) && !error && (
           <div className="text-center py-12 text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800/50 border-dashed">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No results yet. Start a search or enable Auto-Pilot.</p>
           </div>
        )}

        {results && results.map((item, idx) => {
           // Skip rendering invalid items
           if (!item) return null;
           
           // Defensive check for sources to prevent crash
           const sourceUri = item.sources?.[0]?.uri || '#';
           const displaySource = item.sources?.[0]?.title || item.sourcePlatform || 'Web';
           
           let potentialScore = 0;
           try {
             potentialScore = calculateInsightScore(item, region);
           } catch (e) {
             potentialScore = 50; 
           }
           
           return (
           <div key={idx} className="bg-slate-800 rounded-xl border border-slate-700 p-4 md:p-6 shadow-lg hover:border-blue-500/30 transition-all group animate-in slide-in-from-bottom-2 duration-500">
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
                    <h3 className="text-lg font-bold text-white mb-2">{item.topic || 'Untitled Opportunity'}</h3>
                    <p className="text-slate-300 text-sm mb-4 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                       "{item.summary}"
                    </p>
                    
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
                    {/* Source Link with Safety Check */}
                    {sourceUri && sourceUri !== '#' && (
                      <a 
                        href={sourceUri.startsWith('http') ? sourceUri : `https://${sourceUri}`}
                        target="_blank" 
                        rel="noreferrer"
                        className="flex-1 md:flex-none bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white px-4 py-2 rounded-lg font-medium text-sm border border-slate-600 flex items-center justify-center"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" /> View Source
                      </a>
                    )}
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
                     </>
                  )}
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
    