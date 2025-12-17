
import React, { useState, useRef, useEffect } from 'react';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { parseRegulationDocument, semanticSearchRegulations } from '../services/geminiService';
import { RegulationPipelineResult, ProcessedSegment } from '../types';
import { Network, Upload, FileText, ArrowRight, BookOpen, AlertCircle, CheckSquare, Layers, Database, Cpu, FileJson, Tag, Loader2, ChevronDown, ChevronUp, Eye, EyeOff, ShieldAlert, FileType, X, AlertTriangle, Sparkles, Search, Library, Trash2 } from 'lucide-react';

const DEFAULT_TEXT = `CS-25.1309 Equipment, systems and installations.
(a) The equipment, systems, and installations whose functioning is required by this Subpart, must be designed to ensure that they perform their intended functions under any foreseeable operating condition.
(b) The aeroplane systems and associated components, considered separately and in relation to other systems, must be designed so that the occurrence of any failure condition which would prevent the continued safe flight and landing of the aeroplane is extremely improbable.
(c) Warning information must be provided to alert the crew to unsafe system operating conditions, and to enable them to take appropriate corrective action. Systems must have clear annunciation.
(d) Compliance with the requirements of paragraph (b) of this section must be shown by analysis, and where necessary, by appropriate ground, flight, or simulator tests. The analysis must consider possible modes of failure, including malfunctions and damage from external sources.`;

const SegmentDisplay: React.FC<{ segment: ProcessedSegment }> = ({ segment }) => {
    const [showRaw, setShowRaw] = useState(false);
    const { structured_rule } = segment;

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden transition-all duration-300">
            {/* Primary View: Extracted Intelligence */}
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <span className="text-xl font-mono font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded">{segment.id}</span>
                        <span className={`text-xs uppercase font-bold px-3 py-1.5 rounded-full border tracking-wide ${
                            segment.normalization === 'COMPLIANCE_OBLIGATION' 
                            ? 'bg-red-50 text-red-600 border-red-200' 
                            : segment.normalization === 'GUIDANCE'
                            ? 'bg-blue-50 text-blue-600 border-blue-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                            {segment.normalization.replace('_', ' ')}
                        </span>
                    </div>
                    <button 
                        onClick={() => setShowRaw(!showRaw)}
                        className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors bg-slate-50 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-blue-100"
                    >
                        {showRaw ? (
                            <>
                                <EyeOff className="w-4 h-4" /> Hide Source Context
                                <ChevronUp className="w-4 h-4" />
                            </>
                        ) : (
                            <>
                                <Eye className="w-4 h-4" /> View Source Context
                                <ChevronDown className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>

                {/* Structured Rule Card */}
                <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden mb-6">
                    {/* Header: Rule Type & Failure Conditions */}
                    <div className="flex flex-wrap items-center gap-6 p-4 bg-white border-b border-slate-200">
                         <div>
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Rule Type</span>
                             <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-purple-100 rounded-md text-purple-600">
                                    <Database className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-sm font-bold text-slate-700">{structured_rule.rule_type || "Standard Rule"}</span>
                             </div>
                         </div>
                         
                         {structured_rule.failure_condition && structured_rule.failure_condition.length > 0 && (
                             <div className="pl-6 border-l border-slate-200">
                                  <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest block mb-1">Failure Conditions</span>
                                  <div className="flex items-center gap-2">
                                    {structured_rule.failure_condition.map((fc, i) => (
                                        <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-50 text-red-700 text-xs font-bold border border-red-100">
                                            <ShieldAlert className="w-3.5 h-3.5" />
                                            {fc}
                                        </span>
                                    ))}
                                  </div>
                             </div>
                         )}
                    </div>

                    {/* Content: Object & Requirement */}
                    <div className="grid grid-cols-1 md:grid-cols-12 border-b border-slate-200">
                        <div className="md:col-span-4 p-5 border-b md:border-b-0 md:border-r border-slate-200 bg-white">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Object of Compliance</span>
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 w-1 h-12 bg-blue-500 rounded-full"></div>
                                <p className="text-base font-semibold text-slate-800 leading-snug">
                                    {structured_rule.object_of_compliance}
                                </p>
                            </div>
                        </div>
                        <div className="md:col-span-8 p-5 bg-white">
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Requirement / Constraint</span>
                             <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded border border-slate-100">
                                {structured_rule.requirement}
                            </p>
                        </div>
                    </div>
                    
                    {/* Footer: Evidence */}
                    <div className="p-4 bg-slate-50">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" /> 
                            Evidence Required (Artifacts)
                        </span>
                        <div className="flex flex-wrap gap-2">
                             {structured_rule.evidence_required && structured_rule.evidence_required.length > 0 ? (
                                    structured_rule.evidence_required.map((evidence, i) => (
                                        <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded shadow-sm border border-indigo-100">
                                            <CheckSquare className="w-3 h-3" />
                                            {evidence}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-sm text-slate-400 italic">No specific artifacts cited.</span>
                                )}
                        </div>
                    </div>
                </div>
                
                 {/* Semantic Summary */}
                <div className="bg-emerald-50/50 p-4 rounded-lg border border-emerald-100">
                    <h5 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                        <Cpu className="w-3.5 h-3.5" /> AI Semantic Interpretation
                    </h5>
                    <p className="text-sm text-slate-600 italic leading-relaxed">
                        "{segment.semantic_summary}"
                    </p>
                </div>
            </div>

            {/* Collapsible Source & Metadata */}
            {showRaw && (
                <div className="bg-slate-50 border-t border-slate-200 p-6 animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Original Regulatory Text</h5>
                            <div className="bg-white p-4 rounded-lg border border-slate-200 text-slate-600 text-sm font-mono leading-relaxed whitespace-pre-wrap shadow-inner">
                                {segment.original_text}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Metadata Tags</h5>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                                    <span className="text-xs text-slate-500 flex items-center gap-2"><BookOpen className="w-3 h-3"/> Source</span>
                                    <span className="text-xs font-semibold text-slate-700 truncate max-w-[120px]" title={segment.metadata.source_document}>{segment.metadata.source_document}</span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                                    <span className="text-xs text-slate-500 flex items-center gap-2"><Layers className="w-3 h-3"/> Lifecycle</span>
                                    <span className="text-xs font-semibold text-slate-700 truncate max-w-[120px]" title={segment.metadata.lifecycle_area}>{segment.metadata.lifecycle_area}</span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                                    <span className="text-xs text-slate-500 flex items-center gap-2"><Tag className="w-3 h-3"/> Category</span>
                                    <span className="text-xs font-semibold text-slate-700">{segment.metadata.category}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">DAL Applicability</span>
                                    <div className="flex flex-wrap gap-1">
                                        {segment.metadata.dal_applicability.map(dal => (
                                            <span key={dal} className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                                                {dal}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const RegulationParser: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'INGEST' | 'LIBRARY'>('INGEST');
  const [inputText, setInputText] = useState(DEFAULT_TEXT);
  const [binaryFile, setBinaryFile] = useState<{ name: string; size: number; mimeType: string; data: string } | null>(null);
  const [result, setResult] = useState<RegulationPipelineResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number>(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Library State (Mock Vector DB)
  const [library, setLibrary] = useState<ProcessedSegment[]>(() => {
      const saved = localStorage.getItem('aero_reg_library');
      return saved ? JSON.parse(saved) : [];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProcessedSegment[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
      localStorage.setItem('aero_reg_library', JSON.stringify(library));
  }, [library]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setBinaryFile(null);
    setInputText('');
    setResult(null);
    setActiveStep(-1);

    const fileName = file.name.toLowerCase();

    if (file.size > 20 * 1024 * 1024) {
        setError("File size exceeds 20MB limit. Please upload a smaller document.");
        e.target.value = '';
        return;
    }

    try {
        if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const base64 = (ev.target?.result as string).split(',')[1];
                setBinaryFile({
                    name: file.name,
                    size: file.size,
                    mimeType: 'application/pdf',
                    data: base64
                });
            };
            reader.onerror = () => setError("Failed to read the PDF file.");
            reader.readAsDataURL(file);
        } 
        else if (fileName.endsWith('.docx')) {
            const arrayBuffer = await file.arrayBuffer();
            const res = await mammoth.extractRawText({ arrayBuffer });
            if (!res.value.trim()) throw new Error("Document appears to be empty.");
            setInputText(res.value);
        }
        else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer);
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const csvData = XLSX.utils.sheet_to_csv(worksheet);
            if (!csvData.trim()) throw new Error("Spreadsheet appears to be empty.");
            setInputText(csvData);
        }
        else {
            const text = await file.text();
            if (!text.trim()) throw new Error("File appears to be empty.");
            setInputText(text);
        }
    } catch (err: any) {
        setError(err.message || "An error occurred while reading the file.");
        console.error(err);
    }

    e.target.value = '';
  };

  const handleParse = async () => {
    if (!inputText && !binaryFile) return;
    
    if (process.env.API_KEY === "__API_KEY__") {
        setError("API Key is not configured. Please ensure the API_KEY environment variable is set in your deployment.");
        return;
    }

    setIsLoading(true);
    setResult(null);
    setError(null);
    setActiveStep(0);

    const progressInterval = setInterval(() => {
        setActiveStep((prev) => {
            if (prev < 2) return prev + 1;
            return prev;
        });
    }, 2000);

    try {
      let payload;
      if (binaryFile) {
        payload = { data: binaryFile.data, mimeType: binaryFile.mimeType };
      } else {
        payload = inputText;
      }
      const pipelineResult = await parseRegulationDocument(payload);
      
      clearInterval(progressInterval);
      setActiveStep(3);
      
      setTimeout(() => {
          setResult(pipelineResult);
          // Auto-index into library
          setLibrary(prev => {
              const existingIds = new Set(prev.map(s => s.id));
              const newSegments = pipelineResult.segments.filter(s => !existingIds.has(s.id));
              return [...prev, ...newSegments];
          });
          setIsLoading(false);
          setActiveStep(-1);
      }, 500);

    } catch (e: any) {
      clearInterval(progressInterval);
      setActiveStep(-1);
      setError(e.message || "Pipeline processing failed.");
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
      if (!searchQuery.trim() || library.length === 0) return;
      setIsSearching(true);
      try {
          const results = await semanticSearchRegulations(searchQuery, library);
          setSearchResults(results);
      } catch (e) {
          alert("Semantic search failed.");
      } finally {
          setIsSearching(false);
      }
  };

  const clearLibrary = () => {
      if (confirm("Clear all indexed regulations?")) {
          setLibrary([]);
          setSearchResults(null);
      }
  };

  const PipelineStep = ({ title, icon, index }: { title: string, icon: React.ReactNode, index: number }) => {
    const isCompleted = index < activeStep;
    const isActive = index === activeStep;
    const colorClass = isActive ? "bg-blue-600 text-white animate-pulse" : isCompleted ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400";

    return (
        <div className="flex flex-col items-center gap-2 relative z-10">
            <div className={`w-14 h-14 rounded-full ${colorClass} flex items-center justify-center shadow-lg transition-all duration-500`}>
                {isCompleted ? <CheckSquare className="w-6 h-6" /> : isActive ? <Loader2 className="w-6 h-6 animate-spin" /> : icon}
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest text-center ${isActive ? 'text-blue-600' : isCompleted ? 'text-emerald-600' : 'text-slate-400'}`}>
                {title}
            </span>
        </div>
    );
  };

  return (
    <div className="space-y-8">
       <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                <Network className="w-8 h-8" />
            </div>
            <div>
                <h2 className="text-3xl font-bold text-slate-900">Regulation Engine</h2>
                <p className="text-slate-500 mt-1">Ingest, Interpret, and Semantic Indexing Pipeline</p>
            </div>
        </div>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
            <button 
                onClick={() => setActiveTab('INGEST')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'INGEST' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
                Pipeline
            </button>
            <button 
                onClick={() => setActiveTab('LIBRARY')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'LIBRARY' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
                Semantic Library ({library.length})
            </button>
        </div>
      </header>

      {activeTab === 'INGEST' ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl relative overflow-hidden">
            {isLoading && (
                <div className="absolute top-0 left-0 w-full h-1 bg-slate-100 overflow-hidden">
                    <div className="h-full bg-blue-600 animate-progress origin-left w-full"></div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    Ingestion Source
                </label>
                <div className="flex gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
                        <Upload className="w-4 h-4" /> Upload File
                    </button>
                </div>
            </div>

            {binaryFile ? (
                <div className="w-full h-48 p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative">
                    <button onClick={() => setBinaryFile(null)} className="absolute top-4 right-4 p-2 hover:bg-red-50 hover:text-red-500 rounded-xl text-slate-400 border border-slate-100"><X className="w-5 h-5" /></button>
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-2xl flex items-center justify-center mb-4"><FileType className="w-8 h-8" /></div>
                    <h4 className="font-bold text-slate-800">{binaryFile.name}</h4>
                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">PDF Document Indexed</p>
                </div>
            ) : (
                <textarea
                    className="w-full h-48 p-6 font-mono text-sm bg-slate-50 text-slate-900 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none resize-none transition-all"
                    value={inputText}
                    readOnly={isLoading}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Paste regulatory text here..."
                />
            )}

            {error && (
                <div className="mt-6 p-5 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-4">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                    <div>
                        <h5 className="text-sm font-black text-red-800 uppercase tracking-widest">Pipeline Error</h5>
                        <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                </div>
            )}
            
            <div className="mt-12 mb-8 flex items-center justify-between px-4 md:px-16 lg:px-24">
                <PipelineStep index={0} title="Ingest" icon={<FileText className="w-6 h-6"/>} />
                <div className="hidden md:block h-1 bg-slate-200 flex-1 mx-2 relative top-[-16px] rounded-full" />
                <PipelineStep index={1} title="Split & Chunk" icon={<Layers className="w-6 h-6"/>} />
                <div className="hidden md:block h-1 bg-slate-200 flex-1 mx-2 relative top-[-16px] rounded-full" />
                <PipelineStep index={2} title="Normalize" icon={<CheckSquare className="w-6 h-6"/>} />
                <div className="hidden md:block h-1 bg-slate-200 flex-1 mx-2 relative top-[-16px] rounded-full" />
                <PipelineStep index={3} title="Semantic Index" icon={<Database className="w-6 h-6"/>} />
            </div>

            <div className="mt-10 flex justify-center">
                <button
                    onClick={handleParse}
                    disabled={isLoading || (!inputText && !binaryFile)}
                    className="bg-slate-900 hover:bg-black text-white px-10 py-4 rounded-2xl font-black shadow-2xl flex items-center gap-3 transition-all transform hover:scale-105"
                >
                    {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6 text-blue-400" />}
                    Run AI Ingestion Pipeline
                </button>
            </div>
          </div>
      ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Library className="w-6 h-6 text-blue-600" />
                        Regulatory Semantic Library
                    </h3>
                    <button onClick={clearLibrary} className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1">
                        <Trash2 className="w-3.5 h-3.5" /> Clear Index
                    </button>
                  </div>
                  
                  <div className="relative group">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                          <Search className="w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      </div>
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Natural Language Query (e.g., 'What are the rules for failure probability in CS-25?')"
                        className="w-full pl-12 pr-32 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner"
                      />
                      <button 
                        onClick={handleSearch}
                        disabled={isSearching || !searchQuery.trim()}
                        className="absolute right-2 top-2 bottom-2 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all disabled:opacity-50"
                      >
                          {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Semantic Search'}
                      </button>
                  </div>
              </div>

              {/* Search Results */}
              <div className="space-y-6">
                  {searchResults ? (
                      <>
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Search className="w-4 h-4" /> Top Semantic Matches
                            </h4>
                            <button onClick={() => setSearchResults(null)} className="text-xs text-blue-600 font-bold">View All Library</button>
                        </div>
                        {searchResults.length === 0 ? (
                            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 italic">No semantic matches found in library.</div>
                        ) : (
                            searchResults.map(s => <SegmentDisplay key={s.id} segment={s} />)
                        )}
                      </>
                  ) : library.length > 0 ? (
                      <>
                        <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Database className="w-4 h-4" /> All Indexed Segments
                        </h4>
                        {library.map(s => <SegmentDisplay key={s.id} segment={s} />)}
                      </>
                  ) : (
                      <div className="p-12 text-center bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200">
                          <Database className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                          <h3 className="text-lg font-bold text-slate-400">Library Empty</h3>
                          <p className="text-sm text-slate-400 mt-2">Use the Pipeline to ingest and semantic-index regulatory documents.</p>
                      </div>
                  )}
              </div>
          </div>
      )}

      {activeTab === 'INGEST' && result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                    <FileJson className="w-8 h-8 text-emerald-600" />
                    Interpretation Model Output: {result.documentTitle}
                </h3>
                <div className="flex items-center gap-2 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-emerald-200">
                    <Layers className="w-3.5 h-3.5" />
                    {result.segments.length} Semantic Segments Indexed
                </div>
            </div>
            
            <div className="grid gap-8">
                {result.segments.map((segment) => (
                    <SegmentDisplay key={segment.id} segment={segment} />
                ))}
            </div>
        </div>
      )}

      <style>{`
        @keyframes progress {
            0% { transform: scaleX(0); }
            50% { transform: scaleX(0.7); }
            100% { transform: scaleX(0.95); }
        }
        .animate-progress {
            animation: progress 15s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default RegulationParser;
