
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Users, DollarSign, Activity, Car, Trophy, Percent, CalendarClock, AlertCircle, Clock, Download, MapPin, Filter, Mail, Tag, UserPlus } from 'lucide-react';
import { Lead, LeadStatus, Dealership } from '../types';
import { downloadCSV, generateDealerPerformanceCSV } from '../services/exportService';
import { SA_REGIONS } from '../constants';

interface DashboardProps {
  leads: Lead[];
  dealers: Dealership[];
}

const Dashboard: React.FC<DashboardProps> = ({ leads, dealers }) => {
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  
  // --- Calculate Real Stats ---
  const totalLeads = leads.length;
  
  // Identify leads sitting in the "Holding Pen" (Unassigned)
  const unassignedLeads = leads.filter(l => !l.assignedDealerId).length;

  // Conversion Rate (Contacted + Qualified + Converted / Total)
  const activeLeads = leads.filter(l => l.status !== LeadStatus.NEW && l.status !== LeadStatus.ARCHIVED).length;
  const globalConversionRate = totalLeads > 0 ? ((activeLeads / totalLeads) * 100).toFixed(1) : "0.0";

  // Pipeline Value (Mock estimation: 1 lead = ~R500k potential, 10% closing prob)
  const pipelineValue = (totalLeads * 500000 * 0.1).toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 });

  // --- Reminders Logic ---
  const upcomingReminders = leads
    .filter(l => l.followUpDate && l.status !== LeadStatus.CONVERTED && l.status !== LeadStatus.ARCHIVED)
    .sort((a, b) => new Date(a.followUpDate!).getTime() - new Date(b.followUpDate!).getTime())
    .slice(0, 5);

  // --- Aggregate Model Popularity ---
  const modelCounts = leads.reduce((acc, lead) => {
    const model = lead.model || 'Unknown Model';
    acc[model] = (acc[model] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const modelData = Object.entries(modelCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => (b.count as number) - (a.count as number)) // Sort Descending
    .slice(0, 5); // Top 5

  const topBrand = leads.length > 0 
    ? leads.sort((a,b) => leads.filter(l => l.brand === b.brand).length - leads.filter(l => l.brand === a.brand).length)[0].brand 
    : "N/A";

  // --- Filter Dealers for Charts ---
  const chartDealers = selectedRegion === 'All' 
    ? dealers 
    : dealers.filter(d => d.region === selectedRegion);

  // --- Dealer Performance Data (Volume) ---
  const dealerVolume = chartDealers.map(d => ({
    name: d.name,
    shortName: d.name.length > 20 ? d.name.substring(0, 20) + '...' : d.name,
    converted: leads.filter(l => l.assignedDealerId === d.id && l.status === LeadStatus.CONVERTED).length,
    assigned: d.leadsAssigned || 0,
    // Extra data for Tooltip
    region: d.region,
    brand: d.brand,
    contact: d.contactPerson,
    email: d.email,
    plan: d.billing?.plan || 'Standard'
  }))
  .sort((a, b) => b.converted - a.converted)
  .slice(0, 5); // Top 5

  // --- Dealer Conversion Rates (Efficiency) ---
  const dealerEfficiency = chartDealers.map(d => {
    const convertedCount = leads.filter(l => l.assignedDealerId === d.id && l.status === LeadStatus.CONVERTED).length;
    const assignedCount = d.leadsAssigned || 0;
    const rate = assignedCount > 0 ? (convertedCount / assignedCount) * 100 : 0;
    
    return {
      name: d.name,
      shortName: d.name.length > 15 ? d.name.substring(0, 15) + '...' : d.name,
      rate: parseFloat(rate.toFixed(1)),
      converted: convertedCount,
      assigned: assignedCount,
      // Extra data for Tooltip
      region: d.region,
      brand: d.brand,
      contact: d.contactPerson,
      email: d.email,
      plan: d.billing?.plan || 'Standard'
    };
  })
  .filter(d => d.assigned > 0)
  .sort((a, b) => b.rate - a.rate)
  .slice(0, 5); // Top 5

  // Custom Tooltips
  const DealerVolumeTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-800 border border-slate-700 p-3 rounded shadow-xl text-sm max-w-[280px] z-50">
          <p className="font-bold text-white mb-1">{data.name}</p>
          <div className="space-y-1 mb-2">
            <p className="text-green-400 flex items-center">
              <Trophy className="w-3 h-3 mr-1" />
              Converted: <b>{data.converted}</b>
            </p>
            <p className="text-slate-400 flex items-center">
              <Users className="w-3 h-3 mr-1" />
              Assigned: {data.assigned}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-700 text-xs space-y-1.5 text-slate-400">
             <p className="flex items-center"><Car className="w-3 h-3 mr-2 text-slate-500" /> {data.brand}</p>
             <p className="flex items-center"><MapPin className="w-3 h-3 mr-2 text-slate-500" /> {data.region}</p>
             <p className="flex items-center"><Users className="w-3 h-3 mr-2 text-slate-500" /> {data.contact}</p>
             <p className="flex items-center truncate"><Mail className="w-3 h-3 mr-2 text-slate-500" /> {data.email}</p>
             <div className="flex items-center mt-1">
                <Tag className="w-3 h-3 mr-2 text-slate-500" /> 
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                   data.plan === 'Enterprise' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                   data.plan === 'Pro' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                   'bg-slate-700 text-slate-300 border-slate-600'
                }`}>
                   {data.plan} Plan
                </span>
             </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const DealerEfficiencyTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-800 border border-slate-700 p-3 rounded shadow-xl text-sm max-w-[280px] z-50">
          <p className="font-bold text-white mb-1">{data.name}</p>
          <div className="flex items-center mb-2">
             <Percent className="w-4 h-4 text-purple-400 mr-1" />
             <span className="text-xl font-bold text-white">{data.rate}%</span>
          </div>
          <p className="text-xs text-slate-400 mb-2">
            {data.converted} sales from {data.assigned} leads
          </p>
          <div className="pt-2 border-t border-slate-700 text-xs space-y-1.5 text-slate-400">
             <p className="flex items-center"><Car className="w-3 h-3 mr-2 text-slate-500" /> {data.brand}</p>
             <p className="flex items-center"><MapPin className="w-3 h-3 mr-2 text-slate-500" /> {data.region}</p>
             <p className="flex items-center"><Users className="w-3 h-3 mr-2 text-slate-500" /> {data.contact}</p>
             <p className="flex items-center truncate"><Mail className="w-3 h-3 mr-2 text-slate-500" /> {data.email}</p>
             <div className="flex items-center mt-1">
                <Tag className="w-3 h-3 mr-2 text-slate-500" /> 
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                   data.plan === 'Enterprise' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                   data.plan === 'Pro' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                   'bg-slate-700 text-slate-300 border-slate-600'
                }`}>
                   {data.plan} Plan
                </span>
             </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const handleExportStats = () => {
    const csv = generateDealerPerformanceCSV(dealers, leads);
    downloadCSV(csv, `autolead_dealer_performance_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Dealer Overview</h2>
          <p className="text-slate-400">Real-time performance metrics based on your current lead database.</p>
        </div>
        <button 
          onClick={handleExportStats}
          className="flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 hover:border-blue-500/50 px-4 py-2 rounded-lg transition-all shadow-lg"
        >
           <Download className="w-4 h-4" />
           <span>Export Report</span>
        </button>
      </header>

      {/* Reminders / Tasks Panel */}
      {upcomingReminders.length > 0 && (
        <div className="bg-gradient-to-r from-slate-800 to-slate-800/80 rounded-xl border border-slate-700 p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-4 text-amber-400 font-bold uppercase text-xs tracking-wider">
            <CalendarClock className="w-4 h-4" /> Upcoming Tasks
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingReminders.map(lead => {
              const dueDate = new Date(lead.followUpDate!);
              const isOverdue = dueDate < new Date();
              const isToday = dueDate.toDateString() === new Date().toDateString();
              
              return (
                <div key={lead.id} className={`bg-slate-900/80 rounded-lg p-3 border-l-4 flex flex-col ${isOverdue ? 'border-l-red-500' : isToday ? 'border-l-amber-500' : 'border-l-blue-500'}`}>
                  <div className="flex justify-between items-start">
                    <span className="text-white font-semibold text-sm truncate max-w-[150px]">{lead.contactName || lead.brand}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isOverdue ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-300'}`}>
                      {dueDate.toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{lead.model}</p>
                  <div className="mt-2 flex items-center text-xs gap-2">
                    {isOverdue && <AlertCircle className="w-3 h-3 text-red-500" />}
                    <span className={isOverdue ? 'text-red-400' : 'text-blue-400'}>
                       {dueDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    <span className="text-slate-600 mx-1">•</span>
                    <span className="text-slate-500">{lead.intentSummary.substring(0, 30)}...</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-sm mb-1">Total Leads</p>
              <h3 className="text-3xl font-bold text-white">{totalLeads}</h3>
            </div>
            <div className="bg-blue-500/20 p-2 rounded-lg">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-slate-500">
            <span>Live database count</span>
          </div>
        </div>

        {/* Unassigned Leads (New Card) */}
        <div className="bg-gradient-to-br from-indigo-900/40 to-slate-800 p-6 rounded-xl border border-indigo-500/30 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10">
             <UserPlus className="w-16 h-16 text-indigo-400" />
          </div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-indigo-300 text-sm mb-1 font-semibold">Unassigned Opportunities</p>
              <h3 className="text-3xl font-bold text-white">{unassignedLeads}</h3>
            </div>
            <div className="bg-indigo-500/20 p-2 rounded-lg">
              <UserPlus className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-indigo-300 relative z-10">
            <span>Waiting for new dealers</span>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-sm mb-1">Pipeline Value</p>
              <h3 className="text-3xl font-bold text-white">{pipelineValue}</h3>
            </div>
            <div className="bg-amber-500/20 p-2 rounded-lg">
              <DollarSign className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-slate-500">
             <span>Estimated potential revenue</span>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-sm mb-1">Top Brand</p>
              <h3 className="text-3xl font-bold text-white">{topBrand}</h3>
            </div>
            <div className="bg-purple-500/20 p-2 rounded-lg">
              <Trophy className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-slate-500">
             <span>Most frequent inquiry</span>
          </div>
        </div>
      </div>

      {/* Charts Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-white flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-blue-400" /> Performance Analytics
        </h3>
        <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
          <Filter className="w-4 h-4 text-slate-500 ml-2 mr-2" />
          <select 
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="bg-transparent text-sm text-white focus:outline-none p-1 cursor-pointer"
          >
            <option value="All" className="bg-slate-800">All Regions</option>
            {SA_REGIONS.map(r => (
              <option key={r} value={r} className="bg-slate-800">{r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dealer Volume Chart */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
           <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Top Dealers by Volume ({selectedRegion})</h3>
           {dealerVolume.length > 0 ? (
             <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dealerVolume} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                    <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                    <YAxis dataKey="shortName" type="category" stroke="#94a3b8" fontSize={12} width={100} />
                    <Tooltip content={<DealerVolumeTooltip />} cursor={{fill: '#334155', opacity: 0.4}} />
                    <Bar dataKey="converted" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
             </div>
           ) : (
             <div className="h-[300px] flex flex-col items-center justify-center text-slate-500">
                <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                <p>No data found for this region.</p>
             </div>
           )}
        </div>

        {/* Dealer Efficiency Chart */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
           <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Conversion Efficiency (%)</h3>
           {dealerEfficiency.length > 0 ? (
             <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={dealerEfficiency} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                    <XAxis type="number" stroke="#94a3b8" fontSize={12} domain={[0, 100]} />
                    <YAxis dataKey="shortName" type="category" stroke="#94a3b8" fontSize={12} width={100} />
                    <Tooltip content={<DealerEfficiencyTooltip />} cursor={{fill: '#334155', opacity: 0.4}} />
                    <Bar dataKey="rate" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
           ) : (
             <div className="h-[300px] flex flex-col items-center justify-center text-slate-500">
                <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                <p>No data found for this region.</p>
             </div>
           )}
        </div>
      </div>

      {/* Popular Models */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
         <h3 className="text-lg font-bold text-white mb-4">Most Requested Models</h3>
         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {modelData.map((m, idx) => (
               <div key={idx} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 flex items-center justify-between">
                  <div>
                     <p className="text-white font-medium text-sm">{m.name}</p>
                     <p className="text-slate-500 text-xs">{m.count} inquiries</p>
                  </div>
                  <div className="bg-slate-800 p-2 rounded-full text-blue-400 text-xs font-bold">
                     #{idx + 1}
                  </div>
               </div>
            ))}
         </div>
      </div>
    </div>
  );
};

export default Dashboard;
