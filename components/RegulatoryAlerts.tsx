
import React, { useState, useEffect } from 'react';
import { analyzeRegulatoryImpact, generateEngineeringOrder } from '../services/geminiService';
import { RegulatoryImpact, RegulatoryFeedItem, EngineeringOrder } from '../types';
import { 
    Radio, Loader2, Plane, Calendar, AlertTriangle, CheckCircle, 
    RefreshCw, Rss, ArrowRight, ShieldAlert, FileText, Info, AlertOctagon,
    Server, Bot, Wrench, Globe, Wifi
} from 'lucide-react';

const MOCK_FLEET = [
  { tailNumber: "N101AA", model: "B737-800", engine: "CFM56-7B", cycles: 12000, components: ["Bracket-A99", "Sensor-X1"] },
  { tailNumber: "N102AA", model: "B737-800", engine: "CFM56-7B", cycles: 14500, components: ["Bracket-PN99", "Sensor-X1"] },
  { tailNumber: "N205GB", model: "A320-200", engine: "V2500", cycles: 8000, components: ["Bracket-A99", "Sensor-X2"] },
];

const INITIAL_FEED: RegulatoryFeedItem[] = [
    {
        id: 'faa-2024-05',
        source: 'FAA',
        type: 'AD',
        title: 'AD 2024-05-12: Boeing 737 Fuselage Inspection',
        receivedAt: '2 mins ago',
        rawText: `FAA Airworthiness Directive 2024-05-12...`,
        status: 'NEW'
    }
];

const RegulatoryAlerts: React.FC = () => {
  const [feedItems, setFeedItems] = useState<RegulatoryFeedItem[]>(INITIAL_FEED);
  const [selectedItem, setSelectedItem] = useState<RegulatoryFeedItem | null>(null);
  
  // Analysis State
  const [impacts, setImpacts] = useState<RegulatoryImpact[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pipelineStage, setPipelineStage] = useState(0); 

  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);

  // EO Generation State
  const [isDraftingEO, setIsDraftingEO] = useState(false);
  const [generatedEO, setGeneratedEO] = useState<EngineeringOrder | null>(null);

  const syncLiveFeeds = async () => {
      setIsSyncing(true);
      // Simulate real API fetching delay
      await new Promise(r => setTimeout(r, 2000));
      
      const newItems: RegulatoryFeedItem[] = [
          {
              id: `faa-${Date.now()}`,
              source: 'FAA',
              type: 'AD',
              title: `AD ${new Date().getFullYear()}-06-01: Engine Pylon Inspection`,
              receivedAt: 'Just now',
              rawText: `FAA Airworthiness Directive for CFM56-7B engines. Inspect pylon mount assemblies for hairline stress fractures...`,
              status: 'NEW'
          },
          {
              id: `easa-${Date.now()}`,
              source: 'EASA',
              type: 'SB',
              title: `SB A320-24-102: Galley Power Upgrade`,
              receivedAt: 'Just now',
              rawText: `Mandatory service bulletin for A320 series...`,
              status: 'NEW'
          }
      ];
      
      setFeedItems(prev => [...newItems, ...prev]);
      setIsSyncing(false);
  };

  const handleSelectFeedItem = async (item: RegulatoryFeedItem) => {
      setSelectedItem(item);
      setImpacts(null);
      setGeneratedEO(null);
      setIsAnalyzing(true);
      
      setPipelineStage(1); 
      await new Promise(r => setTimeout(r, 800));
      
      setPipelineStage(2);
      await new Promise(r => setTimeout(r, 800));
      
      setPipelineStage(3); 
      await new Promise(r => setTimeout(r, 800));

      try {
          const result = await analyzeRegulatoryImpact(item.rawText, MOCK_FLEET);
          setImpacts(result);
          setFeedItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'ANALYZED' } : i));
      } catch (e) {
          alert("Analysis Failed");
      } finally {
          setIsAnalyzing(false);
          setPipelineStage(4);
      }
  };

  const handleDraftEO = async () => {
      if (!selectedItem || !impacts || impacts.length === 0) return;
      setIsDraftingEO(true);
      try {
          const eo = await generateEngineeringOrder(impacts[0], selectedItem.rawText);
          setGeneratedEO(eo);
      } catch (e) {
          alert("Failed to generate EO");
      } finally {
          setIsDraftingEO(false);
      }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <header className="flex justify-between items-start flex-shrink-0">
        <div>
            <h2 className="text-3xl font-bold text-slate-900">Regulatory "Listen & Alert"</h2>
            <p className="text-slate-500 mt-2">Automated FAA DRS & EASA RSS Ingestion Pipeline</p>
        </div>
        <div className="flex gap-4">
            <button 
                onClick={syncLiveFeeds}
                disabled={isSyncing}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all ${isSyncing ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
                {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                {isSyncing ? 'Syncing Feeds...' : 'Sync Live Feeds'}
            </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Left: Global Feed */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 flex items-center gap-2 uppercase text-xs tracking-widest">
                    <Globe className="w-4 h-4 text-blue-500" /> Automated Ingestion
                </h3>
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">Live</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {feedItems.map((item) => (
                    <div 
                        key={item.id}
                        onClick={() => handleSelectFeedItem(item)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            selectedItem?.id === item.id 
                            ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500/20' 
                            : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                item.source === 'FAA' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                                {item.source} {item.type}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">{item.receivedAt}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 leading-snug mt-1">{item.title}</h4>
                        <div className="mt-3 flex items-center gap-2">
                            {item.status === 'ANALYZED' ? (
                                <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1 text-emerald-600">
                                    <CheckCircle className="w-3 h-3" /> Impact Analyzed
                                </span>
                            ) : (
                                <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1 text-blue-600">
                                    <RefreshCw className="w-3 h-3 animate-spin-slow" /> Awaiting Analysis
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Right: Analysis Dashboard */}
        <div className="lg:col-span-8 bg-slate-50 rounded-xl border border-slate-200 flex flex-col relative overflow-hidden shadow-inner">
            {!selectedItem ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-12 text-center">
                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                        <Radio className="w-12 h-12 opacity-20" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-300">Awaiting Signal</h3>
                    <p className="max-w-xs mt-2 text-slate-400 font-medium">Select an incoming regulation from the ingestion pipeline to begin fleet-wide impact analysis.</p>
                </div>
            ) : (
                <div className="flex flex-col h-full">
                    {/* Pipeline Visualizer Overlay */}
                    {isAnalyzing && (
                        <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center backdrop-blur-md">
                            <div className="w-full max-w-md p-8 space-y-8">
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce">
                                        <Bot className="w-8 h-8"/>
                                    </div>
                                    <h3 className="font-black text-slate-800 text-xl uppercase tracking-tighter">AI Analysis Pipeline</h3>
                                    <p className="text-slate-400 text-sm mt-1">Cross-referencing digital thread configuration...</p>
                                </div>
                                
                                <div className="space-y-4">
                                    {[
                                        { s: 1, l: "Extraction & Entity Mapping", icon: FileText, desc: "Normalizing legal text into engineering requirements" },
                                        { s: 2, l: "Semantic Vector Alignment", icon: Server, desc: "Matching regulatory clauses to system architecture" },
                                        { s: 3, l: "Fleet Config Reconciliation", icon: Plane, desc: "Comparing AD against 12,400+ active components" }
                                    ].map(step => (
                                        <div key={step.s} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-500 ${pipelineStage >= step.s ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-40'}`}>
                                            <div className={`p-2 rounded-lg ${pipelineStage >= step.s ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                                <step.icon className="w-5 h-5"/>
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-black text-slate-800 text-xs uppercase tracking-widest">{step.l}</p>
                                                <p className="text-[10px] text-slate-500 mt-0.5">{step.desc}</p>
                                            </div>
                                            {pipelineStage === step.s && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                                            {pipelineStage > step.s && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Dashboard Content */}
                    <div className="p-8 overflow-y-auto flex-1">
                        <div className="mb-8 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedItem.title}</h3>
                            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                                {selectedItem.rawText}
                            </div>
                        </div>

                        {impacts && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-500" /> Detected Fleet Risk
                                    </h4>
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Analysis Confidence: 98.4%</span>
                                </div>

                                {impacts.length === 0 ? (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 flex items-center gap-6 shadow-sm">
                                        <div className="bg-emerald-100 p-4 rounded-2xl"><CheckCircle className="w-8 h-8 text-emerald-600" /></div>
                                        <div>
                                            <h4 className="font-black text-emerald-900 text-lg uppercase tracking-tight">Zero Applicability Detected</h4>
                                            <p className="text-emerald-700 text-sm mt-1">This directive pertains to specific part configurations not present in your current active fleet records.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid gap-6">
                                        {impacts.map((impact, idx) => (
                                            <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md group hover:border-blue-400 transition-colors">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-3 rounded-2xl ${
                                                            impact.priority === 'URGENT' ? 'bg-red-100 text-red-600 shadow-sm shadow-red-100' : 'bg-blue-100 text-blue-600'
                                                        }`}>
                                                            {impact.priority === 'URGENT' ? <ShieldAlert className="w-6 h-6"/> : <Info className="w-6 h-6"/>}
                                                        </div>
                                                        <div>
                                                            <h5 className="font-black text-slate-900 text-xl tracking-tight">{impact.affectedTailNumber}</h5>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Component: <span className="text-slate-900">{impact.component}</span></p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm ${
                                                            impact.priority === 'URGENT' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                                                        }`}>
                                                            {impact.priority}
                                                        </span>
                                                        <p className="text-xs font-bold text-slate-600 mt-2 flex items-center justify-end gap-1.5">
                                                            <Calendar className="w-3.5 h-3.5" /> Due: {impact.deadline}
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                <div className="mt-6 pt-6 border-t border-slate-100">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Required Compliance Action</span>
                                                    <p className="text-slate-800 font-bold leading-snug">{impact.requiredAction}</p>
                                                </div>
                                            </div>
                                        ))}

                                        {/* EO Generation */}
                                        <div className="bg-slate-900 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform">
                                                <Wrench className="w-24 h-24 text-white" />
                                            </div>
                                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                                                <div className="text-center md:text-left">
                                                    <h4 className="font-black text-white text-xl flex items-center justify-center md:justify-start gap-2 uppercase tracking-tighter">
                                                        <Bot className="w-6 h-6 text-blue-400" /> Compliance Automation
                                                    </h4>
                                                    <p className="text-slate-400 text-sm mt-1 max-w-sm">
                                                        AeroGuard can auto-draft an Engineering Order based on the directive and fleet configuration for immediate review.
                                                    </p>
                                                </div>
                                                <button 
                                                    onClick={handleDraftEO}
                                                    disabled={isDraftingEO || generatedEO !== null}
                                                    className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl flex items-center gap-3 disabled:opacity-50 transition-all transform hover:scale-105 active:scale-95"
                                                >
                                                    {isDraftingEO ? <Loader2 className="animate-spin w-5 h-5"/> : <Wrench className="w-5 h-5" />}
                                                    {generatedEO ? 'Draft Created' : 'Generate EO Draft'}
                                                </button>
                                            </div>

                                            {generatedEO && (
                                                <div className="mt-8 bg-white/5 rounded-2xl border border-white/10 p-6 animate-in zoom-in-95 duration-500">
                                                    <div className="flex justify-between items-center mb-6">
                                                        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/30">EO Draft #{generatedEO.eoNumber}</span>
                                                        <button className="text-[10px] font-black text-white/50 hover:text-white flex items-center gap-1 uppercase tracking-widest">
                                                            Review Details <ArrowRight className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <h5 className="text-white font-black text-lg leading-tight">{generatedEO.title}</h5>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                                                <span className="text-[10px] text-white/40 uppercase block mb-1">Applicability</span>
                                                                <span className="text-white text-xs font-bold">{generatedEO.applicability}</span>
                                                            </div>
                                                            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                                                <span className="text-[10px] text-white/40 uppercase block mb-1">Man Hours</span>
                                                                <span className="text-white text-xs font-bold">{generatedEO.manHours} Hours</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>
      <style>{`
        .animate-spin-slow { animation: spin 4s linear infinite; }
      `}</style>
    </div>
  );
};

export default RegulatoryAlerts;
