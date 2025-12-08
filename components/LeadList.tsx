import React, { useState, useEffect, useMemo } from 'react';
import { Lead, LeadStatus, Dealership } from '../types';
import { Phone, Mail, Trash2, CheckCircle, ExternalLink, Filter, Edit2, X, Building2, Clock, Power, Search, CheckSquare, RefreshCw, Network, Globe, Download, Save, User, ChevronDown, ChevronUp, ChevronRight, Facebook, Car, MessageCircle, ShoppingBag, Users, Laptop, Calendar, Flame, CornerDownRight, Bell, CalendarClock, Send, Sparkles, Loader2, Check, BarChart, ShieldCheck, MapPin, Plus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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

  }, [leads,