
import React, { useState, useEffect } from 'react';
import { Lead, LeadStatus, Dealership } from '../types';
import { Phone, Mail, Trash2, CheckCircle, ExternalLink, Filter, Edit2, X, Building2, Clock, Power, Search, CheckSquare, RefreshCw, Network, Globe, Download, Save, User, ChevronDown, ChevronUp, Facebook, Car, MessageCircle, ShoppingBag, Users, Laptop, Calendar, Flame, CornerDownRight, Bell, CalendarClock, Send, Sparkles, Loader2, Check, BarChart, ShieldCheck } from 'lucide-react';
import { NAAMSA_BRANDS, POPIA_DISCLAIMER } from '../constants';
import { generateCSV, downloadCSV } from '../services/exportService';
import { generateOutreachScript } from '../services/geminiService';
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

const LeadList: React.FC<LeadListProps> = ({ leads, dealers, updateStatus, bulkUpdateStatus, updateContact, assignDealer, scheduleFollowUp, onRefresh }) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [brandFilter, setBrandFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  
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
  const [emailModal, setEmailModal] = useState<{ open: boolean; leadId: string; to: string; subject: string; body: string; loading: boolean } | null>(null);

  // Compliance Info State
  const [showComplianceInfo, setShowComplianceInfo] = useState(false);

  // Auto-Refresh Interval
  useEffect(() => {
    // Refresh leads every 60 seconds
    const interval = setInterval(() => {
      handleRefresh();
    }, 60000);

    // Clear interval on unmount
    return () => clearInterval(interval);
  }, []); // Empty dependency array ensures interval is set once. handleRefresh ref is stable enough or we accept stale closure for the trigger.

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

  const getSourceIcon = (source: string) => {
    const s = source.toLowerCase();
    if (s.includes('autotrader')) return <ShoppingBag className="w-4 h-4 mr-1 text-red-500" />;
    if (s.includes('facebook')) return <Facebook className="w-4 h-4 mr-1 text-blue-600" />;
    if (s.includes('4x4') || s.includes('community')) return <Users className="w-4 h-4 mr-1 text-emerald-500" />;
    if (s.includes('website') || s.includes('inquiry') || s.includes('web')) return <Laptop className="w-4 h-4 mr-1 text-purple-400" />;
    return <Globe className="w-4 h-4 mr-1 text-slate-400" />;
  };

  // Filter Logic
  const filteredLeads = leads.filter(lead => {
    const matchesStatus = statusFilter === 'ALL' || lead.status === statusFilter;
    const matchesBrand = brandFilter === 'ALL' || lead.brand === brandFilter;
    const matchesSearch = 
      (lead.contactName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.intentSummary.toLowerCase().includes(searchTerm.toLowerCase());
      
    return matchesStatus && matchesBrand && matchesSearch;
  });

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    if (selectedIds.length === filteredLeads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLeads.map(l => l.id));
    }
  };

  const handleBulkStatusChange = (status: LeadStatus) => {
    if (selectedIds.length === 0) return;
    bulkUpdateStatus(selectedIds, status);
    setSelectedIds([]);
  };

  const handleExportCSV = () => {
    const csv = generateCSV(filteredLeads);
    downloadCSV(csv, `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleGenerateScript = async (lead: Lead) => {
    setEmailModal({ open: true, leadId: lead.id, to: lead.contactEmail || '', subject: constructEmailSubject(lead.brand, lead.model), body: '', loading: true });
    try {
      const script = await generateOutreachScript(lead.intentSummary, lead.source, lead.brand);
      setEmailModal(prev => prev ? { ...prev, body: script, loading: false } : null);
    } catch (e) {
      setEmailModal(prev => prev ? { ...prev, body: "Could not generate script.", loading: false } : null);
    }
  };

  const handleSendEmail = () => {
    if (!emailModal) return;
    openNativeEmailClient(emailModal.to, emailModal.subject, emailModal.body);
    setEmailModal(null);
  };

  const handleEditClick = (lead: Lead) => {
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

  const handleAssignClick = (leadId: string) => {
    setAssignmentLeadId(leadId);
    setDealerSearch('');
    const lead = leads.find(l => l.id === leadId);
    if (lead) setSelectedDealerId(lead.assignedDealerId || '');
  };

  const saveAssignment = () => {
    if (assignmentLeadId && selectedDealerId) {
      assignDealer(assignmentLeadId, selectedDealerId);
      setAssignmentLeadId(null);
    }
  };

  const handleReminderClick = (leadId: string) => {
    setReminderLeadId(leadId);
    const lead = leads.find(l => l.id === leadId);
    if (lead && lead.followUpDate) {
      const dateObj = new Date(lead.followUpDate);
      setReminderForm({
        date: dateObj.toISOString().split('T')[0],
        time: dateObj.toTimeString().split(' ')[0].substring(0, 5)
      });
    } else {
      setReminderForm({ date: '', time: '' });
    }
  };

  const saveReminder = () => {
    if (reminderLeadId && reminderForm.date) {
      const dateTime = `${reminderForm.date}T${reminderForm.time || '09:00'}:00`;
      scheduleFollowUp(reminderLeadId, dateTime);
      setReminderLeadId(null);
    }
  };

  // Filter and Sort Dealers for Assignment Modal
  const filteredDealers = dealers
    .filter(d => 
      d.name.toLowerCase().includes(dealerSearch.toLowerCase()) || 
      d.region.toLowerCase().includes(dealerSearch.toLowerCase())
    )
    .sort((a, b) => {
      // 1. Sort by Status (Active first)
      if (a.status !== 'Active') return 1;
      if (b.status !== 'Active') return -1;

      // 2. Sort by Capacity Usage (Ascending - less full is better)
      const usageA = a.maxLeadsCapacity ? (a.leadsAssigned || 0) / a.maxLeadsCapacity : 0;
      const usageB = b.maxLeadsCapacity ? (b.leadsAssigned || 0) / b.maxLeadsCapacity : 0;
      
      // If capacity is similar, sort by absolute assigned count
      if (Math.abs(usageA - usageB) < 0.05) {
         return (a.leadsAssigned || 0) - (b.leadsAssigned || 0);
      }
      
      return usageA - usageB;
    });

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">My Leads CRM</h2>
            <p className="text-slate-400">Manage and convert your active pipeline.</p>
          </div>
          <button 
            onClick={() => setShowComplianceInfo(true)}
            className="text-slate-500 hover:text-green-400 transition-colors mt-1"
            title="POPIA Compliance Info"
          >
            <ShieldCheck className="w-5 h-5" />
          </button>
        </div>
        <div className="flex gap-2 items-center">
          {isRefreshing ? (
            <span className="flex items-center text-xs text-blue-400 animate-pulse mr-2 transition-all">
               <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Updating live...
            </span>
          ) : (
            <span className="text-xs text-slate-500 hidden md:inline mr-2 transition-all">
               Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button 
            onClick={handleRefresh} 
            className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-700 disabled:opacity-50"
            disabled={isRefreshing}
            title="Auto-refreshes every 60s"
          >
             <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={handleExportCSV} className="flex items-center px-4 py-2 bg-slate-800 text-blue-400 hover:text-white rounded-lg border border-slate-700 transition-colors">
             <Download className="w-4 h-4 mr-2" /> Export CSV
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
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
          className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2"
        >
          <option value="ALL">All Statuses</option>
          {Object.values(LeadStatus).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select 
          value={brandFilter} 
          onChange={(e) => setBrandFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2"
        >
          <option value="ALL">All Brands</option>
          {NAAMSA_BRANDS.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2">
           <span className="text-blue-200 text-sm font-medium ml-2">{selectedIds.length} leads selected</span>
           <div className="flex gap-2">
              <button onClick={() => handleBulkStatusChange(LeadStatus.QUALIFIED)} className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded">Mark Qualified</button>
              <button onClick={() => handleBulkStatusChange(LeadStatus.ARCHIVED)} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded">Archive</button>
           </div>
        </div>
      )}

      {/* Leads List */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-xl">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase font-bold border-b border-slate-700">
                <th className="px-4 py-4 w-10">
                  <input type="checkbox" checked={selectedIds.length === filteredLeads.length && filteredLeads.length > 0} onChange={selectAll} className="rounded border-slate-600 bg-slate-800" />
                </th>
                <th className="px-4 py-4">Vehicle & Interest</th>
                <th className="px-4 py-4">Score</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Contact</th>
                <th className="px-4 py-4">Dealer</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredLeads.map(lead => {
                const score = calculateLeadScore(lead, dealers);
                return (
                  <React.Fragment key={lead.id}>
                    <tr className={`hover:bg-slate-700/30 transition-colors ${lead.sentiment === 'HOT' ? 'bg-orange-500/5' : ''}`}>
                      <td className="px-4 py-4 align-top">
                        <input type="checkbox" checked={selectedIds.includes(lead.id)} onChange={() => toggleSelection(lead.id)} className="rounded border-slate-600 bg-slate-800" />
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-col">
                           <span className="font-bold text-white text-sm">{lead.brand} {lead.model}</span>
                           <span className="text-xs text-slate-400 mt-1 line-clamp-1">{lead.intentSummary}</span>
                           <div className="flex items-center mt-2 text-xs text-slate-500">
                              {getSourceIcon(lead.source)} {lead.source}
                              <span className="mx-2">•</span>
                              {new Date(lead.dateDetected).toLocaleDateString()}
                           </div>
                           {lead.followUpDate && (
                              <div className="flex items-center mt-1 text-xs text-amber-500">
                                 <CalendarClock className="w-3 h-3 mr-1" />
                                 Due: {new Date(lead.followUpDate).toLocaleDateString()}
                              </div>
                           )}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                         <div className={`inline-flex items-center px-2 py-1 rounded border text-xs font-bold ${
                            score > 70 ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                            score > 40 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            'bg-slate-700 text-slate-400 border-slate-600'
                         }`} title="AI Score based on intent, time, and proximity">
                            <Flame className={`w-3 h-3 mr-1 ${score > 70 ? 'fill-green-400' : ''}`} /> {score}
                         </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <select 
                          value={lead.status}
                          onChange={(e) => updateStatus(lead.id, e.target.value as LeadStatus)}
                          className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1 focus:outline-none focus:border-blue-500"
                        >
                          {Object.values(LeadStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-4 align-top">
                        {lead.contactName || lead.contactPhone ? (
                          <div className="text-sm">
                             <p className="text-white font-medium">{lead.contactName || 'Unknown'}</p>
                             <div className="flex flex-col gap-1 mt-1">
                                {lead.contactPhone && <a href={`tel:${lead.contactPhone}`} className="text-blue-400 hover:underline flex items-center text-xs"><Phone className="w-3 h-3 mr-1" /> {lead.contactPhone}</a>}
                                {lead.contactEmail && <a href={`mailto:${lead.contactEmail}`} className="text-blue-400 hover:underline flex items-center text-xs"><Mail className="w-3 h-3 mr-1" /> {lead.contactEmail}</a>}
                             </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">No contact info</span>
                        )}
                        <button onClick={() => handleEditClick(lead)} className="mt-2 text-xs text-slate-500 hover:text-white flex items-center">
                           <Edit2 className="w-3 h-3 mr-1" /> Edit
                        </button>
                      </td>
                      <td className="px-4 py-4 align-top">
                         <div className="text-xs">
                            {lead.assignedDealerId ? (
                               <div className="flex flex-col">
                                  <span className="text-slate-300">{dealers.find(d => d.id === lead.assignedDealerId)?.name || 'Unknown Dealer'}</span>
                                  {lead.assignmentType && <span className="text-slate-500 italic">({lead.assignmentType})</span>}
                               </div>
                            ) : (
                               <span className="text-slate-500">Unassigned</span>
                            )}
                            <button onClick={() => handleAssignClick(lead.id)} className="mt-1 text-blue-400 hover:underline">Reassign</button>
                         </div>
                      </td>
                      <td className="px-4 py-4 align-top text-right">
                         <div className="flex justify-end gap-2">
                            {lead.contactEmail && (
                               <button onClick={() => handleGenerateScript(lead)} className="p-2 bg-slate-700 hover:bg-blue-600 text-white rounded-lg transition-colors" title="Email">
                                  <Send className="w-4 h-4" />
                               </button>
                            )}
                            <button onClick={() => handleReminderClick(lead.id)} className={`p-2 bg-slate-700 hover:bg-amber-600 text-white rounded-lg transition-colors ${lead.followUpDate ? 'text-amber-400' : ''}`} title="Reminder">
                               <Bell className="w-4 h-4" />
                            </button>
                            <a href={lead.groundingUrl} target="_blank" rel="noreferrer" className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors" title="View Source">
                               <ExternalLink className="w-4 h-4" />
                            </a>
                         </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile List - Optimized Card Layout */}
        <div className="md:hidden grid grid-cols-1 gap-4 p-4">
           {filteredLeads.map(lead => {
             const score = calculateLeadScore(lead, dealers);
             return (
              <div key={lead.id} className="bg-slate-800 rounded-xl border border-slate-700 p-4 shadow-sm relative overflow-hidden">
                 {/* Lead Score Bar on left */}
                 <div className={`absolute left-0 top-0 bottom-0 w-1 ${score > 70 ? 'bg-green-500' : score > 40 ? 'bg-amber-500' : 'bg-slate-600'}`}></div>
                 
                 <div className="pl-3">
                    <div className="flex justify-between items-start mb-2">
                       <div className="flex items-center gap-3">
                          <input type="checkbox" checked={selectedIds.includes(lead.id)} onChange={() => toggleSelection(lead.id)} className="rounded border-slate-600 bg-slate-800" />
                          <div>
                             <h3 className="text-white font-bold text-base">{lead.brand} {lead.model}</h3>
                             <p className="text-xs text-slate-400 flex items-center mt-0.5">
                                {getSourceIcon(lead.source)} {lead.source}
                                <span className="mx-1">•</span>
                                {new Date(lead.dateDetected).toLocaleDateString()}
                             </p>
                          </div>
                       </div>
                       <div className="flex flex-col items-end gap-1">
                          <div className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center ${lead.sentiment === 'HOT' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-slate-700 text-slate-300 border-slate-600'}`}>
                             {lead.sentiment === 'HOT' && <Flame className="w-3 h-3 mr-1" />}
                             {lead.sentiment}
                          </div>
                          <div className="flex items-center text-xs font-bold text-slate-500">
                             <BarChart className="w-3 h-3 mr-1" /> Score: {score}
                          </div>
                       </div>
                    </div>
                    
                    <p className="text-sm text-slate-300 mb-3 bg-slate-900/50 p-2 rounded border border-slate-800/50 italic">
                       "{lead.intentSummary}"
                    </p>
                    
                    {/* Status & Dealer Row */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                       <div>
                          <label className="text-[10px] text-slate-500 uppercase font-bold">Status</label>
                          <select 
                             value={lead.status}
                             onChange={(e) => updateStatus(lead.id, e.target.value as LeadStatus)}
                             className="w-full bg-slate-900 border border-slate-600 text-white rounded px-2 py-1.5 text-xs mt-1 focus:ring-1 focus:ring-blue-500"
                          >
                             {Object.values(LeadStatus).map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                       </div>
                       <div>
                          <label className="text-[10px] text-slate-500 uppercase font-bold">Assigned Dealer</label>
                          <button 
                             onClick={() => handleAssignClick(lead.id)}
                             className="w-full text-left bg-slate-900 border border-slate-600 text-blue-400 rounded px-2 py-1.5 text-xs mt-1 truncate hover:border-blue-500 transition-colors"
                          >
                             {dealers.find(d => d.id === lead.assignedDealerId)?.name || 'Unassigned (Tap to assign)'}
                          </button>
                       </div>
                    </div>

                    {/* Contact Info */}
                    <div className="flex items-center justify-between mb-4 pt-2 border-t border-slate-700/50">
                       {lead.contactName || lead.contactPhone ? (
                          <div className="flex flex-col">
                             <span className="text-white text-sm font-medium">{lead.contactName || 'Unknown Name'}</span>
                             <div className="flex items-center gap-3 mt-1">
                                {lead.contactPhone && <a href={`tel:${lead.contactPhone}`} className="text-blue-400 text-xs flex items-center"><Phone className="w-3 h-3 mr-1"/> Call</a>}
                                {lead.contactEmail && <a href={`mailto:${lead.contactEmail}`} className="text-blue-400 text-xs flex items-center"><Mail className="w-3 h-3 mr-1"/> Email</a>}
                             </div>
                          </div>
                       ) : (
                          <span className="text-xs text-slate-500 italic">No contact details</span>
                       )}
                       <button onClick={() => handleEditClick(lead)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors border border-slate-700">
                          <Edit2 className="w-4 h-4" />
                       </button>
                    </div>

                    {/* Quick Actions Footer */}
                    <div className="flex gap-2">
                       {lead.contactEmail && (
                          <button onClick={() => handleGenerateScript(lead)} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center shadow-lg shadow-blue-900/20">
                             <Send className="w-3 h-3 mr-1.5" /> Draft Email
                          </button>
                       )}
                       <button onClick={() => handleReminderClick(lead.id)} className={`flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold flex items-center justify-center ${lead.followUpDate ? 'text-amber-400' : ''}`}>
                          <Bell className="w-3 h-3 mr-1.5" /> {lead.followUpDate ? 'Reminder Set' : 'Remind Me'}
                       </button>
                       <a href={lead.groundingUrl} target="_blank" rel="noreferrer" className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 flex items-center justify-center">
                          <ExternalLink className="w-4 h-4" />
                       </a>
                    </div>
                 </div>
              </div>
           );
           })}
        </div>
        
        {filteredLeads.length === 0 && (
           <div className="p-8 text-center text-slate-500">
              <p>No leads found matching your filters.</p>
           </div>
        )}
      </div>

      {/* MODALS */}
      
      {/* Edit Contact Modal */}
      {editingLeadId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Edit Contact Details</h3>
            <div className="space-y-3">
              <input type="text" placeholder="Name" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2" />
              <input type="text" placeholder="Phone" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2" />
              <input type="email" placeholder="Email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2" />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEditingLeadId(null)} className="px-4 py-2 text-slate-400">Cancel</button>
              <button onClick={saveContact} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Dealer Modal */}
      {assignmentLeadId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md flex flex-col h-[80vh] md:h-auto">
            <div className="mb-4">
               <h3 className="text-xl font-bold text-white">Assign Dealership</h3>
               <p className="text-sm text-slate-400 mt-1">Select a dealer to route this lead to.</p>
            </div>
            
            {/* Search within Modal */}
            <div className="relative mb-4">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
               <input 
                  type="text" 
                  placeholder="Search dealer or region..." 
                  value={dealerSearch}
                  onChange={(e) => setDealerSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
               />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-0 md:max-h-[300px]">
               {/* Header for Sort Info */}
               <div className="flex justify-between px-3 text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">
                  <span>Dealer</span>
                  <span>Load</span>
               </div>

               {filteredDealers.map(d => {
                  const capacityPercent = d.maxLeadsCapacity && d.maxLeadsCapacity > 0 
                     ? Math.round(((d.leadsAssigned || 0) / d.maxLeadsCapacity) * 100) 
                     : 0;
                  const isFull = d.maxLeadsCapacity && (d.leadsAssigned || 0) >= d.maxLeadsCapacity;
                  
                  return (
                     <div 
                        key={d.id} 
                        onClick={() => !isFull && setSelectedDealerId(d.id)}
                        className={`p-3 border rounded-lg cursor-pointer flex justify-between items-center transition-all ${
                           selectedDealerId === d.id 
                              ? 'border-blue-500 bg-blue-500/10' 
                              : isFull 
                                 ? 'border-slate-800 bg-slate-900 opacity-60 cursor-not-allowed'
                                 : 'border-slate-700 hover:bg-slate-700'
                        }`}
                     >
                        <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-start mb-1">
                              <span className={`font-bold text-sm truncate ${selectedDealerId === d.id ? 'text-blue-400' : 'text-white'}`}>{d.name}</span>
                              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded ml-2">{d.region}</span>
                           </div>
                           
                           <div className="flex items-center gap-2 text-xs">
                              {/* Plan Badge */}
                              <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                                 d.billing.plan === 'Enterprise' ? 'text-purple-400 border-purple-500/30 bg-purple-500/10' :
                                 d.billing.plan === 'Pro' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' :
                                 'text-slate-400 border-slate-600 bg-slate-800'
                              }`}>
                                 {d.billing.plan}
                              </span>

                              {/* Capacity Text */}
                              <span className={`${isFull ? 'text-red-400' : capacityPercent > 80 ? 'text-amber-400' : 'text-slate-500'}`}>
                                 {d.leadsAssigned || 0} / {d.maxLeadsCapacity || '∞'} leads
                              </span>
                           </div>
                           {/* Load Bar */}
                           <div className="w-full bg-slate-800 h-1 mt-2 rounded-full overflow-hidden">
                              <div className={`h-full ${isFull ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, capacityPercent)}%` }}></div>
                           </div>
                        </div>
                        {selectedDealerId === d.id && <Check className="w-5 h-5 text-blue-500 ml-3" />}
                     </div>
                  );
               })}
               
               {filteredDealers.length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-sm">No dealers found.</div>
               )}
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-700">
              <button onClick={() => setAssignmentLeadId(null)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
              <button 
                 onClick={saveAssignment} 
                 disabled={!selectedDealerId}
                 className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-medium shadow-lg shadow-blue-900/20"
              >
                 Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {emailModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold text-white mb-4">Draft Outreach Email</h3>
            {emailModal.loading ? (
               <div className="py-12 flex justify-center text-slate-400">
                  <Loader2 className="animate-spin mr-2" /> Generating personalized script...
               </div>
            ) : (
               <div className="space-y-3">
                 <div>
                    <label className="text-xs text-slate-500 uppercase">To</label>
                    <input type="text" value={emailModal.to} readOnly className="w-full bg-slate-900 border border-slate-700 text-slate-400 rounded p-2" />
                 </div>
                 <div>
                    <label className="text-xs text-slate-500 uppercase">Subject</label>
                    <input type="text" value={emailModal.subject} onChange={e => setEmailModal({...emailModal, subject: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2" />
                 </div>
                 <div>
                    <label className="text-xs text-slate-500 uppercase">Body</label>
                    <textarea rows={6} value={emailModal.body} onChange={e => setEmailModal({...emailModal, body: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2" />
                 </div>
               </div>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEmailModal(null)} className="px-4 py-2 text-slate-400">Cancel</button>
              <button onClick={handleSendEmail} disabled={emailModal.loading} className="px-4 py-2 bg-green-600 text-white rounded flex items-center">
                 <Send className="w-4 h-4 mr-2" /> Open Mail App
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Reminder Modal */}
      {reminderLeadId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold text-white mb-4">Schedule Follow-up</h3>
            <div className="space-y-3">
              <input type="date" value={reminderForm.date} onChange={e => setReminderForm({...reminderForm, date: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2" />
              <input type="time" value={reminderForm.time} onChange={e => setReminderForm({...reminderForm, time: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2" />
            </div>
            <div className="flex justify-end gap-2 mt-4">
               <button onClick={() => setReminderLeadId(null)} className="px-4 py-2 text-slate-400">Cancel</button>
               <button onClick={saveReminder} className="px-4 py-2 bg-amber-600 text-white rounded">Set Reminder</button>
            </div>
          </div>
        </div>
      )}

      {/* POPIA INFO MODAL */}
      {showComplianceInfo && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/50 rounded-t-xl">
              <div className="flex items-center space-x-3">
                <ShieldCheck className="w-6 h-6 text-green-400" />
                <h3 className="text-xl font-bold text-white">POPIA Compliance</h3>
              </div>
              <button onClick={() => setShowComplianceInfo(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
               <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                  <div className="whitespace-pre-wrap">{POPIA_DISCLAIMER}</div>
               </div>
            </div>
            <div className="p-6 border-t border-slate-700 flex justify-end bg-slate-900/50 rounded-b-xl">
              <button 
                onClick={() => setShowComplianceInfo(false)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-bold"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LeadList;
