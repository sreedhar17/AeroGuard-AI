
import React, { useState, useRef } from 'react';
import { reconcileBOMs } from '../services/geminiService';
import { BOMItem, BOMDiscrepancy } from '../types';
import { ArrowRight, AlertCircle, CheckCircle, Loader2, Upload, FileSpreadsheet } from 'lucide-react';

const SAMPLE_DESIGN_BOM: BOMItem[] = [
  { partNumber: "32-10-00-501", description: "Main Landing Gear Strut", revision: "C", quantity: 1 },
  { partNumber: "27-40-10-112", description: "Horizontal Stab Actuator", revision: "B", quantity: 2 },
  { partNumber: "34-10-05-990", description: "Air Data Probe", revision: "A", quantity: 3 }
];

const SAMPLE_BUILT_BOM: BOMItem[] = [
  { partNumber: "32-10-00-501", description: "Main Landing Gear Strut", revision: "C", quantity: 1 },
  { partNumber: "27-40-10-112", description: "Horizontal Stab Actuator", revision: "A", quantity: 2 }, // Discrepancy: Rev A vs B
  { partNumber: "34-10-05-992", description: "Air Data Probe (Updated)", revision: "A", quantity: 3 } // Discrepancy: Different PN
];

const BOMReconciliation: React.FC = () => {
  const [designBOMStr, setDesignBOMStr] = useState(JSON.stringify(SAMPLE_DESIGN_BOM, null, 2));
  const [builtBOMStr, setBuiltBOMStr] = useState(JSON.stringify(SAMPLE_BUILT_BOM, null, 2));
  const [discrepancies, setDiscrepancies] = useState<BOMDiscrepancy[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const designFileInputRef = useRef<HTMLInputElement>(null);
  const builtFileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (csvText: string): BOMItem[] => {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    // Normalize headers to identify columns
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]+/g, ''));
    
    // Map headers to keys
    const getKey = (header: string) => {
        if (header.includes('part') && header.includes('number')) return 'partNumber';
        if (header.includes('desc')) return 'description';
        if (header.includes('rev')) return 'revision';
        if (header.includes('qty') || header.includes('quantity')) return 'quantity';
        if (header.includes('serial')) return 'serialNumber';
        return null;
    };

    const columnMap = headers.map(getKey);
    const items: BOMItem[] = [];

    // Simple robust line parser handling quotes
    const parseLine = (line: string) => {
        const res = [];
        let current = '';
        let inQuotes = false;
        for(let char of line) {
            if (char === '"') { inQuotes = !inQuotes; continue; }
            if (char === ',' && !inQuotes) { res.push(current.trim()); current = ''; }
            else { current += char; }
        }
        res.push(current.trim());
        return res;
    };

    for (let i = 1; i < lines.length; i++) {
        const values = parseLine(lines[i]);
        const item: any = {};
        let hasData = false;
        
        columnMap.forEach((key, index) => {
            if (key && values[index]) {
                if (key === 'quantity') {
                    item[key] = parseInt(values[index]) || 1;
                } else {
                    item[key] = values[index];
                }
                hasData = true;
            }
        });

        // Ensure mandatory partNumber exists
        if (hasData && item.partNumber) {
            // Fill defaults
            if (!item.quantity) item.quantity = 1;
            if (!item.description) item.description = "Imported Item";
            if (!item.revision) item.revision = "-";
            items.push(item as BOMItem);
        }
    }
    return items;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'design' | 'built') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const items = parseCSV(text);
        if (items.length === 0) {
            alert("No valid BOM items found in CSV. Please ensure headers include 'Part Number'.");
            return;
        }
        const jsonStr = JSON.stringify(items, null, 2);
        if (target === 'design') {
          setDesignBOMStr(jsonStr);
        } else {
          setBuiltBOMStr(jsonStr);
        }
      } catch (err) {
        alert("Failed to parse CSV file.");
      }
    };
    reader.readAsText(file);
    // Reset value to allow re-uploading same file
    e.target.value = '';
  };

  const handleAnalyze = async () => {
    setIsLoading(true);
    setDiscrepancies(null);
    try {
      const design = JSON.parse(designBOMStr);
      const built = JSON.parse(builtBOMStr);
      const result = await reconcileBOMs(design, built);
      setDiscrepancies(result);
    } catch (e) {
      alert("Invalid JSON format or API Error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-slate-900">BOM Reconciliation</h2>
        <p className="text-slate-500 mt-2">Smart "As-Designed vs. As-Built" Analysis</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* As Designed Input */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold text-slate-700">Engineering BOM (As-Designed)</label>
            <div className="flex gap-2">
                <input 
                    type="file" 
                    ref={designFileInputRef} 
                    onChange={(e) => handleFileUpload(e, 'design')} 
                    accept=".csv" 
                    className="hidden" 
                />
                <button 
                    onClick={() => designFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                >
                    <Upload className="w-3.5 h-3.5" />
                    Upload CSV
                </button>
            </div>
          </div>
          <textarea
            className="h-64 p-4 font-mono text-xs bg-white text-slate-900 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-inner"
            value={designBOMStr}
            onChange={(e) => setDesignBOMStr(e.target.value)}
            placeholder='[ { "partNumber": "..." } ]'
          />
        </div>

        {/* As Built Input */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold text-slate-700">Maintenance Log (As-Built)</label>
            <div className="flex gap-2">
                <input 
                    type="file" 
                    ref={builtFileInputRef} 
                    onChange={(e) => handleFileUpload(e, 'built')} 
                    accept=".csv" 
                    className="hidden" 
                />
                <button 
                    onClick={() => builtFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Upload CSV
                </button>
            </div>
          </div>
          <textarea
            className="h-64 p-4 font-mono text-xs bg-white text-slate-900 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-inner"
            value={builtBOMStr}
            onChange={(e) => setBuiltBOMStr(e.target.value)}
            placeholder='[ { "partNumber": "..." } ]'
          />
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleAnalyze}
          disabled={isLoading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold shadow-lg transition-all disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
          Run AI Comparison
        </button>
      </div>

      {discrepancies && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800">Analysis Results</h3>
            <span className="text-xs font-mono bg-slate-200 text-slate-600 px-2 py-1 rounded">
              {discrepancies.length} Discrepancies Found
            </span>
          </div>
          
          {discrepancies.length === 0 ? (
             <div className="p-12 flex flex-col items-center justify-center text-center">
                <CheckCircle className="w-16 h-16 text-emerald-500 mb-4" />
                <h3 className="text-xl font-bold text-slate-800">Perfect Match</h3>
                <p className="text-slate-500">The physical configuration matches the engineering design.</p>
             </div>
          ) : (
            <div className="divide-y divide-slate-100">
                {discrepancies.map((item, idx) => (
                <div key={idx} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                        <div className={`mt-1 p-2 rounded-lg ${
                            item.severity === 'CRITICAL' ? 'bg-red-100 text-red-600' : 
                            item.severity === 'MAJOR' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                        <h4 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            {item.partNumber}
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${
                                item.severity === 'CRITICAL' ? 'border-red-200 bg-red-50 text-red-700' : 
                                item.severity === 'MAJOR' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-blue-200 bg-blue-50 text-blue-700'
                            }`}>
                                {item.issueType}
                            </span>
                        </h4>
                        <p className="text-slate-600 mt-1">{item.description}</p>
                        <div className="mt-3 text-sm bg-slate-100 p-3 rounded text-slate-700 border-l-4 border-slate-400">
                            <span className="font-bold block text-xs text-slate-500 mb-1 uppercase tracking-wider">AI Recommendation</span>
                            {item.recommendation}
                        </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                            item.severity === 'CRITICAL' ? 'bg-red-600 text-white' : 
                            item.severity === 'MAJOR' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
                        }`}>
                        {item.severity} SEVERITY
                        </span>
                    </div>
                    </div>
                </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BOMReconciliation;
