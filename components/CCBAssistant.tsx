import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { analyzeCCBRippleEffect } from '../services/geminiService';
import { CCBAnalysisResult, GraphNode, GraphEdge } from '../types';
import { FileText, GitBranch, Loader2, Sparkles, AlertOctagon, Share2, Upload, History, Database, Layers, ArrowRight, CheckCircle, Package, Zap, ShieldAlert, Truck } from 'lucide-react';

const CCBAssistant: React.FC = () => {
  const [changeDescription, setChangeDescription] = useState('');
  const [analysisResult, setAnalysisResult] = useState<CCBAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Data Sources State
  const [ebomContext, setEbomContext] = useState<string>("Standard Boeing 737-800 Avionics structure implied.");
  const [ebomFileName, setEbomFileName] = useState<string | null>(null);
  const [plmConnected, setPlmConnected] = useState(false);
  const [historyConnected, setHistoryConnected] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---

  const handleEbomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEbomFileName(file.name);
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const csvData = XLSX.utils.sheet_to_csv(worksheet);
        setEbomContext(csvData.substring(0, 10000)); // Limit context size
    } catch (err) {
        alert("Failed to parse Excel file.");
    }
  };

  const togglePlm = () => {
      setPlmConnected(!plmConnected);
      if (!plmConnected) {
          // Simulate fetching EBOM from PLM
          setEbomContext(prev => prev + "\n[PLM FETCHED: Digital Thread ID: 998-2201-A connected to Wing Spar Assembly]");
      }
  };

  const toggleHistory = () => {
      setHistoryConnected(!historyConnected);
  };

  const handleAnalyze = async () => {
    if (!changeDescription) return;
    setIsLoading(true);
    setAnalysisResult(null);
    try {
      const historyCtx = historyConnected ? "Historical Data: Part A-220 has 15% failure rate when paired with Firmware v2. Previous changes to similar valves caused hydraulic pressure warnings." : "No historical data linked.";
      
      const result = await analyzeCCBRippleEffect(changeDescription, ebomContext, historyCtx);
      setAnalysisResult(result);
    } catch (e) {
      alert("Failed to perform Ripple Analysis");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Graph Visualizer Component ---
  const DependencyGraph: React.FC<{ nodes: GraphNode[], edges: GraphEdge[] }> = ({ nodes, edges }) => {
      // Simple layout logic: Place nodes in layers
      const layers: {[key: number]: GraphNode[]} = { 1: [], 2: [], 3: [], 4: [] };
      nodes.forEach(n => {
          const l = n.layer || 4; // Default to 4 if missing
          if (!layers[l]) layers[l] = [];
          layers[l].push(n);
      });

      const width = 600;
      const height = 400;
      const layerWidth = width / 5; // spacing

      // Calculate positions
      const positions: {[id: string]: {x: number, y: number}} = {};
      
      Object.keys(layers).forEach((layerKey) => {
          const l = parseInt(layerKey);
          const layerNodes = layers[l];
          const x = l * layerWidth;
          const yStep = height / (layerNodes.length + 1);
          layerNodes.forEach((node, idx) => {
              positions[node.id] = { x, y: (idx + 1) * yStep };
          });
      });

      return (
          <div className="w-full h-[400px] bg-slate-900 rounded-xl overflow-hidden relative shadow-inner border border-slate-700">
              <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="absolute inset-0">
                  <defs>
                      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
                      </marker>
                  </defs>
                  
                  {/* Edges */}
                  {edges.map((edge, i) => {
                      const start = positions[edge.from];
                      const end = positions[edge.to];
                      if (!start || !end) return null;
                      
                      return (
                          <g key={i}>
                              <line 
                                x1={start.x} y1={start.y} 
                                x2={end.x} y2={end.y} 
                                stroke={edge.type === 'PHYSICAL' ? '#3b82f6' : edge.type === 'FUNCTIONAL' ? '#a855f7' : '#f59e0b'} 
                                strokeWidth="2"
                                markerEnd="url(#arrowhead)"
                                opacity="0.6"
                              />
                          </g>
                      );
                  })}

                  {/* Nodes */}
                  {nodes.map((node) => {
                      const pos = positions[node.id];
                      if (!pos) return null;
                      const color = node.layer === 1 ? '#ef4444' : node.layer === 2 ? '#3b82f6' : node.layer === 3 ? '#a855f7' : '#10b981';
                      
                      return (
                          <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}>
                              <circle r="18" fill="#1e293b" stroke={color} strokeWidth="3" />
                              <text x="0" y="4" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                                  {node.type === 'PART' ? 'P' : node.type === 'SYSTEM' ? 'S' : node.type === 'DOCUMENT' ? 'D' : 'R'}
                              </text>
                              <text x="0" y="35" textAnchor="middle" fill="#cbd5e1" fontSize="10" className="opacity-80">
                                  {node.label.length > 15 ? node.label.substring(0, 12) + '...' : node.label}
                              </text>
                          </g>
                      );
                  })}
              </svg>

              {/* Legend overlay */}
              <div className="absolute bottom-4 left-4 flex gap-4 text-[10px] text-white bg-slate-800/80 p-2 rounded backdrop-blur-sm">
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Origin</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Physical</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Functional</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Regulatory</div>
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-slate-900">Intelligent CCB Assistant</h2>
        <p className="text-slate-500 mt-2">Knowledge Graph Ripple Effect Analysis & Predictive Change Management</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input & Data Layers */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Data Ingestion Layers */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
             <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                 <Layers className="w-4 h-4" /> Data Ingestion Layers
             </h3>
             
             <div className="space-y-3">
                 {/* Layer A: PLM/EBOM */}
                 <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                     <div className="flex justify-between items-center mb-2">
                         <span className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Database className="w-3.5 h-3.5"/> Digital Thread (EBOM)</span>
                         <button 
                            onClick={togglePlm}
                            className={`text-xs px-2 py-0.5 rounded font-bold transition-colors ${plmConnected ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'}`}
                        >
                            {plmConnected ? 'CONNECTED' : 'CONNECT PLM'}
                         </button>
                     </div>
                     {!plmConnected && (
                         <div className="mt-2">
                             <input 
                                type="file" 
                                accept=".xlsx, .xls, .csv"
                                ref={fileInputRef}
                                onChange={handleEbomUpload}
                                className="hidden"
                             />
                             {ebomFileName ? (
                                 <div className="flex items-center justify-between text-xs bg-emerald-50 text-emerald-700 px-2 py-1.5 rounded border border-emerald-100">
                                     <span className="truncate max-w-[150px]">{ebomFileName}</span>
                                     <CheckCircle className="w-3 h-3" />
                                 </div>
                             ) : (
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full flex items-center justify-center gap-2 py-1.5 border border-dashed border-slate-300 rounded text-xs text-slate-500 hover:bg-white hover:border-blue-400 transition-colors"
                                >
                                    <Upload className="w-3 h-3" /> Upload Excel EBOM
                                </button>
                             )}
                         </div>
                     )}
                 </div>

                 {/* Layer C: History */}
                 <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
                     <span className="text-sm font-semibold text-slate-700 flex items-center gap-2"><History className="w-3.5 h-3.5"/> Historical Data</span>
                     <button 
                        onClick={toggleHistory}
                        className={`text-xs px-2 py-0.5 rounded font-bold transition-colors ${historyConnected ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-500'}`}
                    >
                        {historyConnected ? 'LINKED' : 'LINK DB'}
                     </button>
                 </div>
             </div>
          </div>

          {/* Proposal Input */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                Propose Engineering Change
            </h3>
            <textarea 
                className="w-full p-3 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                rows={5}
                placeholder="Describe the change (e.g., 'Replace Valve A-1 with larger variant PN-990 to increase flow rate...')"
                value={changeDescription}
                onChange={(e) => setChangeDescription(e.target.value)}
            />
            <button
                onClick={handleAnalyze}
                disabled={isLoading || !changeDescription}
                className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold shadow transition-all disabled:opacity-50 flex justify-center items-center gap-2"
            >
                {isLoading ? <Loader2 className="animate-spin" /> : <GitBranch />}
                Analyze Ripple Effect
            </button>
          </div>
        </div>

        {/* Right: Output & Visualization */}
        <div className="lg:col-span-8 space-y-6">
            {!analysisResult ? (
                <div className="h-full min-h-[500px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400">
                    <div className="text-center max-w-sm">
                        <Share2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <h3 className="text-lg font-bold text-slate-500">Knowledge Graph Inactive</h3>
                        <p className="text-sm mt-2">Connect data layers and describe a change to generate a dependency map.</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Visual Graph */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                         <div className="bg-slate-900 px-6 py-4 flex justify-between items-center border-b border-slate-700">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Share2 className="w-4 h-4 text-blue-400" /> Dependency Map
                            </h3>
                            <span className="text-xs font-mono text-slate-400">
                                {analysisResult.nodes.length} Nodes • {analysisResult.edges.length} Edges
                            </span>
                        </div>
                        <DependencyGraph nodes={analysisResult.nodes} edges={analysisResult.edges} />
                    </div>

                    {/* Summary & Tiers */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Summary Card */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm md:col-span-2">
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Zap className="w-5 h-5 text-amber-500" /> Analysis Summary
                            </h3>
                            <div className="space-y-3 text-sm">
                                <p><strong className="text-slate-700">Primary Impact:</strong> {analysisResult.summary.primaryImpact}</p>
                                <p><strong className="text-purple-700">Ripple Detected:</strong> {analysisResult.summary.rippleDetected}</p>
                                <p><strong className="text-red-600">Physical Conflict:</strong> {analysisResult.summary.physicalConflict}</p>
                                <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded text-indigo-900 font-medium">
                                    <strong className="block text-xs uppercase text-indigo-400 mb-1">AI Recommendation</strong>
                                    {analysisResult.summary.recommendation}
                                </div>
                            </div>
                        </div>

                        {/* Tier 1 & 2 */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <Package className="w-4 h-4 text-blue-500" /> Physical & Functional
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Tier 1: Direct/Physical</span>
                                    <ul className="mt-1 space-y-1">
                                        {analysisResult.tiers.physical.map((item, i) => (
                                            <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                                                <ArrowRight className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" /> {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Tier 2: Functional/System</span>
                                    <ul className="mt-1 space-y-1">
                                        {analysisResult.tiers.functional.map((item, i) => (
                                            <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                                                <ArrowRight className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" /> {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Tier 3 & 4 */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                             <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-emerald-500" /> Regulatory & Logistics
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Tier 3: Regulatory/Safety</span>
                                    <ul className="mt-1 space-y-1">
                                        {analysisResult.tiers.regulatory.map((item, i) => (
                                            <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                                                <AlertOctagon className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" /> {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Tier 4: Logistics/Supply</span>
                                    <ul className="mt-1 space-y-1">
                                        {analysisResult.tiers.logistical.map((item, i) => (
                                            <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                                                <Truck className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" /> {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
      </div>
    </div>
  );
};

export default CCBAssistant;