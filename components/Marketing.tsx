
import React, { useState, useEffect } from 'react';
import { Video, FileText, Loader2, Play, Download, Copy, Check, Sparkles, Film, Maximize2, Settings2 } from 'lucide-react';
import { generateMarketingVideo, generatePitchScript } from '../services/geminiService';

const TEMPLATES = [
  {
    id: 'demo',
    label: 'Platform Demo',
    videoPrompt: "Cinematic split-screen composition. Left: A digital scanner UI searching social media icons for car keys. Center: A sleek dark-mode CRM dashboard displaying 'AutoLead SA' with a 'HOT LEAD' alert. Right: A dealership handshake closing a sale. Professional, high-tech, 4k, photorealistic, trusted atmosphere.",
    scriptContext: "Write a 30-second video script for AutoLead SA targeting Dealership Owners. Tone: Friendly and Professional. Structure: 1. Problem: 'Tired of waiting for walk-ins?' 2. Solution: 'AutoLead SA uses AI to find active buyers on social media and forums.' 3. Feature: 'Manage everything in our smart CRM with Lead Scoring.' 4. Benefit: 'Convert more leads into sales today.'"
  },
  {
    id: 'b2b_pitch',
    label: 'LinkedIn Pitch (B2B)',
    videoPrompt: "Time-lapse of a busy modern car dealership showroom, overlay with digital holographic nodes connecting cars to customers (representing AI leads). Professional, clean, blue and white tech aesthetic, 4k resolution.",
    scriptContext: "Write a viral LinkedIn post pitching the 'AutoLead SA' platform to South African Dealership Owners. Hook: Stop buying cold leads. Solution: AI Market Search & POPIA compliance. Benefit: Real-time intent signals for NAAMSA brands. Call to Action: DM for a demo. Tone: Thought leader, professional."
  },
  {
    id: 'arrival',
    label: 'New Model Launch',
    videoPrompt: "Cinematic studio lighting reveal of a sleek modern SUV. Dramatic shadows, rim lighting highlighting the curves. The car is silver metallic. High-end automotive commercial style, 8k resolution.",
    scriptContext: "Write an exciting social media announcement for the launch of the new [Insert Model Name] at our dealership. Highlight key features like safety and performance. Call to action: Visit us for a coffee and a viewing."
  },
  {
    id: 'holiday',
    label: 'Holiday Sale',
    videoPrompt: "Festive automotive showroom background with subtle holiday decorations, twinkling lights, warm bokeh. A shiny red car is visible in the background. 4k, inviting atmosphere.",
    scriptContext: "Write a script for a Holiday Season Sales Event. Focus on getting the family ready for holiday road trips with a safe, reliable new vehicle. Mention limited-time year-end savings."
  },
  {
    id: 'testdrive',
    label: 'Test Drive Invite',
    videoPrompt: "POV shot from the driver's seat of a luxury vehicle driving on a scenic coastal road. Hands on the leather steering wheel, dashboard in focus showing high speed. Motion blur on the road. Exciting, dynamic.",
    scriptContext: "Write a persuasive email invitation to a lead inviting them to test drive the [Insert Model]. Focus on the sensory experience of driving—the power, comfort, and handling. Create a sense of urgency to book a slot."
  }
];

const Marketing: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'video' | 'script'>('video');
  
  // Video State
  const [videoPrompt, setVideoPrompt] = useState('');
  const [resolution, setResolution] = useState<'1080p' | '720p'>('1080p');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  // Script State
  const [scriptContext, setScriptContext] = useState('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [generatedScript, setGeneratedScript] = useState('');
  const [copied, setCopied] = useState(false);

  const handleApplyTemplate = (templateId: string) => {
    const template = TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setVideoPrompt(template.videoPrompt);
      setScriptContext(template.scriptContext);
    }
  };

  const handleGenerateVideo = async () => {
    if (!videoPrompt) return;
    setIsGeneratingVideo(true);
    setGeneratedVideoUrl(null);
    try {
      const url = await generateMarketingVideo(videoPrompt, resolution, aspectRatio);
      if (url) setGeneratedVideoUrl(url);
    } catch (error) {
      console.error("Video Gen Error", error);
      alert("Failed to generate video. Ensure you have access to Veo in your API Key.");
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleGenerateScript = async () => {
    if (!scriptContext) return;
    setIsGeneratingScript(true);
    try {
      const script = await generatePitchScript(scriptContext);
      setGeneratedScript(script);
    } catch (error) {
      console.error("Script Gen Error", error);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const copyScript = () => {
    navigator.clipboard.writeText(generatedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <header>
        <h2 className="text-3xl font-bold text-white mb-2">Marketing Kit</h2>
        <p className="text-slate-400">Generate AI assets to pitch your dealership or promote your stock.</p>
      </header>

      {/* Templates Bar */}
      <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl">
        <p className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider flex items-center">
          <Sparkles className="w-3 h-3 mr-1.5 text-purple-400" /> Quick Templates
        </p>
        <div className="flex flex-wrap gap-3">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => handleApplyTemplate(t.id)}
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-600 hover:border-blue-500"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-xl">
        <div className="flex border-b border-slate-700">
          <button 
            onClick={() => setActiveTab('video')}
            className={`flex-1 py-4 text-center font-medium flex items-center justify-center transition-colors ${
              activeTab === 'video' ? 'bg-blue-600/10 text-blue-400 border-b-2 border-blue-500' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Video className="w-4 h-4 mr-2" /> Video Generator (Veo)
          </button>
          <button 
            onClick={() => setActiveTab('script')}
            className={`flex-1 py-4 text-center font-medium flex items-center justify-center transition-colors ${
              activeTab === 'script' ? 'bg-blue-600/10 text-blue-400 border-b-2 border-blue-500' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <FileText className="w-4 h-4 mr-2" /> Sales Script Writer
          </button>
        </div>

        <div className="p-6 min-h-[400px]">
          
          {/* VIDEO TAB */}
          {activeTab === 'video' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                
                {/* Config Panel */}
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 mb-4">
                   <div className="flex items-center text-slate-400 text-xs font-bold uppercase mb-3">
                      <Settings2 className="w-3 h-3 mr-2" /> Output Settings
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Resolution</label>
                        <select 
                          value={resolution}
                          onChange={(e) => setResolution(e.target.value as any)}
                          className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                        >
                          <option value="1080p">1080p (HD)</option>
                          <option value="720p">720p (SD)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Aspect Ratio</label>
                        <select 
                          value={aspectRatio}
                          onChange={(e) => setAspectRatio(e.target.value as any)}
                          className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                        >
                          <option value="16:9">16:9 (Landscape)</option>
                          <option value="9:16">9:16 (Portrait/Mobile)</option>
                        </select>
                      </div>
                   </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Video Prompt</label>
                  <textarea 
                    value={videoPrompt}
                    onChange={(e) => setVideoPrompt(e.target.value)}
                    className="w-full h-32 bg-slate-900 border border-slate-700 text-white rounded-xl p-4 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                    placeholder="Describe the video you want to generate... e.g. A futuristic car driving in a neon city..."
                  />
                </div>
                
                <button 
                  onClick={handleGenerateVideo}
                  disabled={isGeneratingVideo || !videoPrompt}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center"
                >
                  {isGeneratingVideo ? (
                    <><Loader2 className="animate-spin mr-2" /> Generating Video (This takes time)...</>
                  ) : (
                    <><Film className="mr-2" /> Generate with Veo</>
                  )}
                </button>
                
                <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-lg">
                  <p className="text-xs text-blue-300">
                    <strong>Note:</strong> Uses Gemini Veo (veo-3.1-fast-generate-preview). Generation typically takes 1-2 minutes.
                  </p>
                </div>
              </div>

              {/* Video Preview Section */}
              <div className="flex flex-col bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Maximize2 className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preview Output</span>
                  </div>
                  {generatedVideoUrl && (
                    <span className="text-xs text-green-400 flex items-center bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                      <Check className="w-3 h-3 mr-1"/> Render Complete
                    </span>
                  )}
                </div>
                
                <div className="flex-1 flex items-center justify-center p-4 bg-black/40 min-h-[300px] relative">
                  {generatedVideoUrl ? (
                    <video 
                      src={generatedVideoUrl} 
                      controls 
                      playsInline
                      className="w-full h-auto max-h-[350px] rounded-lg shadow-2xl border border-slate-700"
                    />
                  ) : (
                    <div className="text-center p-10">
                      <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                        {isGeneratingVideo ? (
                           <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        ) : (
                           <Play className="w-8 h-8 text-slate-600 ml-1" />
                        )}
                      </div>
                      <p className="text-slate-500 font-medium">
                        {isGeneratingVideo ? "AI is rendering your video..." : "No video generated yet"}
                      </p>
                      <p className="text-slate-600 text-xs mt-1">Preview will appear here automatically.</p>
                    </div>
                  )}
                </div>

                {generatedVideoUrl && (
                   <div className="p-4 border-t border-slate-800 bg-slate-800/50 flex justify-end">
                      <a 
                        href={generatedVideoUrl} 
                        download="autolead-marketing.mp4"
                        className="bg-slate-700 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center transition-colors text-sm font-medium"
                      >
                        <Download className="w-4 h-4 mr-2" /> Download MP4
                      </a>
                   </div>
                )}
              </div>
            </div>
          )}

          {/* SCRIPT TAB */}
          {activeTab === 'script' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Context & Goal</label>
                  <textarea 
                    value={scriptContext}
                    onChange={(e) => setScriptContext(e.target.value)}
                    className="w-full h-40 bg-slate-900 border border-slate-700 text-white rounded-xl p-4 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                    placeholder="What is this script for? Who is the audience?"
                  />
                </div>
                <button 
                  onClick={handleGenerateScript}
                  disabled={isGeneratingScript || !scriptContext}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center"
                >
                  {isGeneratingScript ? (
                    <><Loader2 className="animate-spin mr-2" /> Writing Script...</>
                  ) : (
                    <><FileText className="mr-2" /> Generate Script</>
                  )}
                </button>
              </div>

              <div className="relative">
                <div className="absolute top-4 right-4">
                  <button 
                    onClick={copyScript}
                    className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 hover:text-white transition-colors"
                    title="Copy"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <textarea 
                  readOnly
                  value={generatedScript}
                  className="w-full h-full min-h-[300px] bg-slate-900 border border-slate-800 text-slate-300 rounded-xl p-6 font-mono text-sm leading-relaxed resize-none focus:outline-none"
                  placeholder="Your AI-generated script will appear here..."
                />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Marketing;
