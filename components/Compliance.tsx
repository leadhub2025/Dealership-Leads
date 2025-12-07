import React from 'react';
import { Shield, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { POPIA_DISCLAIMER } from '../constants';

const Compliance: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-white mb-2">Compliance Center</h2>
        <p className="text-slate-400">Ensuring your lead generation adheres to South African Legislation.</p>
      </header>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg">
        <div className="flex items-start space-x-4">
          <div className="bg-green-500/20 p-3 rounded-full">
            <Shield className="w-8 h-8 text-green-500" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">POPIA Status: Active</h3>
            <p className="text-slate-300 leading-relaxed">
              AutoLead SA is configured to operate within the "Legitimate Interest" framework of the Protection of Personal Information Act. 
              Data presented is aggregated from public sources (Search Indexing) or requires explicit opt-in.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl">
          <FileText className="w-8 h-8 text-blue-400 mb-4" />
          <h4 className="text-lg font-medium text-white mb-2">Record Keeping</h4>
          <p className="text-sm text-slate-400">
            All search queries and lead extractions are logged for audit trails as required by the Information Regulator.
          </p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl">
          <AlertTriangle className="w-8 h-8 text-amber-400 mb-4" />
          <h4 className="text-lg font-medium text-white mb-2">Direct Marketing</h4>
          <p className="text-sm text-slate-400">
            Do not unsolicitedly contact private individuals via SMS/Email without verifying consent first.
          </p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl">
          <CheckCircle className="w-8 h-8 text-purple-400 mb-4" />
          <h4 className="text-lg font-medium text-white mb-2">Data Security</h4>
          <p className="text-sm text-slate-400">
            Leads stored in this CRM are encrypted at rest. Access control is mandatory for your dealership staff.
          </p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800 bg-slate-800/30">
          <h3 className="text-lg font-semibold text-white">Full Disclaimer</h3>
        </div>
        <div className="p-6">
          <div className="prose prose-invert prose-slate max-w-none">
             <div className="whitespace-pre-wrap font-mono text-sm text-slate-400 bg-slate-950 p-4 rounded-lg border border-slate-800">
                {POPIA_DISCLAIMER}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Compliance;
