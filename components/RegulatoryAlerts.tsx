import React, { useState, useEffect } from 'react';
import { analyzeRegulatoryImpact, generateEngineeringOrder } from '../services/geminiService';
import { RegulatoryImpact, RegulatoryFeedItem, EngineeringOrder } from '../types';
import { 
    Radio, Loader2, Plane, Calendar, AlertTriangle, CheckCircle, 
    RefreshCw, Rss, ArrowRight, ShieldAlert, FileText, Info, AlertOctagon,
    Server, Bot, Wrench
} from 'lucide-react';

const MOCK_FLEET = [
  { tailNumber: "N101AA", model: "B737-800", engine: "CFM56-7B", cycles: 12000, components: ["Bracket-A99", "Sensor-X1"] },
  { tailNumber: "N102AA", model: "B737-800", engine: "CFM56-7B", cycles: 14500, components: ["Bracket-PN99", "Sensor-X1"] },
  { tailNumber: "N205GB", model: "A320-200", engine: "V2500", cycles: 8000, components: ["Bracket-A99", "Sensor-X2"] },
];

const MOCK_FEED_ITEMS: RegulatoryFeedItem[] = [
    {
        id: 'faa-2024-05',
        source: 'FAA',
        type: 'AD',
        title: 'AD 2024-05-12: Boeing 737 Fuselage Inspection',
        receivedAt: '2 mins ago',
        rawText: `FAA Airworthiness Directive 2024-05-12
        Applicability: All Boeing 737-800 aircraft.
        Reason: Reports of fatigue cracking found on the aft mounting flange.
        Required Action: Inspect within 500 flight cycles. If cracking is found, replace with updated Bracket Part Number PN-100.
        Effective Date: Immediate.`,
        status: 'NEW'
    },
    {
        id: 'easa-2024-22',
        source: 'EASA',
        type: 'SB',
        title: 'SB 737-22A: Avionics Software Update',
        receivedAt: '15 mins ago',
        rawText: `EASA Service Bulletin 737-22A
        Applicability: B737-800 fitted with V2500 engines (Optional).
        Reason: Optimizes fuel flow algorithms.
        Required Action: Update Flight Management Computer software to v4.5 at next C-Check.
        Effective Date: 30 June 2024.`,
        status: 'NEW'
    },
    {
        id: 'faa-saib-001',
        source: 'FAA',
        type: 'NPA',
        title: 'SAIB 2024-01: Winter Operations De-icing',
        receivedAt: '1 hour ago',
        rawText: `Special Airworthiness Information Bulletin.
        Informational only. Recommended procedures for Type IV fluid holdover times during heavy snow.`,
        status: 'IGNORED'
    }
];

const RegulatoryAlerts: React.FC = () => {
  const [feedItems, setFeedItems] = useState<RegulatoryFeedItem[]>(MOCK_FEED_ITEMS);
  const [selectedItem, setSelectedItem] = useState<RegulatoryFeedItem | null>(null);
  
  // Analysis State
  const [impacts, setImpacts] = useState<RegulatoryImpact[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pipelineStage, setPipelineStage] = useState(0); // 0: Idle, 1: Extract, 2: Vector, 3: Match, 4: Done

  // EO Generation State
  const [isDraftingEO, setIsDraftingEO] = useState(false);
  const [generatedEO, setGeneratedEO] = useState<EngineeringOrder | null>(null);

  const handleSelectFeedItem = async (item: RegulatoryFeedItem) => {
      setSelectedItem(item);
      setImpacts(null);
      setGeneratedEO(null);
      setIsAnalyzing(true);
      
      // Simulate Backend Pipeline Stages
      setPipelineStage(1); // Extracting
      await new Promise(r => setTimeout(r, 800));
      
      setPipelineStage(2); // Vectorizing
      await new Promise(r => setTimeout(r, 800));
      
      setPipelineStage(3); // Matching Fleet
      await new Promise(r => setTimeout(r, 800));

      // Actual AI Call
      try {
          const result = await analyzeRegulatoryImpact(item.rawText, MOCK_FLEET);
          setImpacts(result);
          // Update item status
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
            <p className="text-slate-500 mt-2">Automated FAA/EASA Ingestion Pipeline & Fleet Impact Analysis</p>
        </div>
        <div className="flex gap-4">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm text-xs font-medium text-slate-500">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                FAA DRS API: Connected
            </div>
             <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm text-xs font-medium text-slate-500">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                EASA RSS: Active
            </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Left: Global Feed */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <Rss className="w-4 h-4 text-blue-500" /> Global Feed
                </h3>
                <button className="text-slate-400 hover:text-blue-500">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {feedItems.map((item) => (
                    <div 
                        key={item.id}
                        onClick={() => handleSelectFeedItem(item)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                            selectedItem?.id === item.id 
                            ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-300' 
                            : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-sm'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                item.source === 'FAA' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                                {item.source} {item.type}
                            </span>
                            <span className="text-xs text-slate-400">{item.receivedAt}</span>
                        </div>
                        <h4 className="text-sm font-semibold text-slate-800 leading-snug">{item.title}</h4>
                        <div className="mt-2 flex items-center gap-2">
                            {item.status === 'ANALYZED' && (
                                <span className="text-[10px] flex items-center gap-1 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                    <CheckCircle className="w-3 h-3" /> Analyzed
                                </span>
                            )}
                            {item.status === 'NEW' && (
                                <span className="text-[10px] flex items-center gap-1 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> New
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Right: Analysis Dashboard */}
        <div className="lg:col-span-8 bg-slate-50 rounded-xl border border-slate-200 flex flex-col relative overflow-hidden">
            {!selectedItem ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                    <Radio className="w-16 h-16 mb-4 opacity-20" />
                    <p>Select a regulation from the feed to analyze impact.</p>
                </div>
            ) : (
                <div className="flex flex-col h-full">
                    {/* Pipeline Visualizer Overlay (If Analyzing) */}
                    {isAnalyzing && (
                        <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
                            <div className="w-full max-w-md space-y-6">
                                <h3 className="text-center font-bold text-slate-800 text-lg">AI Ingestion Pipeline</h3>
                                
                                {/* Steps */}
                                <div className="space-y-4">
                                    <div className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${pipelineStage >= 1 ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                                        <div className="bg-blue-100 p-2 rounded text-blue-600"><FileText className="w-5 h-5"/></div>
                                        <div>
                                            <p className="font-semibold text-slate-800 text-sm">Extraction & OCR</p>
                                            <p className="text-xs text-slate-500">Converting PDF to searchable text...</p>
                                        </div>
                                        {pipelineStage === 1 && <Loader2 className="w-4 h-4 animate-spin text-blue-500 ml-auto" />}
                                        {pipelineStage > 1 && <CheckCircle className="w-4 h-4 text-emerald-500 ml-auto" />}
                                    </div>

                                    <div className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${pipelineStage >= 2 ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                                        <div className="bg-purple-100 p-2 rounded text-purple-600"><Server className="w-5 h-5"/></div>
                                        <div>
                                            <p className="font-semibold text-slate-800 text-sm">Vectorization & Linking</p>
                                            <p className="text-xs text-slate-500">Mapping entities to Vector DB...</p>
                                        </div>
                                        {pipelineStage === 2 && <Loader2 className="w-4 h-4 animate-spin text-purple-500 ml-auto" />}
                                        {pipelineStage > 2 && <CheckCircle className="w-4 h-4 text-emerald-500 ml-auto" />}
                                    </div>

                                    <div className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${pipelineStage >= 3 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                                        <div className="bg-amber-100 p-2 rounded text-amber-600"><Plane className="w-5 h-5"/></div>
                                        <div>
                                            <p className="font-semibold text-slate-800 text-sm">Fleet Configuration Match</p>
                                            <p className="text-xs text-slate-500">Cross-referencing As-Built records...</p>
                                        </div>
                                        {pipelineStage === 3 && <Loader2 className="w-4 h-4 animate-spin text-amber-500 ml-auto" />}
                                        {pipelineStage > 3 && <CheckCircle className="w-4 h-4 text-emerald-500 ml-auto" />}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Dashboard Content */}
                    <div className="p-6 overflow-y-auto flex-1">
                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-slate-900">{selectedItem.title}</h3>
                            <div className="mt-2 bg-white p-4 rounded-lg border border-slate-200 text-sm text-slate-600 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto shadow-inner">
                                {selectedItem.rawText}
                            </div>
                        </div>

                        {impacts && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-amber-500" /> Fleet Impact Analysis
                                </h4>

                                {impacts.length === 0 ? (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 flex items-center gap-4">
                                        <CheckCircle className="w-8 h-8 text-emerald-500" />
                                        <div>
                                            <h4 className="font-bold text-emerald-800">No Immediate Action Required</h4>
                                            <p className="text-emerald-600 text-sm">This regulation does not apply to your current fleet configuration.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {impacts.map((impact, idx) => (
                                            <div key={idx} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${
                                                            impact.priority === 'URGENT' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                                                        }`}>
                                                            {impact.priority === 'URGENT' ? <ShieldAlert className="w-5 h-5"/> : <Info className="w-5 h-5"/>}
                                                        </div>
                                                        <div>
                                                            <h5 className="font-bold text-slate-900">{impact.affectedTailNumber}</h5>
                                                            <p className="text-xs text-slate-500">Component: <span className="font-mono text-slate-700">{impact.component}</span></p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                                                            impact.priority === 'URGENT' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                                                        }`}>
                                                            {impact.priority}
                                                        </span>
                                                        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" /> Due: {impact.deadline}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                                                    <p className="text-sm text-slate-700"><strong>Action:</strong> {impact.requiredAction}</p>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Human-in-the-Loop Action */}
                                        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-6 mt-4">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <h4 className="font-bold text-indigo-900 flex items-center gap-2">
                                                        <Bot className="w-5 h-5" /> Human-in-the-Loop Action
                                                    </h4>
                                                    <p className="text-indigo-700 text-sm mt-1">
                                                        {impacts.filter(i => i.priority === 'URGENT').length} aircraft require mandatory compliance.
                                                    </p>
                                                </div>
                                                <button 
                                                    onClick={handleDraftEO}
                                                    disabled={isDraftingEO || generatedEO !== null}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-bold shadow flex items-center gap-2 disabled:opacity-50 transition-all"
                                                >
                                                    {isDraftingEO ? <Loader2 className="animate-spin w-4 h-4"/> : <Wrench className="w-4 h-4" />}
                                                    {generatedEO ? 'EO Drafted' : 'Draft Engineering Order'}
                                                </button>
                                            </div>

                                            {/* Generated EO Preview */}
                                            {generatedEO && (
                                                <div className="mt-6 bg-white rounded border border-slate-200 overflow-hidden animate-in zoom-in-95">
                                                    <div className="bg-slate-800 text-white px-4 py-2 text-xs font-bold uppercase flex justify-between">
                                                        <span>Engineering Order Preview</span>
                                                        <span>{generatedEO.eoNumber}</span>
                                                    </div>
                                                    <div className="p-6 font-mono text-sm text-slate-700 space-y-4">
                                                        <div>
                                                            <span className="block text-xs text-slate-400 uppercase">Subject</span>
                                                            <div className="font-bold">{generatedEO.title}</div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <span className="block text-xs text-slate-400 uppercase">Applicability</span>
                                                                <div>{generatedEO.applicability}</div>
                                                            </div>
                                                            <div>
                                                                <span className="block text-xs text-slate-400 uppercase">Compliance</span>
                                                                <div>{generatedEO.complianceDeadline}</div>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span className="block text-xs text-slate-400 uppercase mb-1">Instructions</span>
                                                            <ol className="list-decimal pl-5 space-y-1">
                                                                {generatedEO.instructions.map((step, i) => (
                                                                    <li key={i}>{step}</li>
                                                                ))}
                                                            </ol>
                                                        </div>
                                                        <div className="pt-4 border-t border-slate-100 text-xs text-slate-400 italic">
                                                            Estimated Man-Hours: {generatedEO.manHours} | Parts: {generatedEO.partsRequired.join(', ')}
                                                        </div>
                                                    </div>
                                                    <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 text-right">
                                                        <button className="text-sm font-bold text-blue-600 hover:text-blue-700">Open in PLM to Approve →</button>
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
    </div>
  );
};

export default RegulatoryAlerts;