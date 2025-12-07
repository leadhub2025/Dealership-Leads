
import React, { useState } from 'react';
import { Dealership } from '../types';
import { Building2, MapPin, Plus, CheckCircle, X, Search, BarChart, TrendingUp, User, Pencil, Wand2, Settings, Power } from 'lucide-react';
import { NAAMSA_BRANDS, SA_REGIONS } from '../constants';

interface DealerNetworkProps {
  dealers: Dealership[];
  onAddDealer: (dealer: Dealership) => void;
  onUpdateDealer: (dealer: Dealership) => void;
  onOpenOnboarding?: () => void;
}

const DealerNetwork: React.FC<DealerNetworkProps> = ({ dealers, onAddDealer, onUpdateDealer, onOpenOnboarding }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Dealership> & { plan?: string; maxCapacity?: string }>({
    name: '',
    brand: NAAMSA_BRANDS[0].id,
    region: SA_REGIONS[0],
    contactPerson: '',
    email: '',
    status: 'Active',
    plan: 'Standard',
    maxCapacity: ''
  });

  const resetForm = () => {
    setFormData({
      name: '',
      brand: NAAMSA_BRANDS[0].id,
      region: SA_REGIONS[0],
      contactPerson: '',
      email: '',
      status: 'Active',
      plan: 'Standard',
      maxCapacity: ''
    });
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleEdit = (dealer: Dealership) => {
    setEditingId(dealer.id);
    setFormData({
      name: dealer.name,
      brand: NAAMSA_BRANDS.find(b => b.name === dealer.brand)?.id || dealer.brand,
      region: dealer.region,
      contactPerson: dealer.contactPerson,
      email: dealer.email,
      status: dealer.status,
      plan: dealer.billing.plan,
      maxCapacity: dealer.maxLeadsCapacity ? dealer.maxLeadsCapacity.toString() : ''
    });
    setIsModalOpen(true);
  };

  const toggleStatus = (dealer: Dealership) => {
    const newStatus = dealer.status === 'Active' ? 'Pending' : 'Active';
    onUpdateDealer({ ...dealer, status: newStatus });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    const brandName = NAAMSA_BRANDS.find(b => b.id === formData.brand)?.name || formData.brand;
    const cost = formData.plan === 'Enterprise' ? 150 : formData.plan === 'Pro' ? 250 : 350;
    const capacity = formData.maxCapacity ? parseInt(formData.maxCapacity) : undefined;

    if (editingId) {
      // Update Existing
      const existingDealer = dealers.find(d => d.id === editingId);
      if (existingDealer) {
        const updatedDealer: Dealership = {
          ...existingDealer,
          name: formData.name,
          brand: brandName || 'Unknown',
          region: formData.region || 'Gauteng',
          contactPerson: formData.contactPerson || 'Manager',
          email: formData.email,
          status: formData.status as 'Active' | 'Pending',
          maxLeadsCapacity: capacity,
          billing: {
            ...existingDealer.billing,
            plan: (formData.plan as any) || 'Standard',
            costPerLead: cost,
            // Preserve existing billing stats
          }
        };
        onUpdateDealer(updatedDealer);
      }
    } else {
      // Add New
      const newDealer: Dealership = {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name,
        brand: brandName || 'Unknown',
        region: formData.region || 'Gauteng',
        contactPerson: formData.contactPerson || 'Manager',
        email: formData.email,
        status: formData.status as 'Active' | 'Pending',
        leadsAssigned: 0,
        maxLeadsCapacity: capacity,
        billing: {
          plan: (formData.plan as any) || 'Standard',
          costPerLead: cost,
          credits: 0,
          totalSpent: 0,
          lastBilledDate: new Date().toISOString().split('T')[0],
          currentUnbilledAmount: 0
        }
      };
      onAddDealer(newDealer);
    }

    resetForm();
  };

  const filteredDealers = dealers.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.region.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Statistics
  const totalLeads = dealers.reduce((acc, curr) => acc + (curr.leadsAssigned || 0), 0);
  const maxLeads = Math.max(...dealers.map(d => d.leadsAssigned || 0), 1);
  const avgLeads = dealers.length > 0 ? (totalLeads / dealers.length).toFixed(1) : 0;

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Dealer Network</h2>
          <p className="text-slate-400">Manage AOR (Area of Responsibility) distribution.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {onOpenOnboarding && (
            <button 
              onClick={onOpenOnboarding}
              className="bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-500/30 px-4 py-2.5 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-colors flex-1 md:flex-none"
            >
              <Wand2 className="w-5 h-5" />
              <span>Guided Setup</span>
            </button>
          )}
          <button 
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-colors flex-1 md:flex-none shadow-lg shadow-blue-900/20"
          >
            <Plus className="w-5 h-5" />
            <span>Add Dealership</span>
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-slate-800 p-5 md:p-6 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 text-sm">Total Active Dealers</h3>
            <Building2 className="text-blue-400 w-5 h-5" />
          </div>
          <p className="text-3xl font-bold text-white">{dealers.filter(d => d.status === 'Active').length}</p>
        </div>
        <div className="bg-slate-800 p-5 md:p-6 rounded-xl border border-slate-700">
           <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 text-sm">Regions Covered</h3>
            <MapPin className="text-green-400 w-5 h-5" />
          </div>
          <p className="text-3xl font-bold text-white">{new Set(dealers.map(d => d.region)).size}</p>
        </div>
        <div className="bg-slate-800 p-5 md:p-6 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 text-sm">Avg Leads / Dealer</h3>
            <BarChart className="text-purple-400 w-5 h-5" />
          </div>
          <p className="text-3xl font-bold text-white">{avgLeads}</p>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-700 flex items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search dealerships, regions, or brands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-sm border-b border-slate-700">
                <th className="px-6 py-4 font-medium">Dealership</th>
                <th className="px-6 py-4 font-medium">Region (AOR)</th>
                <th className="px-6 py-4 font-medium">Contact</th>
                <th className="px-6 py-4 font-medium">Leads</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredDealers.map((dealer) => (
                <tr key={dealer.id} className="hover:bg-slate-700/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-slate-700 p-2 rounded-lg">
                        <Building2 className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{dealer.name}</p>
                        <p className="text-xs text-slate-500">{dealer.brand} Franchise</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-1 rounded bg-slate-700 text-slate-300 text-xs">
                      <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                      {dealer.region}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <p className="text-white">{dealer.contactPerson}</p>
                      <p className="text-slate-500 text-xs">{dealer.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col w-24">
                       <div className="flex justify-between text-xs mb-1">
                          <span className="text-white font-bold">{dealer.leadsAssigned || 0}</span>
                          <span className="text-slate-500 text-[10px]">Vol</span>
                       </div>
                       <div className="w-full bg-slate-700 rounded-full h-1.5">
                          <div 
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(100, ((dealer.leadsAssigned || 0) / maxLeads) * 100)}%` }}
                          ></div>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => toggleStatus(dealer)}
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                        dealer.status === 'Active' 
                          ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                      }`}
                      title="Click to toggle status"
                    >
                      {dealer.status === 'Active' ? <CheckCircle className="w-3 h-3 mr-1" /> : <Power className="w-3 h-3 mr-1" />}
                      {dealer.status}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleEdit(dealer)}
                      className="text-slate-400 hover:text-white p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden grid grid-cols-1 gap-4">
        <div className="relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
           <input 
             type="text" 
             placeholder="Search..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
           />
        </div>
        
        {filteredDealers.map(dealer => (
           <div key={dealer.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <div className="flex justify-between items-start mb-3">
                 <div className="flex items-center space-x-3">
                    <div className="bg-slate-700 p-2 rounded-lg">
                       <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                       <h3 className="font-bold text-white">{dealer.name}</h3>
                       <p className="text-xs text-slate-400">{dealer.brand}</p>
                    </div>
                 </div>
                 <button 
                    onClick={() => toggleStatus(dealer)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        dealer.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                 >
                    {dealer.status.toUpperCase()}
                 </button>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                 <div className="bg-slate-900/50 p-2 rounded border border-slate-700">
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Region</p>
                    <div className="flex items-center text-sm text-white">
                       <MapPin className="w-3 h-3 mr-1 text-blue-400" /> {dealer.region}
                    </div>
                 </div>
                 <div className="bg-slate-900/50 p-2 rounded border border-slate-700">
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Leads</p>
                    <div className="flex items-center text-sm text-white">
                       <TrendingUp className="w-3 h-3 mr-1 text-green-400" /> {dealer.leadsAssigned || 0}
                    </div>
                 </div>
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                 <div className="flex items-center text-xs text-slate-400">
                    <User className="w-3 h-3 mr-1" /> {dealer.contactPerson}
                 </div>
                 <button 
                   onClick={() => handleEdit(dealer)}
                   className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded flex items-center"
                 >
                    <Pencil className="w-3 h-3 mr-1" /> Edit
                 </button>
              </div>
           </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">{editingId ? 'Edit Dealership' : 'Add New Dealership'}</h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Dealership Name</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g. McCarthy Toyota"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Brand</label>
                  <select 
                    value={formData.brand}
                    onChange={(e) => setFormData({...formData, brand: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {NAAMSA_BRANDS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Region</label>
                  <select 
                    value={formData.region}
                    onChange={(e) => setFormData({...formData, region: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {SA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Contact Person</label>
                <input 
                  type="text" 
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Manager Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Email Address</label>
                <input 
                  required
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="leads@dealership.co.za"
                />
              </div>
              
              {/* Distribution Rules */}
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 space-y-3">
                 <p className="text-xs text-slate-500 uppercase font-bold flex items-center">
                    <Settings className="w-3 h-3 mr-1" /> Dealer Configuration
                 </p>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Status</label>
                        <select 
                           value={formData.status}
                           onChange={(e) => setFormData({...formData, status: e.target.value as 'Active' | 'Pending'})}
                           className="w-full bg-slate-800 border border-slate-600 text-white rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        >
                           <option value="Active">Active</option>
                           <option value="Pending">Pending</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Max Capacity</label>
                        <input 
                           type="number" 
                           value={formData.maxCapacity}
                           onChange={(e) => setFormData({...formData, maxCapacity: e.target.value})}
                           className="w-full bg-slate-800 border border-slate-600 text-white rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                           placeholder="Unlimited"
                        />
                    </div>
                 </div>
              </div>

              {/* Plan Selection */}
              <div>
                 <label className="block text-sm font-medium text-slate-400 mb-1">Billing Plan</label>
                 <div className="grid grid-cols-3 gap-2">
                    {['Standard', 'Pro', 'Enterprise'].map(plan => (
                       <button
                          key={plan}
                          type="button"
                          onClick={() => setFormData({...formData, plan})}
                          className={`text-xs py-2 rounded border ${
                             formData.plan === plan 
                             ? 'bg-blue-600 text-white border-blue-500' 
                             : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
                          }`}
                       >
                          {plan}
                       </button>
                    ))}
                 </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors mt-4"
              >
                {editingId ? 'Update Dealership' : 'Register Dealership'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealerNetwork;
