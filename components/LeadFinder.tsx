
import React, { useState } from 'react';
import { Search, Loader2, ExternalLink, Plus, Info, MessageSquare, UserCheck, Copy, Check, Flame, Building2, ChevronDown, ChevronUp, MapPin, Target, AlertTriangle, X, Save, Eye, ShieldCheck, Globe, MessageCircle } from 'lucide-react';
import { NAAMSA_BRANDS, SA_REGIONS, BRAND_MODELS, COMMON_TRIMS, POPIA_DISCLAIMER } from '../constants';
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
  const [showComplianceInfo, setShowComplianceInfo] = useState(false);

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
    if (!popiaConfirmed) return; // Guard clause to ensure checkbox is checked

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
    <div className="space-