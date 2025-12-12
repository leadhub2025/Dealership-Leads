
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Lead, LeadStatus, Dealership } from '../types';
import { Phone, Mail, Trash2, CheckCircle, ExternalLink, Edit2, X, Building2, Clock, Power, Search, RefreshCw, Download, User, ChevronDown, ChevronUp, Facebook, ShoppingBag, Users, Laptop, Globe, Flame, Send, Sparkles, Loader2, ShieldCheck, MapPin, Plus, ArrowUp, ArrowDown, CalendarClock } from 'lucide-react';
import { NAAMSA_BRANDS, POPIA_DISCLAIMER } from '../constants';
import { generateCSV, downloadCSV } from '../services/exportService';
import { generateOutreachScript, generateFollowUpScript } from '../services/geminiService';
import { calculateLeadScore } from '../services/scoringService';
import { openNativeEmailClient, constructEmailSubject } from '../services/emailService';

interface LeadListProps {
  leads: Lead[];
  dealers: Dealership[];
  updateStatus: (id: string, status: LeadStatus) => void;
  bulkUpdateStatus: (ids: string[], status: LeadStatus) => void;
  updateContact: (id: string, name: string, phone: string, email: string) => void;
  assignDealer: (leadId: string, dealerId: string) => void;
  scheduleFollowUp: (id: string, date: string) => void;
  onRefresh: () => Promise<void>;
}

type SortKey = 'dateDetected' | 'score' | 'status' | 'dealer' | null;
type SortDirection = 'asc' | 'desc';

const LeadList: React.FC<LeadListProps> = ({ leads, dealers, updateStatus, bulkUpdateStatus, updateContact, assignDealer, scheduleFollowUp, onRefresh }) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [brandFilter, setBrandFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'dateDetected',
    direction: 'desc'
  });
  
  // Refresh State
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Modal State
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '' });

  // Assignment Modal State
  const [assignmentLeadId, setAssignmentLeadId] = useState<string | null>(null);
  const [selectedDealerId, setSelectedDealerId] = useState<string>('');
  const [dealerSearch, setDealerSearch] = useState('');

  // Reminder Modal State
  const [reminderLeadId, setReminderLeadId] = useState<string | null>(null);
  const [reminderForm, setReminderForm] = useState({ date: '', time: '' });

  // Email Modal State
  const [emailModal, setEmailModal] = useState<{ open: boolean; leadId: string; to: string; subject: string; body: string; loading: boolean; type: 'outreach' | 'followup' } | null>(null);

  // Compliance Info State
  const [showComplianceInfo, setShowComplianceInfo] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Refresh failed", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Use a ref to keep track of the latest handleRefresh to avoid stale closures in setInterval
  const refreshRef = useRef(handleRefresh);
  useEffect(() => {
    refreshRef.current = handleRefresh;
  });

  // Auto-Refresh Interval
  useEffect(() => {
    // Refresh leads every 60 seconds
    const interval = setInterval(() => {
      if (refreshRef.current) {
        refreshRef.current();
      }
    }, 60000);

    // Clear interval on unmount
    return () => clearInterval(interval);
  }, []);

  const toggleExpand = (id: string) => {
    if (expandedLeadId === id) setExpandedLeadId(null);
    else setExpandedLeadId(id);
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSourceIcon = (source: string) => {
    const s = source.toLowerCase();
    if (s.includes('autotrader')) return <ShoppingBag className="w-4 h-4 mr-1 text-red-500" />;
    if (s.includes('facebook')) return <Facebook className="w-4 h-4 mr-1 text-blue-600" />;
    if (s.includes('4x4') || s.includes('community')) return <Users className="w-4 h-4 mr-1 text-emerald-500" />;
    if (s.includes('website') || s.includes('inquiry') || s.includes('web')) return <Laptop className="w-4 h-4 mr-1 text-purple-400" />;
    return <Globe className="w-4 h-4 mr-1 text-slate-400" />;
  };

  // Filter & Sort Logic
  const processedLeads = useMemo(() => {
    // 1. Filter
    const filtered = leads.filter(lead => {
      const matchesStatus = statusFilter === 'ALL' || lead.status === statusFilter;
      const matchesBrand = brandFilter === 'ALL' || lead.brand === brandFilter;
      const matchesSearch = 
        (lead.contactName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.intentSummary.toLowerCase().includes(searchTerm.toLowerCase());
        
      return matchesStatus && matchesBrand && matchesSearch;
    });

    // 2. Sort
    return filtered.sort((a, b) => {
      if (!sortConfig.key) return 0;

      let valA: any = '';
      let valB: any = '';

      switch (sortConfig.key) {
        case 'dateDetected':
          valA = new Date(a.dateDetected).getTime();
          valB = new Date(b.dateDetected).getTime();
          break;
        case 'score':
          valA = calculateLeadScore(a, dealers);
          valB = calculateLeadScore(b, dealers);
          break;
        case 'status':
          valA = a.status;
          valB = b.status;
          break;
        case 'dealer':
          valA = dealers.find(d => d.id === a.assignedDealerId)?.name || 'Unassigned';
          valB = dealers.find(d => d.id === b.assignedDealerId)?.name || 'Unassigned';
          break;
        default:
          return 0;
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  }, [leads, dealers, statusFilter, brandFilter, searchTerm, sortConfig]);

  // Bulk Actions
  const toggleSelectAll = () => {
    if (selectedIds.length === processedLeads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(processedLeads.map(l => l.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(i => i !== id));
    } else {
      setSelectedIds(prev => [...prev, id]);
    }
  };

  const handleBulkStatusChange = (status: LeadStatus) => {
    bulkUpdateStatus(selectedIds, status);
    setSelectedIds([]);
  };

  // Handlers for Modals
  const openEditModal = (lead: Lead) => {
    setEditingLeadId(lead.id);
    setEditForm({
      name: lead.contactName || '',
      phone: lead.contactPhone || '',
      email: lead.contactEmail || ''
    });
  };

  const saveContact = () => {
    if (editingLeadId) {
      updateContact(editingLeadId, editForm.name, editForm.phone, editForm.email);
      setEditingLeadId(null);
    }
  };

  const openAssignModal = (leadId: string) => {
    setAssignmentLeadId(leadId);
    setSelectedDealerId('');
    setDealerSearch('');
  };

  const confirmAssignment = () => {
    if (assignmentLeadId && selectedDealerId) {
      assignDealer(assignmentLeadId, selectedDealerId);
      setAssignmentLeadId(null);
    }
  };

  const openReminderModal = (leadId: string) => {
    setReminderLeadId(leadId);
    setReminderForm({ date: '', time: '' });
  };

  const confirmReminder = () => {
    if (reminderLeadId && reminderForm.date) {
      const dateTime = reminderForm.time ? `${reminderForm.date}T${reminderForm.time}:00` : `${reminderForm.date}T09:00:00`;
      scheduleFollowUp(reminderLeadId, dateTime);
      setReminderLeadId(null);
    }
  };

  const openEmailModalHandler = async (lead: Lead, type: 'outreach' | 'followup') => {
    const dealerName = "AutoLead Default Dealer"; // Should be from context
    setEmailModal({
      open: true,
      leadId: lead.id,
      to: lead.contactEmail || '',
      subject: constructEmailSubject(lead.brand, lead.model),
      body: '',
      loading: true,
      type
    });

    try {
      let script = '';
      if (type === 'outreach') {
        script = await generateOutreachScript(lead.intentSummary, lead.source, lead.brand);
      } else {
        script = await generateFollowUpScript(lead.contactName || 'Customer', lead.model, dealerName);
      }
      setEmailModal(prev => prev ? { ...prev, body: script, loading: false } : null);
    } catch (e) {
      setEmailModal(prev => prev ? { ...prev, body: "Error generating script.", loading: false } : null);
    }
  };

  const sendEmail = () => {
    if (!emailModal) return;
    openNativeEmailClient(emailModal.to, emailModal.subject, emailModal.body);
    // Optimistically update status if it's new
    const lead = leads.find(l => l.id === emailModal.leadId);
    if (lead && lead.status === LeadStatus.NEW) {
      updateStatus(lead.id, LeadStatus.CONTACTED);
    }
    setEmailModal(null);
  };

  const handleExport = () => {
    const csv = generateCSV(processedLeads);
    downloadCSV(csv, `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">My Leads CRM</h2>
          <div className="flex items-center text-xs text-slate-400 gap-4">
            <p>Manage and track your active opportunities.</p>
            <span className="flex items-center">
              <RefreshCw className={`w-3 h-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={handleExport}
             className="bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors"
           >
             <Download className="w-4 h-4 mr-2" /> Export
           </button>
           <button 
             onClick={() => handleRefresh()}
             className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-blue-900/20 flex items-center transition-all"
           >
             <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
           </button>
        </div>
      </div>

      {/* Filters & Toolbar */}
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:max-w-xs">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
             <input 
               type="text" 
               placeholder="Search leads..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
             />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            {Object.values(LeadStatus).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select 
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none hidden md:block"
          >
            <option value="ALL">All Brands</option>
            {NAAMSA_BRANDS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        {selectedIds.length > 0 && (
           <div className="flex items-center bg-blue-900/30 px-4 py-2 rounded-lg border border-blue-500/30 w-full md:w-auto justify-between">
              <span className="text-sm text-blue-300 font-bold mr-4">{selectedIds.length} Selected</span>
              <div className="flex gap-2">
                 <button onClick={() => handleBulkStatusChange(LeadStatus.ARCHIVED)} className="p-1.5 text-slate-400 hover:text-red-400" title="Archive Selected"><Trash2 className="w-4 h-4" /></button>
                 <button onClick={() => handleBulkStatusChange(LeadStatus.QUALIFIED)} className="p-1.5 text-slate-400 hover:text-green-400" title="Mark Qualified"><CheckCircle className="w-4 h-4" /></button>
              </div>
           </div>
        )}
      </div>

      {/* Leads Table (Desktop) */}
      <div className="hidden md:block bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-xl min-h-[400px]">
         <table className="w-full text-left">
            <thead>
               <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase font-bold border-b border-slate-700">
                  <th className="p-4 w-10">
                     <input type="checkbox" checked={selectedIds.length === processedLeads.length && processedLeads.length > 0} onChange={toggleSelectAll} className="rounded border-slate-600 bg-slate-800" />
                  </th>
                  <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort('dateDetected')}>
                     <div className="flex items-center">Detected {sortConfig.key === 'dateDetected' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1"/> : <ArrowDown className="w-3 h-3 ml-1"/>)}</div>
                  </th>
                  <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort('score')}>
                     <div className="flex items-center">Score {sortConfig.key === 'score' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1"/> : <ArrowDown className="w-3 h-3 ml-1"/>)}</div>
                  </th>
                  <th className="p-4">Vehicle & Intent</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort('dealer')}>
                     <div className="flex items-center">Assigned To {sortConfig.key === 'dealer' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1"/> : <ArrowDown className="w-3 h-3 ml-1"/>)}</div>
                  </th>
                  <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort('status')}>
                     <div className="flex items-center">Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1"/> : <ArrowDown className="w-3 h-3 ml-1"/>)}</div>
                  </th>
                  <th className="p-4 text-right">Actions</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
               {processedLeads.map(lead => {
                  const score = calculateLeadScore(lead, dealers);
                  const isExpanded = expandedLeadId === lead.id;
                  return (
                     <React.Fragment key={lead.id}>
                        <tr className={`group hover:bg-slate-700/30 transition-colors ${isExpanded ? 'bg-slate-700/20' : ''}`}>
                           <td className="p-4 align-top">
                              <input type="checkbox" checked={selectedIds.includes(lead.id)} onChange={() => toggleSelectOne(lead.id)} className="rounded border-slate-600 bg-slate-800" />
                           </td>
                           <td className="p-4 align-top">
                              <div className="text-sm font-medium text-white">{new Date(lead.dateDetected).toLocaleDateString()}</div>
                              <div className="text-xs text-slate-500">{new Date(lead.dateDetected).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                              {lead.followUpDate && (
                                 <div className="mt-1 flex items-center text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 w-fit">
                                    <Clock className="w-3 h-3 mr-1" /> {new Date(lead.followUpDate).toLocaleDateString()}
                                 </div>
                              )}
                           </td>
                           <td className="p-4 align-top">
                              <div className={`text-sm font-bold ${score > 70 ? 'text-green-400' : score > 40 ? 'text-amber-400' : 'text-slate-400'}`}>
                                 {score}
                              </div>
                              {lead.sentiment === 'HOT' && <Flame className="w-3 h-3 text-red-500 mt-1" />}
                           </td>
                           <td className="p-4 align-top">
                              <div className="text-sm font-bold text-white flex items-center">
                                 {lead.brand} {lead.model}
                              </div>
                              <div className="text-xs text-slate-400 mt-1 line-clamp-2">{lead.intentSummary}</div>
                              <div className="flex items-center mt-2 text-[10px] text-slate-500">
                                 {getSourceIcon(lead.source)} {lead.source}
                              </div>
                           </td>
                           <td className="p-4 align-top">
                              <div className="flex justify-between items-start">
                                 <div className="space-y-1">
                                    <div className="text-sm text-white flex items-center">
                                       <User className="w-3 h-3 mr-1.5 text-slate-500" /> {lead.contactName || 'Unknown'}
                                    </div>
                                    {lead.contactPhone ? (
                                       <div className="text-xs text-slate-400 flex items-center">
                                          <Phone className="w-3 h-3 mr-1.5" /> {lead.contactPhone}
                                       </div>
                                    ) : (
                                       <div className="text-xs text-slate-600 italic">No Phone</div>
                                    )}
                                    {lead.contactEmail ? (
                                       <div className="text-xs text-slate-400 flex items-center truncate max-w-[150px]">
                                          <Mail className="w-3 h-3 mr-1.5" /> {lead.contactEmail}
                                       </div>
                                    ) : (
                                       <div className="text-xs text-slate-600 italic">No Email</div>
                                    )}
                                 </div>
                                 <button 
                                    onClick={(e) => {
                                       e.stopPropagation();
                                       openEditModal(lead);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-500 hover:text-blue-400 hover:bg-slate-700 rounded-md"
                                    title="Edit Contact Details"
                                 >
                                    <Edit2 className="w-3 h-3" />
                                 </button>
                              </div>
                           </td>
                           <td className="p-4 align-top">
                              {lead.assignedDealerId ? (
                                 <div>
                                    <div className="text-xs font-bold text-white flex items-center">
                                       <Building2 className="w-3 h-3 mr-1.5 text-blue-400" />
                                       {dealers.find(d => d.id === lead.assignedDealerId)?.name || 'Unknown Dealer'}
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-1 ml-5">
                                       Via {lead.assignmentType || 'Direct'} Routing
                                    </div>
                                 </div>
                              ) : (
                                 <button onClick={() => openAssignModal(lead.id)} className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded border border-slate-600 flex items-center">
                                    <Plus className="w-3 h-3 mr-1" /> Assign Dealer
                                 </button>
                              )}
                           </td>
                           <td className="p-4 align-top">
                              <select 
                                 value={lead.status}
                                 onChange={(e) => updateStatus(lead.id, e.target.value as LeadStatus)}
                                 className={`text-xs font-bold px-2 py-1 rounded border appearance-none cursor-pointer focus:outline-none ${
                                    lead.status === 'NEW' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                    lead.status === 'CONTACTED' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                    lead.status === 'QUALIFIED' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                    lead.status === 'CONVERTED' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                    'bg-slate-700 text-slate-400 border-slate-600'
                                 }`}
                              >
                                 {Object.values(LeadStatus).map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                           </td>
                           <td className="p-4 align-top text-right">
                              <div className="flex items-center justify-end gap-2">
                                 <button onClick={() => toggleExpand(lead.id)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors">
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                 </button>
                              </div>
                           </td>
                        </tr>
                        {/* Expanded Details Row */}
                        {isExpanded && (
                           <tr className="bg-slate-900/30">
                              <td colSpan={8} className="p-4 border-t border-slate-700/50">
                                 <div className="flex flex-col md:flex-row gap-6">
                                    
                                    {/* Column 1: Intelligence & Source */}
                                    <div className="flex-1 space-y-4">
                                       <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                                          <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center">
                                             <Sparkles className="w-3 h-3 mr-2 text-blue-400" /> Intent Analysis
                                          </h4>
                                          <p className="text-sm text-slate-300 leading-relaxed mb-3">{lead.intentSummary}</p>
                                          
                                          {lead.groundingUrl && lead.groundingUrl !== '#' && (
                                             <div className="flex items-center gap-2 pt-3 border-t border-slate-700/50">
                                                <span className="text-xs text-slate-500">Source:</span>
                                                <a 
                                                   href={lead.groundingUrl} 
                                                   target="_blank" 
                                                   rel="noreferrer" 
                                                   className="text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center"
                                                >
                                                   <ExternalLink className="w-3 h-3 mr-1" />
                                                   {lead.groundingUrl.length > 50 ? lead.groundingUrl.substring(0, 50) + '...' : lead.groundingUrl}
                                                </a>
                                             </div>
                                          )}
                                       </div>

                                       <div className="flex gap-2">
                                          <button onClick={() => openEditModal(lead)} className="flex items-center text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-2 rounded">
                                             <Edit2 className="w-3 h-3 mr-2" /> Edit Details
                                          </button>
                                       </div>
                                    </div>

                                    {/* Column 2: Location Map */}
                                    <div className="w-full md:w-64 h-40 bg-slate-800 rounded-lg border border-slate-700 overflow-hidden relative group">
                                       <div className="absolute inset-0 bg-slate-900 flex items-center justify-center z-0">
                                          <MapPin className="w-8 h-8 text-slate-700" />
                                       </div>
                                       <iframe
                                          width="100%"
                                          height="100%"
                                          frameBorder="0"
                                          scrolling="no"
                                          marginHeight={0}
                                          marginWidth={0}
                                          src={`https://maps.google.com/maps?q=${encodeURIComponent(lead.region + ', South Africa')}&t=&z=7&ie=UTF8&iwloc=&output=embed`}
                                          className="relative z-10 opacity-60 group-hover:opacity-100 transition-opacity"
                                       ></iframe>
                                       <div className="absolute bottom-0 left-0 right-0 bg-slate-900/80 text-xs text-center py-1 text-slate-400 z-20 font-medium">
                                          {lead.region} Region
                                       </div>
                                    </div>

                                    {/* Column 3: Actions */}
                                    <div className="w-full md:w-48 space-y-2">
                                       <button onClick={() => openEmailModalHandler(lead, 'outreach')} className="w-full flex items-center justify-center text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded shadow-lg shadow-blue-900/20 transition-all">
                                          <Send className="w-3 h-3 mr-2" /> AI Outreach Email
                                       </button>
                                       <button onClick={() => openReminderModal(lead.id)} className="w-full flex items-center justify-center text-xs bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 rounded border border-slate-600 transition-all">
                                          <CalendarClock className="w-3 h-3 mr-2" /> Set Reminder
                                       </button>
                                    </div>
                                 </div>
                              </td>
                           </tr>
                        )}
                     </React.Fragment>
                  );
               })}
               {processedLeads.length === 0 && (
                  <tr>
                     <td colSpan={8} className="p-12 text-center text-slate-500">
                        <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No leads found matching your criteria.</p>
                     </td>
                  </tr>
               )}
            </tbody>
         </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
         {processedLeads.map(lead => {
            const score = calculateLeadScore(lead, dealers);
            return (
               <div key={lead.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                     <div>
                        <div className="flex items-center gap-2">
                           <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                              lead.status === 'NEW' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-700 text-slate-400'
                           }`}>{lead.status}</span>
                           <span className="text-xs text-slate-500">{new Date(lead.dateDetected).toLocaleDateString()}</span>
                        </div>
                        <h3 className="font-bold text-white mt-1">{lead.brand} {lead.model}</h3>
                     </div>
                     <div className={`text-lg font-bold ${score > 50 ? 'text-green-400' : 'text-slate-500'}`}>{score}</div>
                  </div>
                  
                  <p className="text-xs text-slate-400 mb-4 line-clamp-2 bg-slate-900/50 p-2 rounded">{lead.intentSummary}</p>
                  
                  <div className="grid grid-cols-2 gap-2 mb-4">
                     <button onClick={() => openEmailModalHandler(lead, 'outreach')} className="flex items-center justify-center text-xs bg-blue-600 text-white py-2 rounded font-bold">
                        <Mail className="w-3 h-3 mr-1" /> Contact
                     </button>
                     <button onClick={() => toggleExpand(lead.id)} className="flex items-center justify-center text-xs bg-slate-700 text-white py-2 rounded">
                        <ChevronDown className="w-3 h-3 mr-1" /> Details
                     </button>
                  </div>
                  
                  {expandedLeadId === lead.id && (
                     <div className="pt-4 border-t border-slate-700 space-y-3 animate-in slide-in-from-top-2">
                        <div className="flex items-center text-xs text-slate-300">
                           <User className="w-3 h-3 mr-2 text-slate-500" /> {lead.contactName || 'N/A'}
                        </div>
                        <div className="flex items-center text-xs text-slate-300">
                           <Phone className="w-3 h-3 mr-2 text-slate-500" /> {lead.contactPhone || 'N/A'}
                        </div>
                        <div className="flex items-center text-xs text-slate-300">
                           <Building2 className="w-3 h-3 mr-2 text-slate-500" /> {dealers.find(d => d.id === lead.assignedDealerId)?.name || 'Unassigned'}
                        </div>
                        
                        {/* Mobile Map View */}
                        <div className="mt-3 rounded-lg overflow-hidden border border-slate-700 h-32 relative">
                            <iframe
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                src={`https://maps.google.com/maps?q=${encodeURIComponent(lead.region + ', South Africa')}&t=&z=7&ie=UTF8&iwloc=&output=embed`}
                                className="opacity-80"
                            ></iframe>
                        </div>

                        {lead.groundingUrl && lead.groundingUrl !== '#' && (
                           <a href={lead.groundingUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center w-full text-xs bg-slate-800 text-blue-400 border border-slate-700 rounded py-2 mt-2">
                              <ExternalLink className="w-3 h-3 mr-2" /> View Original Source
                           </a>
                        )}

                        <button onClick={() => openEditModal(lead)} className="w-full text-xs text-slate-400 mt-2 border border-blue-500/30 rounded py-2">Edit Details</button>
                     </div>
                  )}
               </div>
            );
         })}
      </div>

      {/* Edit Contact Modal */}
      {editingLeadId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
              <h3 className="text-lg font-bold text-white mb-4">Edit Contact Details</h3>
              <div className="space-y-3">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                    <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2 text-sm" placeholder="Name" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                    <input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2 text-sm" placeholder="Phone" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                    <input type="text" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2 text-sm" placeholder="Email" />
                 </div>
              </div>
              <div className="flex gap-2 mt-6">
                 <button onClick={() => setEditingLeadId(null)} className="flex-1 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
                 <button onClick={saveContact} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold py-2 shadow-lg shadow-blue-900/20">Save Changes</button>
              </div>
           </div>
        </div>
      )}

      {/* Assign Dealer Modal */}
      {assignmentLeadId && (
         <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white">Assign Dealership</h3>
                  <button onClick={() => setAssignmentLeadId(null)} className="text-slate-500 hover:text-white transition-colors">
                     <X className="w-5 h-5" />
                  </button>
               </div>
               
               <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                     type="text" 
                     placeholder="Search by name, region or brand..." 
                     value={dealerSearch}
                     onChange={e => setDealerSearch(e.target.value)}
                     className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                     autoFocus
                  />
               </div>

               <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1 mb-4 border border-slate-700/50 rounded-lg bg-slate-900/30 p-1">
                  {dealers.filter(d => 
                     d.name.toLowerCase().includes(dealerSearch.toLowerCase()) || 
                     d.region.toLowerCase().includes(dealerSearch.toLowerCase()) ||
                     d.brand.toLowerCase().includes(dealerSearch.toLowerCase())
                  ).length === 0 ? (
                     <div className="p-8 text-center text-slate-500 text-sm">
                        <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p>No dealers found.</p>
                     </div>
                  ) : (
                     dealers.filter(d => 
                        d.name.toLowerCase().includes(dealerSearch.toLowerCase()) || 
                        d.region.toLowerCase().includes(dealerSearch.toLowerCase()) ||
                        d.brand.toLowerCase().includes(dealerSearch.toLowerCase())
                     ).map(d => (
                        <button 
                           key={d.id}
                           onClick={() => setSelectedDealerId(d.id)}
                           className={`w-full text-left p-3 rounded-lg text-sm flex justify-between items-center transition-all group ${
                              selectedDealerId === d.id 
                                 ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' 
                                 : 'hover:bg-slate-800 text-slate-300'
                           }`}
                        >
                           <div className="flex flex-col">
                              <span className="font-bold">{d.name}</span>
                              <span className={`text-xs ${selectedDealerId === d.id ? 'text-blue-200' : 'text-slate-500 group-hover:text-slate-400'}`}>
                                 {d.brand} • {d.contactPerson}
                              </span>
                           </div>
                           <span className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                              selectedDealerId === d.id 
                                 ? 'bg-blue-500/30 border-blue-400/30 text-white' 
                                 : 'bg-slate-800 border-slate-700 text-slate-500 group-hover:border-slate-600'
                           }`}>
                              {d.region}
                           </span>
                        </button>
                     ))
                  )}
               </div>
               
               <div className="flex gap-3 pt-2 border-t border-slate-700/50">
                  <button 
                     onClick={() => setAssignmentLeadId(null)} 
                     className="flex-1 py-2.5 text-slate-400 hover:text-white transition-colors text-sm font-medium"
                  >
                     Cancel
                  </button>
                  <button 
                     onClick={confirmAssignment} 
                     disabled={!selectedDealerId} 
                     className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold py-2.5 shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center"
                  >
                     Confirm Assignment
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Reminder Modal */}
      {reminderLeadId && (
         <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-sm p-6 shadow-2xl">
               <div className="flex items-center mb-4 text-white">
                  <CalendarClock className="w-5 h-5 mr-2 text-blue-400" />
                  <h3 className="text-lg font-bold">Schedule Follow-up</h3>
               </div>
               <div className="space-y-3">
                  <label className="block text-xs text-slate-400">Date</label>
                  <input type="date" value={reminderForm.date} onChange={e => setReminderForm({...reminderForm, date: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2 text-sm" />
                  <label className="block text-xs text-slate-400">Time (Optional)</label>
                  <input type="time" value={reminderForm.time} onChange={e => setReminderForm({...reminderForm, time: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2 text-sm" />
               </div>
               <div className="flex gap-2 mt-6">
                  <button onClick={() => setReminderLeadId(null)} className="flex-1 py-2 text-slate-400 hover:text-white">Cancel</button>
                  <button onClick={confirmReminder} disabled={!reminderForm.date} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded font-bold py-2">Set Reminder</button>
               </div>
            </div>
         </div>
      )}

      {/* Email Modal */}
      {emailModal && (
         <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95">
               <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50 rounded-t-xl">
                  <h3 className="font-bold text-white flex items-center">
                     <Sparkles className="w-4 h-4 mr-2 text-purple-400" /> AI Email Drafter
                  </h3>
                  <button onClick={() => setEmailModal(null)}><X className="w-5 h-5 text-slate-500 hover:text-white" /></button>
               </div>
               <div className="p-6">
                  <div className="space-y-3 mb-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">To</label>
                        <input type="text" readOnly value={emailModal.to} className="w-full bg-slate-900 border border-slate-700 text-slate-400 rounded p-2 text-sm" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject</label>
                        <input type="text" value={emailModal.subject} onChange={e => setEmailModal({...emailModal, subject: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2 text-sm" />
                     </div>
                  </div>
                  
                  <div className="relative">
                     {emailModal.loading && (
                        <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center z-10 rounded-lg">
                           <div className="text-center">
                              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
                              <p className="text-sm text-slate-300">Generating personalized script...</p>
                           </div>
                        </div>
                     )}
                     <textarea 
                        value={emailModal.body}
                        onChange={e => setEmailModal({...emailModal, body: e.target.value})}
                        className="w-full h-48 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-4 font-mono text-sm leading-relaxed resize-none focus:outline-none focus:border-blue-500"
                     />
                  </div>
                  
                  <div className="mt-4 flex justify-between items-center">
                     <button onClick={() => setShowComplianceInfo(!showComplianceInfo)} className="text-xs text-slate-500 hover:text-slate-300 flex items-center">
                        <ShieldCheck className="w-3 h-3 mr-1" /> POPIA Info
                     </button>
                     <div className="flex gap-3">
                        <button onClick={() => setEmailModal(null)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                        <button onClick={sendEmail} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold flex items-center">
                           <Send className="w-4 h-4 mr-2" /> Open Mail App
                        </button>
                     </div>
                  </div>
                  
                  {showComplianceInfo && (
                     <div className="mt-4 p-3 bg-slate-900 rounded border border-slate-800 text-[10px] text-slate-500 font-mono">
                        {POPIA_DISCLAIMER}
                     </div>
                  )}
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default LeadList;
