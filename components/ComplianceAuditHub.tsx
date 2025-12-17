import React, { useState, useRef, useEffect } from 'react';
import * as mammoth from 'mammoth';
import { 
  ClipboardCheck, 
  Database, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  FileText, 
  Download, 
  Layers, 
  Loader2,
  RefreshCw,
  Share2,
  Cpu,
  ArrowRight,
  Upload,
  FileType,
  X,
  History,
  ChevronDown,
  ChevronUp,
  Clock
} from 'lucide-react';
import { evaluateCompliance, generateCertificationReport, parseRegulationDocument, extractRequirementsFromDocument } from '../services/geminiService';
import { ComplianceAuditResult, PLMDataArtifact, ProcessedSegment, CertificationReport } from '../types';

interface AuditHistoryEntry {
    id: string;
    date: string;
    title: string;
    score: number;
    riskLevel: string;
    regSegments: ProcessedSegment[];
    plmData: PLMDataArtifact[];
    auditResult: ComplianceAuditResult;
    report: CertificationReport | null;
}

const MOCK_PLM_DATA: PLMDataArtifact[] = [
    { id: "REQ-001", type: "REQUIREMENT", name: "System Boot Time", status: "APPROVED", contentSnippet: "System shall boot within 5 seconds.", traceLinks: ["TEST-001"] },
    { id: "TEST-001", type: "TEST_CASE", name: "Boot Timing Test", status: "APPROVED", contentSnippet: "Measure time from power on to UI load.", traceLinks: ["RES-001"] },
    { id: "RES-001", type: "TEST_RESULT", name: "Boot Test Log", status: "APPROVED", contentSnippet: "Result: 4.8s. PASS.", traceLinks: [] },
    { id: "REQ-002", type: "REQUIREMENT", name: "Failure Annunciation", status: "DRAFT", contentSnippet: "System must alert crew on failure.", traceLinks: [] }, 
    { id: "DES-101", type: "DESIGN_DOC", name: "Architecture Spec", status: "APPROVED", contentSnippet: "High Level Design of Avionics Bus.", traceLinks: ["REQ-001"] },
];

const DEFAULT_REGULATION_TEXT = `CS-25.1309 Equipment, systems and installations.
(a) The equipment, systems, and installations whose functioning is required by this Subpart, must be designed to ensure that they perform their intended functions under any foreseeable operating condition.
(b) The aeroplane systems and associated components, considered separately and in relation to other systems, must be designed so that the occurrence of any failure condition which would prevent the continued safe flight and landing of the aeroplane is extremely improbable.`;

const ComplianceAuditHub: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'GAPS' | 'REPORT'>('OVERVIEW');
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(0); 
    
    // State
    const [regSegments, setRegSegments] = useState<ProcessedSegment[]>([]);
    const [plmData, setPlmData] = useState<PLMDataArtifact[]>([]);
    const [auditResult, setAuditResult] = useState<ComplianceAuditResult | null>(null);
    const [report, setReport] = useState<CertificationReport | null>(null);
    
    // History State
    const [history, setHistory] = useState<AuditHistoryEntry[]>([]);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // File Upload State
    const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number; mimeType: string; data: string | ArrayBuffer } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load history on mount
    useEffect(() => {
        const savedHistory = localStorage.getItem('aero_audit_history');
        if (savedHistory) {
            try {
                setHistory(JSON.parse(savedHistory));
            } catch (e) {
                console.error("Failed to parse audit history", e);
            }
        }
    }, []);

    // Save history when it changes
    useEffect(() => {
        localStorage.setItem('aero_audit_history', JSON.stringify(history));
    }, [history]);

    const addToHistory = (result: ComplianceAuditResult, currentReport: CertificationReport | null) => {
        const newEntry: AuditHistoryEntry = {
            id: Date.now().toString(),
            date: new Date().toLocaleString(),
            title: uploadedFile?.name || "Automated PLM Audit",
            score: result.overallScore,
            riskLevel: result.riskLevel,
            regSegments,
            plmData,
            auditResult: result,
            report: currentReport
        };
        setHistory(prev => [newEntry, ...prev.slice(0, 9)]); // Keep last 10
    };

    const loadHistoryEntry = (entry: AuditHistoryEntry) => {
        setRegSegments(entry.regSegments);
        setPlmData(entry.plmData);
        setAuditResult(entry.auditResult);
        setReport(entry.report);
        setStep(3);
        setIsHistoryOpen(false);
        setActiveTab('OVERVIEW');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.pdf')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const base64 = (ev.target?.result as string).split(',')[1];
                setUploadedFile({ name: file.name, size: file.size, mimeType: 'application/pdf', data: base64 });
            };
            reader.readAsDataURL(file);
        } else if (fileName.endsWith('.docx')) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                setUploadedFile({ name: file.name, size: file.size, mimeType: 'text/plain', data: result.value });
            } catch (err) {
                alert("Error reading DOCX");
            }
        } else {
             const text = await file.text();
             setUploadedFile({ name: file.name, size: file.size, mimeType: 'text/plain', data: text });
        }
        e.target.value = '';
    };

    const runPLMAudit = async () => {
        setIsLoading(true);
        setStep(1);
        try {
            await new Promise(r => setTimeout(r, 1000));
            setPlmData(MOCK_PLM_DATA);
            await runAnalysis(MOCK_PLM_DATA);
        } catch (e) {
            alert("PLM Connection Failed.");
            setStep(0);
        } finally {
            setIsLoading(false);
        }
    };

    const runManualAudit = async () => {
        if (!uploadedFile) return;
        setIsLoading(true);
        setStep(1);
        try {
            let inputPayload;
            if (uploadedFile.mimeType === 'application/pdf') {
                inputPayload = { data: uploadedFile.data as string, mimeType: 'application/pdf' };
            } else {
                inputPayload = uploadedFile.data as string;
            }
            const extractedArtifacts = await extractRequirementsFromDocument(inputPayload);
            setPlmData(extractedArtifacts);
            if (extractedArtifacts.length === 0) {
                alert("No requirements found in the document.");
                setStep(0);
                setIsLoading(false);
                return;
            }
            await runAnalysis(extractedArtifacts);
        } catch (e) {
            alert("Failed to process document.");
            setStep(0);
        } finally {
            setIsLoading(false);
        }
    };

    const runAnalysis = async (artifacts: PLMDataArtifact[]) => {
        setStep(2);
        try {
            const parseRes = await parseRegulationDocument(DEFAULT_REGULATION_TEXT);
            setRegSegments(parseRes.segments);
            const results = await evaluateCompliance(parseRes.segments, artifacts);
            setAuditResult(results);
            setStep(3);
            // We'll add to history here if report is null, then update history if report is generated later
            addToHistory(results, null);
        } catch (e) {
            alert("Compliance Analysis Failed.");
            setStep(0);
        }
    };

    const handleGenerateReport = async () => {
        if (!auditResult) return;
        setIsLoading(true);
        try {
            const reportData = await generateCertificationReport(auditResult, "Compliance Audit Report");
            setReport(reportData);
            // Update the latest history entry with the new report
            setHistory(prev => {
                const newHist = [...prev];
                if (newHist.length > 0) {
                    newHist[0].report = reportData;
                }
                return newHist;
            });
            setActiveTab('REPORT');
        } catch (e) {
            alert("Report Generation Failed");
        } finally {
            setIsLoading(false);
        }
    };

    const reset = () => {
        setStep(0);
        setUploadedFile(null);
        setAuditResult(null);
        setReport(null);
        setActiveTab('OVERVIEW');
    };

    const OverviewTab = () => (
        <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Compliance Score</p>
                        <h3 className={`text-4xl font-bold mt-2 ${
                            (auditResult?.overallScore || 0) > 80 ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                            {auditResult?.overallScore || 0}%
                        </h3>
                    </div>
                    <div className="h-16 w-16 rounded-full border-4 border-slate-100 flex items-center justify-center">
                        <ClipboardCheck className="text-slate-400" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Risk Level</p>
                        <h3 className={`text-2xl font-bold mt-2 ${
                            auditResult?.riskLevel === 'HIGH' ? 'text-red-600' : 
                            auditResult?.riskLevel === 'MODERATE' ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                            {auditResult?.riskLevel || "UNKNOWN"}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">Based on traceability gaps</p>
                    </div>
                     <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
                        <AlertTriangle className="text-red-500" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-sm text-slate-500 font-medium">Artifacts Scanned</p>
                    <div className="flex items-end gap-2 mt-2">
                        <h3 className="text-3xl font-bold text-slate-800">{plmData.length}</h3>
                        <span className="text-xs text-slate-500 mb-1">items analyzed</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                         <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">Reqs: {plmData.filter(x => x.type === 'REQUIREMENT').length}</span>
                         <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">Tests: {plmData.filter(x => x.type.includes('TEST')).length}</span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-blue-500" />
                    Traceability Matrix (Visualized)
                </h3>
                <div className="space-y-4">
                    {auditResult?.traceabilityMatrix.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                             <div className="w-32 flex-shrink-0">
                                <span className="text-xs font-bold text-slate-500 uppercase">Clause</span>
                                <div className="font-mono text-sm font-bold text-slate-800">{item.regId}</div>
                             </div>
                             <ArrowRight className="text-slate-300 w-4 h-4" />
                             <div className="flex-1 flex flex-wrap gap-2">
                                {item.artifacts.length > 0 ? (
                                    item.artifacts.map(artId => (
                                        <span key={artId} className="px-3 py-1 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700 shadow-sm flex items-center gap-1">
                                            {artId.startsWith('REQ') ? <FileText className="w-3 h-3 text-blue-500"/> : 
                                             artId.startsWith('TEST') ? <Cpu className="w-3 h-3 text-purple-500"/> : 
                                             <Database className="w-3 h-3 text-slate-500"/>}
                                            {artId}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-xs text-red-500 font-bold flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" /> Missing Links
                                    </span>
                                )}
                             </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const GapsTab = () => (
        <div className="space-y-4 animate-in slide-in-from-right-4">
            {auditResult?.gapAnalysis.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
                    <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-800">No Gaps Detected</h3>
                    <p className="text-slate-500">All regulatory requirements have corresponding evidence.</p>
                </div>
            ) : (
                auditResult?.gapAnalysis.map((gap, i) => (
                    <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-red-500">
                        <div className="flex justify-between items-start">
                            <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">
                                    {gap.severity}
                                </span>
                                {gap.issue}
                            </h4>
                            <span className="text-xs font-mono text-slate-400">Ref: {gap.regulationClauseId}</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-2">
                            <span className="font-semibold">Missing Artifact:</span> {gap.missingArtifactType}
                        </p>
                        <div className="mt-4 bg-slate-50 p-3 rounded text-sm border border-slate-100">
                            <span className="text-xs font-bold text-slate-500 uppercase block mb-1">AI Recommendation</span>
                            {gap.recommendation}
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    const ReportTab = () => (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in zoom-in-95">
             <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-slate-800">{report?.title || "Certification Report"}</h3>
                </div>
                <button className="text-sm flex items-center gap-2 text-slate-600 hover:text-slate-900">
                    <Download className="w-4 h-4" /> PDF
                </button>
            </div>
            {report ? (
                <div className="p-8 max-w-4xl mx-auto prose prose-slate prose-sm">
                    <div className="text-xs text-slate-400 mb-6 uppercase tracking-widest font-bold">Generated: {report.generatedDate}</div>
                    <h4 className="text-lg font-bold text-slate-900 mb-2">Executive Summary</h4>
                    <p className="text-slate-700 leading-relaxed mb-6 whitespace-pre-line">{report.executiveSummary}</p>
                    <h4 className="text-lg font-bold text-slate-900 mb-2">Compliance Matrix</h4>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 font-mono text-xs mb-6 whitespace-pre-wrap">
                        {report.complianceTable}
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 mb-2">Gap Analysis & Corrective Actions</h4>
                    <p className="text-slate-700 leading-relaxed mb-6 whitespace-pre-line">{report.gapAnalysisSection}</p>
                    <div className="border-t border-slate-200 pt-6">
                        <h4 className="text-lg font-bold text-slate-900 mb-2">Conclusion</h4>
                        <p className="text-slate-800 font-medium italic">{report.conclusion}</p>
                    </div>
                </div>
            ) : (
                <div className="p-12 text-center text-slate-400">
                    <p>Generate the report to view details.</p>
                </div>
            )}
        </div>
    );

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
            <h2 className="text-3xl font-bold text-slate-900">Compliance & Audit Hub</h2>
            <p className="text-slate-500 mt-2">End-to-End Certification Management (Regs vs. PLM/Docs)</p>
        </div>
        <div className="flex gap-3">
             <button 
                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                    isHistoryOpen ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
            >
                <History className="w-4 h-4" /> 
                History {history.length > 0 && `(${history.length})`}
                {isHistoryOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
             <button 
                onClick={reset}
                className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg flex items-center gap-2 transition-all"
            >
                <RefreshCw className="w-4 h-4" /> Reset
            </button>
        </div>
      </header>

      {/* History Collapsible Panel */}
      {isHistoryOpen && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden animate-in slide-in-from-top-4 duration-300">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                      <Clock className="w-4 h-4 text-slate-400" /> Recent Audits
                  </h3>
                  <button onClick={() => setHistory([])} className="text-xs text-red-500 font-medium hover:underline">Clear History</button>
              </div>
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {history.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-sm italic">No past audits recorded.</div>
                  ) : (
                      history.map((entry) => (
                          <div key={entry.id} className="p-4 hover:bg-slate-50 transition-all flex items-center justify-between group">
                              <div className="flex items-center gap-4">
                                  <div className={`p-2 rounded-lg ${entry.score > 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                      <span className="text-sm font-black">{entry.score}%</span>
                                  </div>
                                  <div>
                                      <p className="text-sm font-bold text-slate-800 truncate max-w-[200px]">{entry.title}</p>
                                      <p className="text-[10px] text-slate-400 font-medium uppercase">{entry.date}</p>
                                  </div>
                              </div>
                              <button 
                                onClick={() => loadHistoryEntry(entry)}
                                className="opacity-0 group-hover:opacity-100 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-blue-100 flex items-center gap-1"
                              >
                                  Restore Session <ArrowRight className="w-3 h-3" />
                              </button>
                          </div>
                      ))
                  )}
              </div>
          </div>
      )}

      {/* Main Content Area */}
      {step === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center group">
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110">
                      <Database className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Automated PLM Audit</h3>
                  <p className="text-slate-500 mt-2 mb-8 text-sm leading-relaxed">
                      Connect to Teamcenter/Windchill to automatically fetch live requirements and test cases for compliance checking.
                  </p>
                  <button 
                    onClick={runPLMAudit}
                    className="mt-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold shadow-md w-full flex items-center justify-center gap-2 transition-transform hover:translate-y-[-2px]"
                  >
                      <Share2 className="w-5 h-5" /> Connect PLM
                  </button>
              </div>

              <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center group">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 transition-transform group-hover:scale-110">
                      <FileText className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Manual Document Audit</h3>
                  <p className="text-slate-500 mt-2 mb-8 text-sm leading-relaxed">
                      Upload a Requirements Specification (PDF, DOCX) to extract data and run a compliance check manually.
                  </p>
                  
                  {uploadedFile ? (
                      <div className="w-full bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4 flex items-center justify-between animate-in zoom-in-95">
                          <div className="flex items-center gap-3 overflow-hidden">
                              <FileType className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                              <div className="text-left overflow-hidden">
                                  <p className="text-sm font-bold text-slate-800 truncate">{uploadedFile.name}</p>
                                  <p className="text-xs text-slate-500">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                              </div>
                          </div>
                          <button onClick={() => setUploadedFile(null)} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                      </div>
                  ) : null}

                  {uploadedFile ? (
                       <button 
                        onClick={runManualAudit}
                        className="mt-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold shadow-md w-full flex items-center justify-center gap-2 transition-transform hover:translate-y-[-2px]"
                      >
                          <CheckCircle className="w-5 h-5" /> Run Audit
                      </button>
                  ) : (
                      <>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload}
                            accept=".pdf,.docx,.doc,.txt,.xml,.json,.html" 
                            className="hidden" 
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-auto bg-white border-2 border-slate-200 hover:border-emerald-500 hover:text-emerald-600 text-slate-600 px-6 py-3 rounded-lg font-bold w-full flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md"
                        >
                            <Upload className="w-5 h-5" /> Upload File
                        </button>
                      </>
                  )}
              </div>
          </div>
      ) : (
          <>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit shadow-inner">
                {(['OVERVIEW', 'GAPS', 'REPORT'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${
                            activeTab === tab 
                            ? 'bg-white text-blue-600 shadow-md transform scale-105 z-10' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {tab === 'OVERVIEW' && 'Audit Overview'}
                        {tab === 'GAPS' && 'Gap Analysis'}
                        {tab === 'REPORT' && 'Certification Report'}
                    </button>
                ))}
            </div>

            <div className="min-h-[400px]">
                {isLoading && step < 3 ? (
                    <div className="flex flex-col items-center justify-center h-64">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                        <h3 className="text-lg font-black text-slate-700 uppercase tracking-widest">
                            {step === 1 ? "Extracting Data..." : "Analyzing Compliance..."}
                        </h3>
                        <p className="text-slate-400 text-sm mt-1">
                            {step === 1 ? "Analyzing document structure and requirements..." : "Analyzing traceability and evidence coverage..."}
                        </p>
                    </div>
                ) : (
                    <>
                        {activeTab === 'OVERVIEW' && <OverviewTab />}
                        {activeTab === 'GAPS' && <GapsTab />}
                        {activeTab === 'REPORT' && (
                            <div className="space-y-4">
                                {!report && (
                                     <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-indigo-100 rounded-xl">
                                                <Sparkles className="w-6 h-6 text-indigo-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-indigo-900">Ready to Generate Final Artifacts?</h4>
                                                <p className="text-indigo-700 text-sm mt-0.5">Create a formal PDF-ready certification document from these results.</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={handleGenerateReport}
                                            disabled={isLoading}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95"
                                        >
                                            {isLoading ? <Loader2 className="animate-spin w-5 h-5"/> : <FileText className="w-5 h-5" />}
                                            Generate Report
                                        </button>
                                     </div>
                                )}
                                <ReportTab />
                            </div>
                        )}
                    </>
                )}
            </div>
          </>
      )}
    </div>
  );
};

const Sparkles = ({ className }: { className?: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
        <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
    </svg>
);

export default ComplianceAuditHub;