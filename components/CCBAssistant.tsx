
import React, { useState, useMemo, useEffect } from 'react';
import { analyzeChangeRequest, fetchECNDetails } from '../services/geminiService';
import { ChangeManagerResult, GraphNode, GraphEdge, Stakeholder, ChangeConflict, ECNDetail } from '../types';
import { 
    GitBranch, Loader2, Sparkles, AlertOctagon, Share2, Database, Layers, CheckCircle, 
    Package, Zap, ShieldAlert, Truck, X, Info, MousePointer2, ExternalLink, Settings, 
    Clock, UserPlus, Users, AlertTriangle, FileCheck, ArrowUpRight, Inbox, Filter,
    Search, Calendar, ChevronRight, BarChart3, Gavel, BookOpen, ListChecks, FileText,
    MessageSquare, Send
} from 'lucide-react';

// --- Extended Mock PLM ECR Data with ECNs and Status ---
const INITIAL_ECRS = [
    {
        id: "ECR-4402",
        title: "High-Pressure Hydraulic Valve Upgrade",
        description: "Upgrade the landing gear hydraulic valve (PN-202) to the high-pressure variant (PN-440) to improve retraction speed in cold weather conditions. Affects primary hydraulic lines and landing gear control software.",
        priority: "CRITICAL",
        status: "PENDING",
        submittedBy: "John Doe (Systems)",
        submittedDate: "2024-05-15"
    },
    {
        id: "ECR-3109",
        title: "Avionics Redundancy Logic Update",
        description: "Modify flight control software (DO-178C DAL A) for redundant data bus handling. Improves fault tolerance during partial bus failure scenarios. High impact on certification artifacts.",
        priority: "HIGH",
        status: "TRIAGED",
        submittedBy: "Jane Smith (Avionics)",
        submittedDate: "2024-05-14"
    },
    {
        id: "ECR-1120",
        title: "Wing Flap Motor Bracket Replacement",
        description: "Replace standard aluminum brackets with titanium alloy variant (PN-RIB4-T) due to observed stress fatigue in high-cycle aircraft. Affects wing structure assembly.",
        priority: "MAJOR",
        status: "APPROVED",
        submittedBy: "Mike Ross (Structures)",
        submittedDate: "2024-05-12"
    },
    {
        id: "ECR-0088",
        title: "Cabin Exit Sign Font Update",
        description: "Update font on emergency exit signs to improve readability for aged passengers. Cosmetic change to interior placards. No structural or functional impact.",
        priority: "LOW",
        status: "COMPLETED",
        submittedBy: "Sarah Connor (Interiors)",
        submittedDate: "2024-05-10",
        ecns: [
            { id: "ECN-8801", status: "RELEASED" }
        ]
    },
    {
        id: "ECR-7721",
        title: "Main Bus Power Diode Swap",
        description: "Switching to silicon carbide diodes for better thermal efficiency in high-load scenarios.",
        priority: "HIGH",
        status: "COMPLETED",
        submittedBy: "A. Watt (Electrical)",
        submittedDate: "2024-04-20",
        ecns: [
            { id: "ECN-7721-A", status: "RELEASED" },
            { id: "ECN-7721-B", status: "RELEASED" }
        ]
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
const CMAssistant: React.FC = () => {
    const [ecrs, setEcrs] = useState(INITIAL_ECRS);
    const [selectedECR, setSelectedECR] = useState<typeof INITIAL_ECRS[0] | null>(null);
    const [analysis, setAnalysis] = useState<ChangeManagerResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const [pipelineStage, setPipelineStage] = useState(0);

    // ECN Details State
    const [selectedECNDetail, setSelectedECNDetail] = useState<ECNDetail | null>(null);
    const [isFetchingECN, setIsFetchingECN] = useState(false);
    const [ecnError, setEcnError] = useState<string | null>(null);

    // Scheduling State
    const [isScheduling, setIsScheduling] = useState(false);
    const [meetingDate, setMeetingDate] = useState('');
    const [meetingTime, setMeetingTime] = useState('');
    const [invitedSMEs, setInvitedSMEs] = useState<string[]>([]);

    // Dynamic Summary Stats
    const stats = useMemo(() => {
        return {
            total: ecrs.length,
            pending: ecrs.filter(e => e.status === 'PENDING').length,
            triaged: ecrs.filter(e => e.status === 'TRIAGED').length,
            approved: ecrs.filter(e => e.status === 'APPROVED').length,
            completed: ecrs.filter(e => e.status === 'COMPLETED').length,
        };
    }, [ecrs]);

    const handleSelectECR = async (ecr: typeof INITIAL_ECRS[0]) => {
        setSelectedECR(ecr);
        setAnalysis(null);
        setSelectedNode(null);
        setError(null);
        setIsLoading(true);
        setPipelineStage(1);
        setIsScheduling(false);
        setEcnError(null);

        try {
            // Optimized: Drastically reduced UI delays for snappier performance
            const stages = [1, 2, 3];
            for (const stage of stages) {
                setPipelineStage(stage);
                await new Promise(r => setTimeout(r, 200));
            }
            const ebomContext = "Aerospace assemblies for critical wing and gear systems. High DAL software and flight-critical hydraulics.";
            const parallelChanges = [{ crId: "CR-902", overlapSystem: "Hydraulic System B", description: "Filter replacement" }];
            
            // The AI service call is also optimized with 0 thinking budget
            const result = await analyzeChangeRequest(ecr.title, ecr.description, ebomContext, parallelChanges);
            
            setAnalysis(result);
            setPipelineStage(4);
            // Pre-select all SMEs for inviting
            setInvitedSMEs(result.management.stakeholders.map(s => s.role));
        } catch (e: any) {
            console.error("Analysis Error:", e);
            setError(e.message || "Intelligence Triage Failed. The digital thread is currently congested.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdatePriority = (newPriority: string) => {
        if (!selectedECR || selectedECR.status === 'COMPLETED' || selectedECR.status === 'APPROVED') return;
        const updatedECR = { ...selectedECR, priority: newPriority as any };
        setSelectedECR(updatedECR);
        setEcrs(prev => prev.map(e => e.id === selectedECR.id ? updatedECR : e));
    };

    const handleECNClick = async (ecnId: string) => {
        setIsFetchingECN(true);
        setEcnError(null);
        try {
            const detail = await fetchECNDetails(ecnId);
            setSelectedECNDetail(detail);
        } catch (e: any) {
            setEcnError(`Digital thread synchronization failed for ${ecnId}. The requested PLM record is currently unavailable in the vault.`);
        } finally {
            setIsFetchingECN(false);
        }
    };

    const handleScheduleMeeting = () => {
        if (!meetingDate || !meetingTime) {
            alert("Please select a date and time for the CCB Review.");
            return;
        }
        alert(`CCB Review scheduled for ${meetingDate} at ${meetingTime}. Invitations sent to: ${invitedSMEs.join(', ')}`);
        setIsScheduling(false);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">CM Assistant</h2>
                    <p className="text-slate-500 font-medium">Change Management & Board Briefing Suite</p>
                </div>
                {selectedECR && (
                    <button 
                        onClick={() => { setSelectedECR(null); setAnalysis(null); setError(null); setSelectedECNDetail(null); setEcnError(null); }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-2 transition-all border border-slate-200"
                    >
                        <Inbox className="w-4 h-4" /> Back to Change Inbox
                    </button>
                )}
            </header>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">
                {!selectedECR ? (
                    <div className="lg:col-span-12 flex flex-col gap-6 animate-in fade-in duration-500">
                         {/* Dynamic Status Badges Strip */}
                         <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center group hover:border-blue-500 transition-all cursor-default">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-blue-500">Total ECRs</span>
                                <span className="text-2xl font-black text-slate-900">{stats.total}</span>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center border-l-4 border-l-blue-500 group hover:bg-blue-50 transition-all cursor-default">
                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Pending</span>
                                <span className="text-2xl font-black text-slate-900">{stats.pending}</span>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center border-l-4 border-l-purple-500 group hover:bg-purple-50 transition-all cursor-default">
                                <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-1">Triaged</span>
                                <span className="text-2xl font-black text-slate-900">{stats.triaged}</span>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center border-l-4 border-l-amber-500 group hover:bg-amber-50 transition-all cursor-default">
                                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Approved</span>
                                <span className="text-2xl font-black text-slate-900">{stats.approved}</span>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center border-l-4 border-l-emerald-500 group hover:bg-emerald-50 transition-all cursor-default">
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Completed</span>
                                <span className="text-2xl font-black text-slate-900">{stats.completed}</span>
                            </div>
                         </div>

                         <div className="bg-white rounded-[40px] border border-slate-200 shadow-xl overflow-hidden flex flex-col flex-1">
                            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase text-xs tracking-widest">
                                    <Database className="w-4 h-4 text-blue-600" /> Engineering Change Pipeline
                                </h3>
                                <div className="flex gap-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                        <input 
                                            type="text" 
                                            placeholder="Filter ECRs..." 
                                            className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20" 
                                        />
                                    </div>
                                    <button className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"><Filter className="w-4 h-4 text-slate-500" /></button>
                                </div>
                            </div>
                            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                                {ecrs.map((ecr) => (
                                    <div 
                                        key={ecr.id}
                                        onClick={() => handleSelectECR(ecr)}
                                        className="group p-6 rounded-[32px] border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-xl transition-all cursor-pointer relative"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex gap-2 items-center">
                                                <span className="text-[10px] font-black bg-slate-900 text-white px-3 py-1 rounded-full">{ecr.id}</span>
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                                                    ecr.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' :
                                                    ecr.status === 'APPROVED' ? 'bg-amber-100 text-amber-600 border-amber-200' :
                                                    'bg-blue-100 text-blue-600 border-blue-200'
                                                }`}>
                                                    {ecr.status}
                                                </span>
                                            </div>
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                                                ecr.priority === 'CRITICAL' ? 'bg-red-100 text-red-600 border-red-200' : 
                                                ecr.priority === 'HIGH' ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                                            }`}>
                                                {ecr.priority}
                                            </span>
                                        </div>
                                        <h4 className="font-black text-slate-900 text-lg mb-2 group-hover:text-blue-600 transition-colors">{ecr.title}</h4>
                                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">{ecr.description}</p>
                                        
                                        {/* Linked ECN Indicator for Completed ECRs */}
                                        {ecr.ecns && ecr.ecns.length > 0 && (
                                            <div className="flex gap-2 items-center mt-auto border-t border-slate-100 pt-3">
                                                <FileText className="w-3 h-3 text-slate-400" />
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Linked ECNs:</span>
                                                {ecr.ecns.map(ecn => (
                                                    <span key={ecn.id} className="text-[9px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                                                        {ecn.id} ({ecn.status})
                                                    </span>
                                                ))}
                                            </div>
                                        )}
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
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase text-center">CM Triage: {selectedECR.id}</h3>
                                        <p className="text-slate-500 font-medium mt-2">Pulling PLM context and generating briefings...</p>
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
                                                    disabled={selectedECR.status === 'COMPLETED' || selectedECR.status === 'APPROVED'}
                                                    onChange={(e) => handleUpdatePriority(e.target.value)}
                                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-700 outline-none transition-all ${
                                                        (selectedECR.status === 'COMPLETED' || selectedECR.status === 'APPROVED')
                                                        ? 'bg-slate-200 text-slate-500 border-slate-300 cursor-not-allowed opacity-75' 
                                                        : 'bg-slate-900 text-white cursor-pointer hover:bg-black'
                                                    }`}
                                                >
                                                    <option value="CRITICAL">Critical</option>
                                                    <option value="HIGH">High</option>
                                                    <option value="MAJOR">Major</option>
                                                    <option value="LOW">Low</option>
                                                </select>
                                                {(selectedECR.status === 'COMPLETED' || selectedECR.status === 'APPROVED') && (
                                                    <span className="text-[9px] font-bold text-slate-400 block mt-1">Priority locked for closed records</span>
                                                )}
                                                <div className="mt-4">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">AI Risk Score</p>
                                                    <p className={`text-4xl font-black tracking-tighter ${analysis.management.riskScore > 7 ? 'text-red-600' : 'text-slate-900'}`}>{analysis.management.riskScore}/10</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Board Briefing Card - Hidden for COMPLETED/APPROVED */}
                                        {(selectedECR.status !== 'COMPLETED' && selectedECR.status !== 'APPROVED') && (
                                            <div className="p-6 bg-blue-50 rounded-[32px] border border-blue-100 shadow-sm relative overflow-hidden">
                                                <h5 className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2"><BookOpen className="w-4 h-4" /> Board Briefing</h5>
                                                <div className="text-[11px] text-blue-900 leading-relaxed max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                                    {analysis.management.preMeetingBriefing ? analysis.management.preMeetingBriefing.split('\n').map((para, i) => (
                                                        <p key={i} className="mb-3 last:mb-0">{para}</p>
                                                    )) : "No briefing available."}
                                                </div>
                                            </div>
                                        )}

                                        {/* CCB Scheduling Feature - Hidden for COMPLETED/APPROVED */}
                                        {(selectedECR.status !== 'COMPLETED' && selectedECR.status !== 'APPROVED') && (
                                            <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-200 shadow-sm">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-600" /> Schedule CCB Review</h5>
                                                    <button 
                                                        onClick={() => setIsScheduling(!isScheduling)}
                                                        className="text-[10px] font-bold text-blue-600 hover:underline"
                                                    >
                                                        {isScheduling ? "Cancel" : "Modify"}
                                                    </button>
                                                </div>
                                                
                                                {isScheduling ? (
                                                    <div className="space-y-6 animate-in slide-in-from-top-2">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            {/* Enhanced Date Input */}
                                                            <div className="relative">
                                                                <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Meeting Date</label>
                                                                <div className="relative group">
                                                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                                                        <Calendar className="w-4 h-4 text-blue-500" />
                                                                    </div>
                                                                    <input 
                                                                        type="date" 
                                                                        value={meetingDate}
                                                                        onChange={(e) => setMeetingDate(e.target.value)}
                                                                        className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm" 
                                                                    />
                                                                </div>
                                                            </div>
                                                            {/* Enhanced Time Input with "Digital Clock" feel */}
                                                            <div className="relative">
                                                                <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Board Time</label>
                                                                <div className="relative group">
                                                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                                                        <Clock className="w-4 h-4 text-blue-500" />
                                                                    </div>
                                                                    <input 
                                                                        type="time" 
                                                                        value={meetingTime}
                                                                        onChange={(e) => setMeetingTime(e.target.value)}
                                                                        className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm" 
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Quick Digital Clock Pickers - Visual Aid */}
                                                        <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 flex flex-col items-center">
                                                            <div className="text-[10px] font-black text-blue-400 uppercase mb-2">Digital Preview</div>
                                                            <div className="flex items-center gap-3">
                                                                <div className="bg-white px-3 py-2 rounded-lg border border-blue-200 font-mono text-2xl font-black text-blue-600 shadow-sm">
                                                                    {meetingTime ? meetingTime.split(':')[0] : '--'}
                                                                </div>
                                                                <span className="text-2xl font-black text-blue-300">:</span>
                                                                <div className="bg-white px-3 py-2 rounded-lg border border-blue-200 font-mono text-2xl font-black text-blue-600 shadow-sm">
                                                                    {meetingTime ? meetingTime.split(':')[1] : '--'}
                                                                </div>
                                                                <div className="flex flex-col gap-1 ml-2">
                                                                    <span className="text-[8px] font-black text-blue-500 bg-white px-1.5 py-0.5 rounded border border-blue-200">ZULU</span>
                                                                    <span className="text-[8px] font-black text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">LCL</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">Invite Identified SMEs</label>
                                                            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                                                                {analysis.management.stakeholders.map((s, idx) => (
                                                                    <label key={idx} className="flex items-center gap-3 p-2 bg-white border border-slate-100 rounded-xl cursor-pointer group hover:bg-blue-50 hover:border-blue-200 transition-all">
                                                                        <input 
                                                                            type="checkbox" 
                                                                            checked={invitedSMEs.includes(s.role)}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) setInvitedSMEs([...invitedSMEs, s.role]);
                                                                                else setInvitedSMEs(invitedSMEs.filter(role => role !== s.role));
                                                                            }}
                                                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                                                                        />
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-[10px] font-black text-slate-700 group-hover:text-blue-700 transition-colors uppercase truncate">{s.role}</p>
                                                                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{s.priority}</p>
                                                                        </div>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={handleScheduleMeeting}
                                                            className="w-full py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-transform active:scale-95"
                                                        >
                                                            <Send className="w-3 h-3" /> Broadcast CCB Invitation
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="p-8 text-center flex flex-col items-center gap-3">
                                                        <div className="w-12 h-12 bg-blue-50 text-blue-400 rounded-full flex items-center justify-center"><Calendar className="w-6 h-6" /></div>
                                                        <p className="text-[10px] text-slate-500 font-medium">Ready for Board Review</p>
                                                        <button onClick={() => setIsScheduling(true)} className="text-[10px] font-black text-blue-600 uppercase tracking-widest underline decoration-2 underline-offset-4">Open Scheduler</button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* ECN List for Completed/Approved with Clickable Details */}
                                        {selectedECR.ecns && selectedECR.ecns.length > 0 && (
                                            <div className="pt-6 border-t border-slate-100 space-y-4">
                                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-600" /> Linked ECNs (PLM Records)</h5>
                                                
                                                {/* User-friendly ECN Fetch Error Message */}
                                                {ecnError && (
                                                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-1 shadow-sm">
                                                        <AlertOctagon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                                        <div className="flex-1">
                                                            <p className="text-[10px] font-bold text-red-700 leading-tight">{ecnError}</p>
                                                        </div>
                                                        <button onClick={() => setEcnError(null)} className="p-1 hover:bg-red-100 rounded-lg text-red-400 transition-colors">
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                )}

                                                {selectedECR.ecns.map((ecn, i) => (
                                                    <div 
                                                        key={i} 
                                                        onClick={() => handleECNClick(ecn.id)}
                                                        className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-2xl shadow-sm cursor-pointer hover:bg-emerald-100 transition-all group"
                                                    >
                                                        <div className="p-2 rounded-lg bg-white text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                                            {isFetchingECN ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                                                {ecn.id} 
                                                                <span className="text-[8px] px-1 bg-white text-emerald-600 border border-emerald-200 rounded tracking-widest">DIGITAL</span>
                                                            </p>
                                                            <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest">{ecn.status}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

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
                                                { s: 'Triaged', c: selectedECR.status !== 'PENDING', icon: Zap },
                                                { s: 'Review', c: selectedECR.status !== 'PENDING' && selectedECR.status !== 'TRIAGED', icon: Users },
                                                { s: 'Approval', c: selectedECR.status === 'APPROVED' || selectedECR.status === 'COMPLETED', icon: CheckCircle },
                                                { s: 'Installed', c: selectedECR.status === 'COMPLETED', icon: Settings },
                                                { s: 'Closed', c: selectedECR.status === 'COMPLETED', icon: ShieldAlert }
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

            {/* ECN Detail Modal Overlay */}
            {selectedECNDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                                    <FileCheck className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">ECN Record: {selectedECNDetail.id}</h3>
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Released Change Impact Analysis</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedECNDetail(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-all"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div>
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Change Title</h5>
                                <p className="text-lg font-black text-slate-900 leading-tight">{selectedECNDetail.title}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-8">
                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                    <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Users className="w-3 h-3 text-emerald-600" /> Approver</h5>
                                    <p className="text-sm font-black text-slate-800 tracking-tight">{selectedECNDetail.approver}</p>
                                </div>
                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                    <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Calendar className="w-3 h-3 text-emerald-600" /> Approval Date</h5>
                                    <p className="text-sm font-black text-slate-800 tracking-tight">{selectedECNDetail.approvalDate}</p>
                                </div>
                            </div>

                            <div className="p-8 bg-emerald-50 rounded-[32px] border border-emerald-100">
                                <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <ShieldAlert className="w-4 h-4" /> Solution Implemented
                                </h5>
                                <p className="text-sm text-emerald-900 leading-relaxed font-medium italic">
                                    "{selectedECNDetail.solution}"
                                </p>
                            </div>

                            <div>
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Impacted Engineering Documents</h5>
                                <div className="flex flex-wrap gap-2">
                                    {selectedECNDetail.impactedDocs.map((doc, idx) => (
                                        <span key={idx} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 shadow-sm flex items-center gap-2">
                                            <FileText className="w-3 h-3 text-blue-500" /> {doc}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-8 bg-slate-900 flex justify-end">
                            <button 
                                onClick={() => setSelectedECNDetail(null)}
                                className="px-8 py-3 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-slate-100 transition-all"
                            >
                                Close Record
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #bfdbfe; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default CMAssistant;
