
import React, { useState, useMemo, useEffect } from 'react';
import { analyzeChangeRequest } from '../services/geminiService';
import { ChangeManagerResult, GraphNode, GraphEdge, Stakeholder, ChangeConflict } from '../types';
import { 
    GitBranch, Loader2, Sparkles, AlertOctagon, Share2, Database, Layers, CheckCircle, 
    Package, Zap, ShieldAlert, Truck, X, Info, MousePointer2, ExternalLink, Settings, 
    Clock, UserPlus, Users, AlertTriangle, FileCheck, ArrowUpRight, Inbox, Filter,
    Search, Calendar, ChevronRight, BarChart3, Gavel, BookOpen, ListChecks
} from 'lucide-react';

// --- Mock PLM ECR Data ---
const INITIAL_OPEN_ECRS = [
    {
        id: "ECR-4402",
        title: "High-Pressure Hydraulic Valve Upgrade",
        description: "Upgrade the landing gear hydraulic valve (PN-202) to the high-pressure variant (PN-440) to improve retraction speed in cold weather conditions. Affects primary hydraulic lines and landing gear control software.",
        priority: "CRITICAL",
        submittedBy: "John Doe (Systems)",
        submittedDate: "2024-05-15"
    },
    {
        id: "ECR-3109",
        title: "Avionics Redundancy Logic Update",
        description: "Modify flight control software (DO-178C DAL A) for redundant data bus handling. Improves fault tolerance during partial bus failure scenarios. High impact on certification artifacts.",
        priority: "HIGH",
        submittedBy: "Jane Smith (Avionics)",
        submittedDate: "2024-05-14"
    },
    {
        id: "ECR-1120",
        title: "Wing Flap Motor Bracket Replacement",
        description: "Replace standard aluminum brackets with titanium alloy variant (PN-RIB4-T) due to observed stress fatigue in high-cycle aircraft. Affects wing structure assembly.",
        priority: "MAJOR",
        submittedBy: "Mike Ross (Structures)",
        submittedDate: "2024-05-12"
    },
    {
        id: "ECR-0088",
        title: "Cabin Exit Sign Font Update",
        description: "Update font on emergency exit signs to improve readability for aged passengers. Cosmetic change to interior placards. No structural or functional impact.",
        priority: "LOW",
        submittedBy: "Sarah Connor (Interiors)",
        submittedDate: "2024-05-10"
    }
];

// --- Sub-Component: Interactive Dependency Graph ---
interface GraphProps {
    nodes: GraphNode[];
    edges: GraphEdge[];
    onNodeSelect: (node: GraphNode | null) => void;
}

const DependencyGraph: React.FC<GraphProps> = ({ nodes, edges, onNodeSelect }) => {
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    const width = 800;
    const height = 450;

    const positions = useMemo(() => {
        const layersMap: { [key: number]: GraphNode[] } = { 1: [], 2: [], 3: [], 4: [] };
        nodes.forEach(n => {
            const l = n.layer || 4;
            if (!layersMap[l]) layersMap[l] = [];
            layersMap[l].push(n);
        });

        const posMap: { [id: string]: { x: number, y: number } } = {};
        const layerWidth = width / 5;

        Object.keys(layersMap).forEach((layerKey) => {
            const l = parseInt(layerKey);
            const layerNodes = layersMap[l];
            const x = l * layerWidth;
            const yStep = height / (layerNodes.length + 1);
            layerNodes.forEach((node, idx) => {
                posMap[node.id] = { x, y: (idx + 1) * yStep };
            });
        });

        return posMap;
    }, [nodes]);

    const handleNodeClick = (node: GraphNode) => {
        const newId = selectedNodeId === node.id ? null : node.id;
        setSelectedNodeId(newId);
        onNodeSelect(newId ? node : null);
    };

    return (
        <div className="w-full h-full relative group">
            <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="cursor-grab active:cursor-grabbing">
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
                    </marker>
                </defs>

                {edges.map((edge) => {
                    const start = positions[edge.from];
                    const end = positions[edge.to];
                    if (!start || !end) return null;
                    return (
                        <line 
                            key={edge.id} 
                            x1={start.x} y1={start.y} x2={end.x} y2={end.y} 
                            stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray={edge.type === 'FUNCTIONAL' ? '5,5' : '0'}
                            markerEnd="url(#arrowhead)"
                            className="transition-all"
                        />
                    );
                })}

                {nodes.map((node) => {
                    const pos = positions[node.id];
                    if (!pos) return null;
                    const isSelected = selectedNodeId === node.id;
                    const isHovered = hoveredNodeId === node.id;
                    const color = node.layer === 1 ? '#ef4444' : node.layer === 2 ? '#3b82f6' : node.layer === 3 ? '#a855f7' : '#10b981';

                    return (
                        <g 
                            key={node.id} 
                            transform={`translate(${pos.x}, ${pos.y})`}
                            onClick={() => handleNodeClick(node)}
                            onMouseEnter={() => setHoveredNodeId(node.id)}
                            onMouseLeave={() => setHoveredNodeId(null)}
                            className="transition-all duration-300 cursor-pointer"
                        >
                            <circle 
                                r={isSelected || isHovered ? 26 : 20} 
                                fill="#0f172a" 
                                stroke={color} 
                                strokeWidth={isSelected ? 4 : 2}
                            />
                            <text x="0" y="5" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
                                {node.type.substring(0, 1)}
                            </text>
                            <text x="0" y="42" textAnchor="middle" fill={isSelected ? "white" : "#64748b"} fontSize="9" fontWeight={isSelected ? "bold" : "medium"} className="select-none pointer-events-none transition-colors">
                                {node.label.length > 18 ? node.label.substring(0, 15) + '...' : node.label}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

// --- Main Assistant Component ---
const CCBAssistant: React.FC = () => {
    const [openECRs, setOpenECRs] = useState(INITIAL_OPEN_ECRS);
    const [selectedECR, setSelectedECR] = useState<typeof INITIAL_OPEN_ECRS[0] | null>(null);
    const [analysis, setAnalysis] = useState<ChangeManagerResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const [pipelineStage, setPipelineStage] = useState(0);

    const handleSelectECR = async (ecr: typeof INITIAL_OPEN_ECRS[0]) => {
        setSelectedECR(ecr);
        setAnalysis(null);
        setSelectedNode(null);
        setError(null);
        setIsLoading(true);
        setPipelineStage(1);

        try {
            const stages = [1, 2, 3];
            for (const stage of stages) {
                setPipelineStage(stage);
                await new Promise(r => setTimeout(r, 600));
            }
            const ebomContext = "Aerospace assemblies for critical wing and gear systems. High DAL software and flight-critical hydraulics.";
            const parallelChanges = [{ crId: "CR-902", overlapSystem: "Hydraulic System B", description: "Filter replacement" }];
            const result = await analyzeChangeRequest(ecr.title, ecr.description, ebomContext, parallelChanges);
            setAnalysis(result);
            setPipelineStage(4);
        } catch (e: any) {
            console.error("Analysis Error:", e);
            setError(e.message || "Intelligence Triage Failed. The digital thread is currently congested.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdatePriority = (newPriority: string) => {
        if (!selectedECR) return;
        const updatedECR = { ...selectedECR, priority: newPriority as any };
        setSelectedECR(updatedECR);
        setOpenECRs(prev => prev.map(e => e.id === selectedECR.id ? updatedECR : e));
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Change Manager Assistant</h2>
                    <p className="text-slate-500 font-medium">PLM-Synced Triage & Board Briefing Automation</p>
                </div>
                {selectedECR && (
                    <button 
                        onClick={() => { setSelectedECR(null); setAnalysis(null); setError(null); }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-2 transition-all border border-slate-200"
                    >
                        <Inbox className="w-4 h-4" /> Back to ECR Inbox
                    </button>
                )}
            </header>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">
                {!selectedECR ? (
                    <div className="lg:col-span-12 flex flex-col gap-6 animate-in fade-in duration-500">
                         <div className="bg-white rounded-[40px] border border-slate-200 shadow-xl overflow-hidden flex flex-col flex-1">
                            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase text-xs tracking-widest">
                                    <Database className="w-4 h-4 text-blue-600" /> Pending Engineering Change Requests
                                </h3>
                                <div className="flex gap-2">
                                    <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input type="text" placeholder="Search..." className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
                                    <button className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"><Filter className="w-4 h-4 text-slate-500" /></button>
                                </div>
                            </div>
                            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                                {openECRs.map((ecr) => (
                                    <div 
                                        key={ecr.id}
                                        onClick={() => handleSelectECR(ecr)}
                                        className="group p-6 rounded-[32px] border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-xl transition-all cursor-pointer relative"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="text-[10px] font-black bg-slate-900 text-white px-3 py-1 rounded-full">{ecr.id}</span>
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                                                ecr.priority === 'CRITICAL' ? 'bg-red-100 text-red-600 border-red-200' : 
                                                ecr.priority === 'HIGH' ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-blue-100 text-blue-600 border-blue-200'
                                            }`}>
                                                {ecr.priority}
                                            </span>
                                        </div>
                                        <h4 className="font-black text-slate-900 text-lg mb-2 group-hover:text-blue-600 transition-colors">{ecr.title}</h4>
                                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{ecr.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="lg:col-span-12 flex flex-col gap-6 h-full min-h-0">
                        {isLoading ? (
                            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-[40px] border border-slate-200 shadow-xl">
                                <div className="w-full max-w-lg p-12 space-y-12">
                                    <div className="text-center">
                                        <div className="w-20 h-20 bg-blue-600 text-white rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-2xl animate-pulse">
                                            <Sparkles className="w-10 h-10" />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase text-center">AI Triage: {selectedECR.id}</h3>
                                        <p className="text-slate-500 font-medium mt-2">Evaluating airworthiness risk and ripple impact...</p>
                                    </div>
                                    <div className="space-y-4">
                                        {["Knowledge Graph Mapping", "Risk Triage Scoring", "Briefing Generation"].map((l, i) => (
                                            <div key={i} className={`p-4 rounded-3xl border flex items-center gap-4 transition-all duration-500 ${pipelineStage > i ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100 opacity-40'}`}>
                                                <div className={`p-2 rounded-xl ${pipelineStage > i ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                                    {pipelineStage > i + 1 ? <CheckCircle className="w-5 h-5" /> : <Loader2 className="w-5 h-5 animate-spin" />}
                                                </div>
                                                <p className="font-black text-slate-800 text-xs uppercase tracking-widest">{l}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : error ? (
                            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-[40px] border border-red-200 shadow-2xl p-12 text-center">
                                <AlertOctagon className="w-16 h-16 text-red-500 mb-6" />
                                <h3 className="text-2xl font-black text-slate-900">Intelligence Pipeline Error</h3>
                                <p className="text-slate-500 mt-2 max-w-md mx-auto">{error}</p>
                                <div className="mt-8 flex gap-4">
                                    <button onClick={() => handleSelectECR(selectedECR)} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg">Retry Analysis</button>
                                    <button onClick={() => setSelectedECR(null)} className="px-8 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest">Cancel</button>
                                </div>
                            </div>
                        ) : analysis ? (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full min-h-0">
                                <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto pr-2 scrollbar-hide">
                                    <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-xl space-y-8">
                                        <div className="flex justify-between items-start">
                                            <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl"><BarChart3 className="w-7 h-7" /></div>
                                            <div className="text-right">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Board Priority</label>
                                                <select 
                                                    value={selectedECR.priority} 
                                                    onChange={(e) => handleUpdatePriority(e.target.value)}
                                                    className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white border border-slate-700 outline-none cursor-pointer"
                                                >
                                                    <option value="CRITICAL">Critical</option>
                                                    <option value="HIGH">High</option>
                                                    <option value="MAJOR">Major</option>
                                                    <option value="LOW">Low</option>
                                                </select>
                                                <div className="mt-4">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">AI Risk Score</p>
                                                    <p className={`text-4xl font-black tracking-tighter ${analysis.management.riskScore > 7 ? 'text-red-600' : 'text-slate-900'}`}>{analysis.management.riskScore}/10</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6 bg-blue-50 rounded-[32px] border border-blue-100 shadow-sm relative overflow-hidden">
                                            <h5 className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2"><BookOpen className="w-4 h-4" /> Board Briefing</h5>
                                            <div className="text-[11px] text-blue-900 leading-relaxed max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                                {analysis.management.preMeetingBriefing ? analysis.management.preMeetingBriefing.split('\n').map((para, i) => (
                                                    <p key={i} className="mb-3 last:mb-0">{para}</p>
                                                )) : "No briefing available."}
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-slate-100 space-y-4">
                                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Users className="w-4 h-4 text-blue-600" /> Invited SMEs</h5>
                                            {analysis.management.stakeholders.map((s, i) => (
                                                <div key={i} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                                    <div className={`p-2 rounded-lg ${s.priority === 'REQUIRED' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}><UserPlus className="w-4 h-4" /></div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight truncate">{s.role}</p>
                                                        <p className="text-[9px] text-slate-500 italic line-clamp-1">"{s.reason}"</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="lg:col-span-8 flex flex-col gap-6 min-h-0">
                                    <div className="flex-1 bg-slate-950 rounded-[40px] shadow-2xl border border-slate-800 flex flex-col relative overflow-hidden">
                                        <div className="px-10 py-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl flex justify-between items-center z-10">
                                            <div className="flex items-center gap-5">
                                                <div className="bg-blue-600/20 p-3 rounded-2xl border border-blue-500/20"><Share2 className="w-6 h-6 text-blue-400" /></div>
                                                <div>
                                                    <h4 className="font-black text-white text-lg tracking-tighter uppercase">{selectedECR.id} Digital Ripple Map</h4>
                                                    <p className="text-[10px] text-slate-500 font-mono flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Active dependencies identified</p>
                                                </div>
                                            </div>
                                            <button className="px-5 py-2.5 bg-slate-800 text-white text-[10px] font-black rounded-xl border border-slate-700 uppercase tracking-widest hover:bg-slate-700">Digital Sim</button>
                                        </div>
                                        <div className="flex-1 bg-[radial-gradient(#1e293b_1.5px,transparent_1.5px)] [background-size:28px_28px]">
                                            <DependencyGraph 
                                                nodes={analysis.technical.nodes} 
                                                edges={analysis.technical.edges} 
                                                onNodeSelect={setSelectedNode} 
                                            />
                                        </div>

                                        {selectedNode && (
                                            <div className="absolute bottom-10 right-10 w-80 bg-white rounded-[32px] p-6 shadow-2xl animate-in slide-in-from-right-8 border border-slate-200">
                                                <div className="flex justify-between items-start mb-4">
                                                    <span className="px-2 py-1 rounded-lg text-[9px] font-black uppercase bg-blue-600 text-white shadow-sm">{selectedNode.type}</span>
                                                    <button onClick={() => setSelectedNode(null)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400"><X className="w-4 h-4" /></button>
                                                </div>
                                                <h5 className="font-black text-slate-900 text-lg tracking-tight mb-2">{selectedNode.label}</h5>
                                                <p className="text-[10px] text-slate-500 leading-relaxed italic">"{selectedNode.description || 'Verified engineering link.'}"</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-white p-6 rounded-[40px] border border-slate-200 shadow-sm overflow-hidden flex flex-col items-center">
                                        <div className="flex justify-between w-full max-w-2xl px-12 relative">
                                            <div className="absolute top-5 left-20 right-20 h-1 bg-slate-100" />
                                            {[
                                                { s: 'Triaged', c: true, icon: Zap },
                                                { s: 'Review', c: true, icon: Users },
                                                { s: 'Approval', c: false, icon: CheckCircle },
                                                { s: 'Installed', c: false, icon: Settings },
                                                { s: 'Closed', c: false, icon: ShieldAlert }
                                            ].map((step, i) => (
                                                <div key={i} className="flex flex-col items-center gap-3 relative z-10">
                                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-all ${step.c ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-300'}`}>
                                                        <step.icon className="w-5 h-5" />
                                                    </div>
                                                    <span className={`text-[10px] font-black uppercase ${step.c ? 'text-slate-800' : 'text-slate-300'}`}>{step.s}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-[40px] border border-slate-200 shadow-xl p-12">
                                <Loader2 className="w-12 h-12 text-slate-300 animate-spin mb-4" />
                                <h3 className="text-xl font-bold text-slate-400 tracking-tight uppercase">Synchronizing Digital Thread</h3>
                                <button onClick={() => handleSelectECR(selectedECR)} className="mt-6 text-blue-600 font-bold hover:underline uppercase text-xs tracking-widest">Retry Connection</button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #bfdbfe; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default CCBAssistant;
