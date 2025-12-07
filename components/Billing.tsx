
import React, { useState } from 'react';
import { Dealership, Lead } from '../types';
import { DollarSign, TrendingUp, Building2, AlertCircle, Search, ArrowUpRight, Download, Check, FileText } from 'lucide-react';
import { generateInvoiceCSV, downloadCSV } from '../services/exportService';

interface BillingProps {
  dealers: Dealership[];
  leads: Lead[];
}

const Billing: React.FC<BillingProps> = ({ dealers, leads }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Aggregate Stats
  const totalUnbilled = dealers.reduce((acc, d) => acc + d.billing.currentUnbilledAmount, 0);
  const totalLifetime = dealers.reduce((acc, d) => acc + d.billing.totalSpent, 0);

  // Filter Dealers
  const filteredDealers = dealers.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.region.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 });
  };

  const handleGenerateInvoice = (dealer: Dealership) => {
    const csv = generateInvoiceCSV(dealer, leads);
    const filename = `Invoice_${dealer.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csv, filename);
  };

  const handleGenerateAllInvoices = () => {
    if (confirm("Generate and download invoices for all unbilled dealers?")) {
      dealers.forEach(d => {
        if (d.billing.currentUnbilledAmount > 0) {
          handleGenerateInvoice(d);
        }
      });
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-20 md:pb-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Billing & Revenue</h2>
          <p className="text-slate-400 text-sm md:text-base">Financial overview of your dealership network.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="text-right hidden md:block">
              <p className="text-xs text-slate-500 uppercase font-bold">Next Payout</p>
              <p className="text-white font-mono">{new Date().toISOString().split('T')[0]}</p>
           </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Unbilled Revenue */}
        <div className="bg-gradient-to-br from-blue-900/40 to-slate-900 border border-blue-500/30 p-6 rounded-2xl shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign className="w-24 h-24 text-blue-400" />
          </div>
          <div className="relative z-10">
            <p className="text-blue-300 text-sm font-medium mb-1 flex items-center">
               <AlertCircle className="w-4 h-4 mr-1" /> Outstanding Revenue
            </p>
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">{formatCurrency(totalUnbilled)}</h3>
            <button 
               onClick={handleGenerateAllInvoices}
               className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-blue-900/20 transition-all flex items-center"
            >
               Run Batch Invoicing <ArrowUpRight className="w-3 h-3 ml-1" />
            </button>
          </div>
        </div>

        {/* Lifetime Revenue */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-4">
             <div>
                <p className="text-slate-400 text-sm font-medium">Lifetime Earnings</p>
                <h3 className="text-2xl md:text-3xl font-bold text-white">{formatCurrency(totalLifetime)}</h3>
             </div>
             <div className="bg-green-500/20 p-2 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-400" />
             </div>
          </div>
          <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
             <div className="bg-green-500 h-full w-[70%]"></div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Total value processed through platform.</p>
        </div>

        {/* Active Dealers */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-4">
             <div>
                <p className="text-slate-400 text-sm font-medium">Active Accounts</p>
                <h3 className="text-2xl md:text-3xl font-bold text-white">{dealers.length}</h3>
             </div>
             <div className="bg-purple-500/20 p-2 rounded-lg">
                <Building2 className="w-6 h-6 text-purple-400" />
             </div>
          </div>
          <div className="flex -space-x-2 overflow-hidden">
             {dealers.slice(0, 5).map((d, i) => (
                <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-slate-800 bg-slate-600 flex items-center justify-center text-xs font-bold text-white">
                   {d.name.charAt(0)}
                </div>
             ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">Dealers across {new Set(dealers.map(d => d.region)).size} regions.</p>
        </div>
      </div>

      {/* Operational Section */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
        {/* Toolbar */}
        <div className="p-4 md:p-5 border-b border-slate-700 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-slate-900/50">
           <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search dealer, email or region..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
           </div>
           <div className="text-sm text-slate-400">
              Showing <span className="text-white font-bold">{filteredDealers.length}</span> records
           </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
             <thead>
                <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase font-bold border-b border-slate-700">
                   <th className="px-6 py-4">Dealership</th>
                   <th className="px-6 py-4">Plan</th>
                   <th className="px-6 py-4 text-right">Outstanding</th>
                   <th className="px-6 py-4 text-right">Lifetime</th>
                   <th className="px-6 py-4">Last Billed</th>
                   <th className="px-6 py-4 text-right">Actions</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-700">
                {filteredDealers.map((dealer) => (
                   <tr key={dealer.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4">
                         <div className="font-medium text-white">{dealer.name}</div>
                         <div className="text-xs text-slate-500">{dealer.email}</div>
                      </td>
                      <td className="px-6 py-4">
                         <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${
                            dealer.billing.plan === 'Enterprise' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                            dealer.billing.plan === 'Pro' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            'bg-slate-700 text-slate-300 border-slate-600'
                         }`}>
                            {dealer.billing.plan}
                         </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className="font-bold text-white">{formatCurrency(dealer.billing.currentUnbilledAmount)}</div>
                         <div className="text-xs text-slate-500">{dealer.leadsAssigned} leads</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className="text-slate-300">{formatCurrency(dealer.billing.totalSpent)}</div>
                      </td>
                      <td className="px-6 py-4">
                         <span className="text-sm text-slate-400">{dealer.billing.lastBilledDate}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <button 
                            onClick={() => handleGenerateInvoice(dealer)}
                            className="text-blue-400 hover:text-blue-300 text-xs font-medium flex items-center justify-end ml-auto hover:underline"
                         >
                            <FileText className="w-4 h-4 mr-1" /> Generate Invoice
                         </button>
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden grid grid-cols-1 divide-y divide-slate-700">
           {filteredDealers.map((dealer) => (
              <div key={dealer.id} className="p-4 space-y-3">
                 <div className="flex justify-between items-start">
                    <div>
                       <h3 className="font-bold text-white">{dealer.name}</h3>
                       <p className="text-xs text-slate-500">{dealer.region}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                       dealer.billing.plan === 'Enterprise' ? 'bg-purple-500/10 text-purple-400' :
                       dealer.billing.plan === 'Pro' ? 'bg-blue-500/10 text-blue-400' :
                       'bg-slate-700 text-slate-300'
                    }`}>
                       {dealer.billing.plan}
                    </span>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                    <div>
                       <p className="text-[10px] text-slate-500 uppercase font-bold">Due Now</p>
                       <p className="text-lg font-bold text-white">{formatCurrency(dealer.billing.currentUnbilledAmount)}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] text-slate-500 uppercase font-bold">Lifetime</p>
                       <p className="text-sm text-slate-300">{formatCurrency(dealer.billing.totalSpent)}</p>
                    </div>
                 </div>

                 <div className="flex justify-between items-center pt-2">
                    <p className="text-xs text-slate-500">Last Billed: {dealer.billing.lastBilledDate}</p>
                    <button 
                       onClick={() => handleGenerateInvoice(dealer)}
                       className="bg-slate-700 text-blue-400 px-3 py-1.5 rounded text-xs font-medium flex items-center border border-slate-600"
                    >
                       <Download className="w-3 h-3 mr-1" /> Invoice
                    </button>
                 </div>
              </div>
           ))}
        </div>
      </div>

      {/* Pricing Plans Reference */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
         {[
            { name: 'Standard', price: 'R350', leadCost: 'R350 / lead', features: ['Basic Lead Scoring', 'Email Support', 'Manual Exports'] },
            { name: 'Pro', price: 'R250', leadCost: 'R250 / lead', features: ['Priority Distribution', 'Advanced Analytics', 'API Access'], highlight: true },
            { name: 'Enterprise', price: 'R150', leadCost: 'R150 / lead', features: ['Dedicated Account Mgr', 'Custom Integrations', 'White-labeling'] }
         ].map((plan) => (
            <div key={plan.name} className={`bg-slate-800 rounded-xl p-6 border ${plan.highlight ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-slate-700'}`}>
               <h4 className="text-lg font-bold text-white mb-1">{plan.name}</h4>
               <p className="text-3xl font-bold text-white mb-4">{plan.price} <span className="text-sm text-slate-500 font-normal">/ month</span></p>
               <div className="bg-slate-900/50 rounded-lg p-3 mb-4 text-center">
                  <span className="text-sm text-slate-300 font-medium">{plan.leadCost}</span>
               </div>
               <ul className="space-y-2">
                  {plan.features.map(f => (
                     <li key={f} className="flex items-center text-sm text-slate-400">
                        <Check className="w-4 h-4 text-green-500 mr-2" /> {f}
                     </li>
                  ))}
               </ul>
            </div>
         ))}
      </div>
    </div>
  );
};

export default Billing;
