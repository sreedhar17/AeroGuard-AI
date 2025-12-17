import React, { useState, useRef } from 'react';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { parseRegulationDocument } from '../services/geminiService';
import { RegulationPipelineResult, ProcessedSegment } from '../types';
import { Network, Upload, FileText, ArrowRight, BookOpen, AlertCircle, CheckSquare, Layers, Database, Cpu, FileJson, Tag, Loader2, ChevronDown, ChevronUp, Eye, EyeOff, ShieldAlert, FileType, X } from 'lucide-react';

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
  const [inputText, setInputText] = useState(DEFAULT_TEXT);
  const [binaryFile, setBinaryFile] = useState<{ name: string; size: number; mimeType: string; data: string } | null>(null);
  const [result, setResult] = useState<RegulationPipelineResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset previous inputs
    setBinaryFile(null);
    setInputText('');
    setResult(null);

    const fileName = file.name.toLowerCase();

    // 1. Handle PDF (Binary)
    if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = (ev.target?.result as string).split(',')[1]; // Remove data URL prefix
            setBinaryFile({
                name: file.name,
                size: file.size,
                mimeType: 'application/pdf',
                data: base64
            });
        };
        reader.readAsDataURL(file);
    } 
    // 2. Handle DOCX (Text Extraction)
    else if (fileName.endsWith('.docx')) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            setInputText(result.value);
        } catch (err) {
            alert("Error parsing DOCX file.");
        }
    }
    // 3. Handle XLSX/XLS (Text Extraction)
    else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer);
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const csvData = XLSX.utils.sheet_to_csv(worksheet);
            setInputText(csvData);
        } catch (err) {
            alert("Error parsing Excel file.");
        }
    }
    // 4. Handle JSON/Text/XML (Raw Read)
    else {
        try {
            const text = await file.text();
            setInputText(text);
        } catch (err) {
            alert("Error reading text file.");
        }
    }

    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleClearFile = () => {
    setBinaryFile(null);
    setInputText('');
  };

  const handleParse = async () => {
    if (!inputText && !binaryFile) return;
    setIsLoading(true);
    setResult(null);
    try {
      let payload;
      if (binaryFile) {
        payload = { data: binaryFile.data, mimeType: binaryFile.mimeType };
      } else {
        payload = inputText;
      }
      const pipelineResult = await parseRegulationDocument(payload);
      setResult(pipelineResult);
    } catch (e) {
      alert("Failed to process document through the pipeline. Please check the API key and file format.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const PipelineStep = ({ title, icon, color }: { title: string, icon: React.ReactNode, color: string }) => (
    <div className="flex flex-col items-center gap-2 relative z-10">
        <div className={`w-12 h-12 rounded-full ${color} text-white flex items-center justify-center shadow-lg`}>
            {icon}
        </div>
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide text-center">{title}</span>
    </div>
  );

  const PipelineConnector = () => (
      <div className="hidden md:block h-1 bg-slate-200 flex-1 mx-2 relative top-[-14px]"></div>
  );

  return (
    <div className="space-y-8">
       <header>
        <h2 className="text-3xl font-bold text-slate-900">Regulatory Ingestion Pipeline</h2>
        <p className="text-slate-500 mt-2">Ingest, Normalize, Chunk, and Interpret Regulatory Documents (PDF, DOCX, XML)</p>
      </header>

      {/* Input Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-4">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-500" />
                Raw Document Source
            </label>
             <div className="flex gap-2">
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload}
                    accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.md,.json,.csv,.xml,.html" 
                    className="hidden" 
                />
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                    <Upload className="w-3.5 h-3.5" />
                    Upload File (PDF/DOCX/XML)
                </button>
            </div>
        </div>

        {/* Dynamic Input Area: Text Editor or File Card */}
        {binaryFile ? (
            <div className="w-full h-40 p-4 bg-slate-50 rounded-lg border border-slate-200 flex flex-col items-center justify-center relative">
                <button 
                    onClick={handleClearFile} 
                    className="absolute top-2 right-2 p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                    title="Remove File"
                >
                    <X className="w-4 h-4" />
                </button>
                <div className="w-12 h-12 bg-red-100 text-red-500 rounded-lg flex items-center justify-center mb-3">
                    <FileType className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-slate-800">{binaryFile.name}</h4>
                <p className="text-xs text-slate-500 mt-1">{(binaryFile.size / 1024).toFixed(1)} KB • PDF Document</p>
                <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
                    <CheckSquare className="w-3 h-3" /> Ready for AI Analysis
                </p>
            </div>
        ) : (
            <textarea
                className="w-full h-40 p-4 font-mono text-sm bg-slate-50 text-slate-800 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none resize-y"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste regulatory text here or upload a file..."
            />
        )}
        
        {/* Visual Pipeline Indicator */}
        <div className="mt-8 mb-4 flex items-center justify-between px-4 md:px-12">
            <PipelineStep title="Ingest" icon={<FileText className="w-5 h-5"/>} color="bg-slate-500" />
            <PipelineConnector />
            <PipelineStep title="Split & Chunk" icon={<Layers className="w-5 h-5"/>} color="bg-blue-500" />
            <PipelineConnector />
            <PipelineStep title="Normalize" icon={<CheckSquare className="w-5 h-5"/>} color="bg-indigo-500" />
            <PipelineConnector />
            <PipelineStep title="Interpret" icon={<Cpu className="w-5 h-5"/>} color="bg-emerald-500" />
        </div>

        <div className="mt-6 flex justify-center">
            <button
                onClick={handleParse}
                disabled={isLoading || (!inputText && !binaryFile)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg flex items-center gap-2 disabled:opacity-50 transition-all transform hover:scale-105"
            >
                {isLoading ? <Loader2 className="animate-spin" /> : <Database />}
                Run Ingestion & Interpretation Model
            </button>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <FileJson className="w-6 h-6 text-emerald-600" />
                    Interpretation Model Output: {result.documentTitle}
                </h3>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                    {result.segments.length} Semantic Segments
                </span>
            </div>
            
            <div className="grid gap-6">
                {result.segments.map((segment) => (
                    <SegmentDisplay key={segment.id} segment={segment} />
                ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default RegulationParser;