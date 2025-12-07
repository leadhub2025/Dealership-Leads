
import React from 'react';
import { CarFront, ShieldCheck, Cpu, Globe, Mail, Phone, ExternalLink, Award, Search, Filter, Network, MessageSquare, ArrowRight } from 'lucide-react';

const About: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-12">
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-900/20 border border-slate-700 rounded-2xl p-8 md:p-12 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5">
           <CarFront className="w-64 h-64 text-white" />
        </div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="bg-blue-600 p-4 rounded-2xl shadow-xl shadow-blue-900/50 mb-6">
            <CarFront className="text-white w-10 h-10" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">AutoLead SA</h1>
          <p className="text-xl text-blue-200 max-w-2xl mx-auto">
            South Africa's Premier AI-Driven Automotive Intelligence Platform
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
             <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-bold text-slate-400 border border-slate-700">v1.0.0 Live</span>
             <span className="px-3 py-1 bg-green-900/30 rounded-full text-xs font-bold text-green-400 border border-green-500/30">System Operational</span>
          </div>
        </div>
      </div>

      {/* How It Works (Visual Workflow) */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2">How It Works</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">Our engine transforms raw internet data into actionable dealership sales opportunities in four steps.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
           {/* Connecting Line (Desktop Only) */}
           <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-blue-900 via-blue-500 to-green-500 opacity-20 -z-10"></div>

           {/* Step 1 */}
           <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg relative group hover:-translate-y-1 transition-transform duration-300">
              <div className="w-10 h-10 bg-slate-900 border border-slate-600 rounded-full flex items-center justify-center text-blue-400 font-bold mb-4 mx-auto z-10 group-hover:border-blue-500 group-hover:text-blue-500 transition-colors">1</div>
              <div className="flex flex-col items-center text-center">
                 <div className="bg-blue-500/10 p-3 rounded-lg mb-3">
                    <Search className="w-6 h-6 text-blue-400" />
                 </div>
                 <h3 className="text-white font-bold mb-2">AI Market Scan</h3>
                 <p className="text-sm text-slate-400">Gemini AI continuously scans social media, forums (4x4Community), and classifieds for vehicle discussions.</p>
              </div>
           </div>

           {/* Step 2 */}
           <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg relative group hover:-translate-y-1 transition-transform duration-300">
              <div className="w-10 h-10 bg-slate-900 border border-slate-600 rounded-full flex items-center justify-center text-blue-400 font-bold mb-4 mx-auto z-10 group-hover:border-blue-500 group-hover:text-blue-500 transition-colors">2</div>
              <div className="flex flex-col items-center text-center">
                 <div className="bg-purple-500/10 p-3 rounded-lg mb-3">
                    <Filter className="w-6 h-6 text-purple-400" />
                 </div>
                 <h3 className="text-white font-bold mb-2">Intent Analysis</h3>
                 <p className="text-sm text-slate-400">Natural Language Processing filters noise, identifies "Buying Intent", and categorizes sentiment as <span className="text-orange-400">HOT</span> or Warm.</p>
              </div>
           </div>

           {/* Step 3 */}
           <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg relative group hover:-translate-y-1 transition-transform duration-300">
              <div className="w-10 h-10 bg-slate-900 border border-slate-600 rounded-full flex items-center justify-center text-blue-400 font-bold mb-4 mx-auto z-10 group-hover:border-blue-500 group-hover:text-blue-500 transition-colors">3</div>
              <div className="flex flex-col items-center text-center">
                 <div className="bg-amber-500/10 p-3 rounded-lg mb-3">
                    <Network className="w-6 h-6 text-amber-400" />
                 </div>
                 <h3 className="text-white font-bold mb-2">Smart Routing</h3>
                 <p className="text-sm text-slate-400">The lead is matched to a registered dealer based on Brand Franchise and Geographic AOR (Area of Responsibility).</p>
              </div>
           </div>

           {/* Step 4 */}
           <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg relative group hover:-translate-y-1 transition-transform duration-300">
              <div className="w-10 h-10 bg-slate-900 border border-slate-600 rounded-full flex items-center justify-center text-green-400 font-bold mb-4 mx-auto z-10 group-hover:border-green-500 transition-colors">4</div>
              <div className="flex flex-col items-center text-center">
                 <div className="bg-green-500/10 p-3 rounded-lg mb-3">
                    <MessageSquare className="w-6 h-6 text-green-400" />
                 </div>
                 <h3 className="text-white font-bold mb-2">Connect & Convert</h3>
                 <p className="text-sm text-slate-400">Dealers receive the lead and use AI-generated POPIA-compliant scripts to initiate contact and close the sale.</p>
              </div>
           </div>
        </div>
      </div>

      {/* Mission Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm hover:border-blue-500/50 transition-colors">
           <div className="bg-blue-500/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Cpu className="w-6 h-6 text-blue-400" />
           </div>
           <h3 className="text-lg font-bold text-white mb-2">AI Intelligence</h3>
           <p className="text-slate-400 text-sm leading-relaxed">
              Powered by Google Gemini 2.5 Flash. We scan social media, forums, and classifieds to identify high-intent buyer signals before they reach the showroom floor.
           </p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm hover:border-purple-500/50 transition-colors">
           <div className="bg-purple-500/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Globe className="w-6 h-6 text-purple-400" />
           </div>
           <h3 className="text-lg font-bold text-white mb-2">NAAMSA Aligned</h3>
           <p className="text-slate-400 text-sm leading-relaxed">
              Our database is strictly calibrated to the National Association of Automobile Manufacturers of South Africa's brand hierarchy and segments.
           </p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm hover:border-green-500/50 transition-colors">
           <div className="bg-green-500/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6 text-green-400" />
           </div>
           <h3 className="text-lg font-bold text-white mb-2">POPIA Compliant</h3>
           <p className="text-slate-400 text-sm leading-relaxed">
              Built with privacy by design. We utilize Legitimate Interest processing for public data and provide tools to ensure your outreach remains lawful.
           </p>
        </div>
      </div>

      {/* Company Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Contact Support</h2>
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
               <div className="p-4 border-b border-slate-700 flex items-center">
                  <Mail className="w-5 h-5 text-slate-400 mr-3" />
                  <div>
                     <p className="text-xs text-slate-500 uppercase font-bold">Technical Support</p>
                     <a href="mailto:support@autolead.co.za" className="text-blue-400 hover:underline">support@autolead.co.za</a>
                  </div>
               </div>
               <div className="p-4 border-b border-slate-700 flex items-center">
                  <Award className="w-5 h-5 text-slate-400 mr-3" />
                  <div>
                     <p className="text-xs text-slate-500 uppercase font-bold">Sales & Licensing</p>
                     <a href="mailto:sales@autolead.co.za" className="text-blue-400 hover:underline">sales@autolead.co.za</a>
                  </div>
               </div>
               <div className="p-4 flex items-center">
                  <Phone className="w-5 h-5 text-slate-400 mr-3" />
                  <div>
                     <p className="text-xs text-slate-500 uppercase font-bold">Emergency Line</p>
                     <p className="text-white">+27 (0) 10 555 0123</p>
                  </div>
               </div>
            </div>
         </div>

         <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">System Resources</h2>
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-4">
               <a href="#" className="flex items-center justify-between text-slate-300 hover:text-white group">
                  <span className="flex items-center"><ExternalLink className="w-4 h-4 mr-2 text-blue-500" /> User Documentation</span>
                  <span className="text-xs bg-slate-800 px-2 py-1 rounded">Wiki</span>
               </a>
               <a href="#" className="flex items-center justify-between text-slate-300 hover:text-white group">
                  <span className="flex items-center"><ExternalLink className="w-4 h-4 mr-2 text-blue-500" /> API Documentation</span>
                  <span className="text-xs bg-slate-800 px-2 py-1 rounded">v1.0</span>
               </a>
               <a href="#" className="flex items-center justify-between text-slate-300 hover:text-white group">
                  <span className="flex items-center"><ExternalLink className="w-4 h-4 mr-2 text-blue-500" /> Privacy Policy</span>
                  <span className="text-xs bg-slate-800 px-2 py-1 rounded">Legal</span>
               </a>
               <a href="#" className="flex items-center justify-between text-slate-300 hover:text-white group">
                  <span className="flex items-center"><ExternalLink className="w-4 h-4 mr-2 text-blue-500" /> Terms of Service</span>
                  <span className="text-xs bg-slate-800 px-2 py-1 rounded">Legal</span>
               </a>
            </div>
         </div>
      </div>
      
      <div className="text-center pt-8 border-t border-slate-800">
         <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} AutoLead SA (Pty) Ltd. All Rights Reserved.
         </p>
         <p className="text-slate-600 text-xs mt-2">
            Made in South Africa 🇿🇦
         </p>
      </div>

    </div>
  );
};

export default About;
