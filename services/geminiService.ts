import { GoogleGenAI, Type } from "@google/genai";
import { BOMItem, BOMDiscrepancy, RegulatoryImpact, RegulationPipelineResult, PLMDataArtifact, ProcessedSegment, ComplianceAuditResult, CertificationReport, ChangeManagerResult, EngineeringOrder, ECNDetail } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to handle and parse Gemini errors
const handleGeminiError = (err: any, prefix: string): never => {
    let msg = err.message || "Unknown error";
    
    // Attempt to parse JSON error strings often returned by the SDK
    try {
        const start = msg.indexOf('{');
        if (start !== -1) {
            const parsed = JSON.parse(msg.substring(start));
            if (parsed.error?.message) msg = parsed.error.message;
        }
    } catch (e) {
        // Fallback to original message
    }

    if (msg.includes('429')) {
        throw new Error("API Quota Exceeded (429). The system is under heavy load. Please wait a few seconds.");
    }
    
    if (msg.toLowerCase().includes('leaked') || msg.includes('403')) {
        throw new Error("Security Alert: The API key has been revoked due to a leak. Please update the environment configuration with a valid key.");
    }

    throw new Error(`${prefix}: ${msg}`);
};

// --- Change Management Triage & Analysis ---

export const analyzeChangeRequest = async (
  title: string,
  description: string,
  ebomContext: string,
  parallelChanges: any[]
): Promise<ChangeManagerResult> => {
    const model = "gemini-3-flash-preview";
    
    const prompt = `
        You are an Advanced Change Management AI for Aviation. 
        Perform a focused triage and ripple analysis for this Engineering Change Request (CR).

        CR TITLE: "${title}"
        CR DESCRIPTION: "${description}"
        EBOM CONTEXT: ${ebomContext.substring(0, 2000)}
        PARALLEL CHANGES: ${JSON.stringify(parallelChanges)}

        CONSTRAINTS:
        - Technical Graph: Limit to MAX 10 nodes and MAX 12 edges.
        - Briefing: Concise executive summary (max 200 words).
        - No nesting of properties inside nodes. Use 'attributes' array only.

        OUTPUT JSON:
        - technical: { nodes: [{id, label, type, layer, description, attributes: [{key, value}]}], edges: [{id, from, to, label, type}], tiers: {physical:[], functional:[], regulatory:[], logistical:[]} }
        - management: { riskScore, triageTrack, stakeholders: [{role, reason, priority}], conflicts: [{crId, overlapSystem, conflictDescription}], estimatedManHours, technicalJustification, preMeetingBriefing, recommendation }
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 0 },
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        technical: {
                            type: Type.OBJECT,
                            properties: {
                                nodes: { 
                                    type: Type.ARRAY, 
                                    items: { 
                                        type: Type.OBJECT, 
                                        properties: { 
                                            id: {type: Type.STRING}, 
                                            label: {type: Type.STRING}, 
                                            type: {type: Type.STRING, enum: ['PART', 'SYSTEM', 'DOCUMENT', 'REGULATION', 'TOOL', 'RISK']}, 
                                            layer: {type: Type.INTEGER}, 
                                            description: {type: Type.STRING}, 
                                            attributes: {
                                                type: Type.ARRAY,
                                                items: {
                                                    type: Type.OBJECT,
                                                    properties: {
                                                        key: {type: Type.STRING},
                                                        value: {type: Type.STRING}
                                                    },
                                                    required: ['key', 'value']
                                                }
                                            }
                                        }, 
                                        required: ['id', 'label', 'type', 'layer'] 
                                    } 
                                },
                                edges: { 
                                    type: Type.ARRAY, 
                                    items: { 
                                        type: Type.OBJECT, 
                                        properties: { 
                                            id: {type: Type.STRING}, 
                                            from: {type: Type.STRING}, 
                                            to: {type: Type.STRING}, 
                                            label: {type: Type.STRING}, 
                                            type: {type: Type.STRING, enum: ['PHYSICAL', 'FUNCTIONAL', 'REGULATORY']} 
                                        }, 
                                        required: ['id', 'from', 'to', 'label', 'type'] 
                                    } 
                                },
                                tiers: { 
                                    type: Type.OBJECT, 
                                    properties: { 
                                        physical: {type: Type.ARRAY, items: {type: Type.STRING}}, 
                                        functional: {type: Type.ARRAY, items: {type: Type.STRING}}, 
                                        regulatory: {type: Type.ARRAY, items: {type: Type.STRING}}, 
                                        logistical: {type: Type.ARRAY, items: {type: Type.STRING}} 
                                    } 
                                }
                            },
                            required: ['nodes', 'edges', 'tiers']
                        },
                        management: {
                            type: Type.OBJECT,
                            properties: {
                                riskScore: { type: Type.NUMBER },
                                triageTrack: { type: Type.STRING, enum: ['FAST_TRACK', 'MANUAL_REVIEW'] },
                                stakeholders: { 
                                    type: Type.ARRAY, 
                                    items: { 
                                        type: Type.OBJECT, 
                                        properties: { 
                                            role: {type: Type.STRING}, 
                                            reason: {type: Type.STRING}, 
                                            priority: {type: Type.STRING, enum: ['REQUIRED', 'CONSULTED', 'INFORMED']} 
                                        },
                                        required: ['role', 'reason', 'priority']
                                    } 
                                },
                                conflicts: { 
                                    type: Type.ARRAY, 
                                    items: { 
                                        type: Type.OBJECT, 
                                        properties: { 
                                            crId: {type: Type.STRING}, 
                                            overlapSystem: {type: Type.STRING}, 
                                            conflictDescription: {type: Type.STRING} 
                                        } 
                                    } 
                                },
                                estimatedManHours: { type: Type.NUMBER },
                                technicalJustification: { type: Type.STRING },
                                preMeetingBriefing: { type: Type.STRING },
                                recommendation: { type: Type.STRING }
                            },
                            required: ['riskScore', 'triageTrack', 'stakeholders', 'technicalJustification', 'preMeetingBriefing']
                        }
                    },
                    required: ['technical', 'management']
                }
            }
        });

        if (response.text) {
            const parsed = JSON.parse(response.text);
            parsed.technical.nodes = parsed.technical.nodes.map((node: any) => {
                const properties: Record<string, string> = {};
                if (node.attributes) {
                    node.attributes.forEach((attr: any) => {
                        properties[attr.key] = attr.value;
                    });
                }
                const { attributes, ...rest } = node;
                return { ...rest, properties };
            });
            return parsed as ChangeManagerResult;
        }
    } catch (err: any) {
        handleGeminiError(err, "Triage Pipeline Failure");
    }
    throw new Error("Triage failed: No response text");
};

export const fetchECNDetails = async (ecnId: string): Promise<ECNDetail> => {
    const model = "gemini-3-flash-preview";
    const prompt = `Provide detailed mock implementation data for Aviation ECN: "${ecnId}". 
    Focus on the "Solution Implemented" and "Approver" fields. 
    Ensure the output is JSON format with the following fields: 
    id, title, solution, approver, approvalDate, impactedDocs (array).`;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        solution: { type: Type.STRING },
                        approver: { type: Type.STRING },
                        approvalDate: { type: Type.STRING },
                        impactedDocs: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['id', 'title', 'solution', 'approver', 'approvalDate', 'impactedDocs']
                }
            }
        });

        if (response.text) {
            return JSON.parse(response.text) as ECNDetail;
        }
    } catch (err: any) {
        handleGeminiError(err, "ECN Fetch Failure");
    }
    throw new Error("Failed to fetch ECN details");
};

export const reconcileBOMs = async (asDesigned: BOMItem[], asBuilt: BOMItem[]): Promise<BOMDiscrepancy[]> => {
  const model = "gemini-3-flash-preview";
  const prompt = `Compare As-Designed and As-Built BOMs. Identify discrepancies. As-Designed: ${JSON.stringify(asDesigned)} As-Built: ${JSON.stringify(asBuilt)}`;
  try {
    const response = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { partNumber: { type: Type.STRING }, issueType: { type: Type.STRING }, severity: { type: Type.STRING }, description: { type: Type.STRING }, recommendation: { type: Type.STRING } } } } } });
    return response.text ? JSON.parse(response.text) : [];
  } catch (err) {
    handleGeminiError(err, "BOM Reconciliation Failure");
  }
};

export const analyzeRegulatoryImpact = async (directiveText: string, fleetInventory: any[]): Promise<RegulatoryImpact[]> => {
  const model = "gemini-3-flash-preview";
  const prompt = `Analyze Airworthiness Directive Text: "${directiveText}" against Fleet: ${JSON.stringify(fleetInventory)}`;
  try {
    const response = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { affectedTailNumber: { type: Type.STRING }, component: { type: Type.STRING }, requiredAction: { type: Type.STRING }, deadline: { type: Type.STRING }, complianceStatus: { type: Type.STRING }, priority: { type: Type.STRING } } } } } });
    return response.text ? JSON.parse(response.text) : [];
  } catch (err) {
    handleGeminiError(err, "Regulatory Analysis Failure");
  }
};

export const generateEngineeringOrder = async (impact: RegulatoryImpact, directiveText: string): Promise<EngineeringOrder> => {
    const model = "gemini-3-flash-preview";
    const prompt = `Draft Engineering Order for: ${JSON.stringify(impact)}. Directive Context: ${directiveText.substring(0, 1000)}`;
    try {
        const response = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { eoNumber: { type: Type.STRING }, relatedAD: { type: Type.STRING }, title: { type: Type.STRING }, complianceDeadline: { type: Type.STRING }, applicability: { type: Type.STRING }, instructions: { type: Type.ARRAY, items: { type: Type.STRING } }, partsRequired: { type: Type.ARRAY, items: { type: Type.STRING } }, manHours: { type: Type.NUMBER } } } } });
        return response.text ? JSON.parse(response.text) : ({} as EngineeringOrder);
    } catch (err) {
        handleGeminiError(err, "EO Generation Failure");
    }
}

export const auditorChat = async (history: any[], newMessage: string): Promise<string> => {
    try {
        const aiChat = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const chat = aiChat.chats.create({ 
            model: 'gemini-3-pro-preview', 
            history: history, 
            config: { systemInstruction: "You are a Virtual Aviation Auditor. Answer concisely and professionally." } 
        });
        const result = await chat.sendMessage({ message: newMessage });
        return result.text || "The auditor is currently unable to provide a response.";
    } catch (err) {
        // We don't throw here to keep the chat active, but log it
        console.error("Auditor Chat Error:", err);
        return "I encountered a communication error. Please ensure your configuration is valid.";
    }
}

export const parseRegulationDocument = async (input: any): Promise<RegulationPipelineResult> => {
  const model = "gemini-3-flash-preview";
  const contents = typeof input === 'string' ? input : { inlineData: { mimeType: input.mimeType, data: input.data } };
  try {
    const response = await ai.models.generateContent({ model, contents: JSON.stringify(contents), config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { documentTitle: { type: Type.STRING }, segments: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: {type: Type.STRING}, original_text: {type: Type.STRING}, semantic_summary: {type: Type.STRING}, normalization: {type: Type.STRING}, metadata: {type: Type.OBJECT, properties: {source_document: {type: Type.STRING}, clause_number: {type: Type.STRING}, dal_applicability: {type: Type.ARRAY, items: {type: Type.STRING}}, lifecycle_area: {type: Type.STRING}, category: {type: Type.STRING}}}, structured_rule: {type: Type.OBJECT, properties: {rule_type: {type: Type.STRING}, object_of_compliance: {type: Type.STRING}, requirement: {type: Type.STRING}, evidence_required: {type: Type.ARRAY, items: {type: Type.STRING}}, failure_condition: {type: Type.ARRAY, items: {type: Type.STRING}}}}} } } } } } });
    return response.text ? JSON.parse(response.text) : { documentTitle: "Unknown", segments: [] };
  } catch (err) {
    handleGeminiError(err, "Regulation Pipeline Failure");
  }
};

export const semanticSearchRegulations = async (query: string, library: any[]): Promise<any[]> => {
  const model = "gemini-3-flash-preview";
  const prompt = `Find relevant segments in library for query: "${query}" in ${JSON.stringify(library.map((s:any) => ({id: s.id, summary: s.semantic_summary}))) }`;
  try {
    const response = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } } });
    const ids = response.text ? JSON.parse(response.text) : [];
    return library.filter(s => ids.includes(s.id));
  } catch (err) {
    handleGeminiError(err, "Semantic Search Failure");
  }
};

export const extractRequirementsFromDocument = async (input: any): Promise<PLMDataArtifact[]> => {
  const model = "gemini-3-flash-preview";
  try {
    const response = await ai.models.generateContent({ model, contents: JSON.stringify(input), config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: {type: Type.STRING}, type: {type: Type.STRING}, name: {type: Type.STRING}, status: {type: Type.STRING}, contentSnippet: {type: Type.STRING}, traceLinks: {type: Type.ARRAY, items: {type: Type.STRING}} } } } } });
    return response.text ? JSON.parse(response.text) : [];
  } catch (err) {
    handleGeminiError(err, "Requirement Extraction Failure");
  }
};

export const evaluateCompliance = async (regs: any[], plm: any[]): Promise<ComplianceAuditResult> => {
  const model = "gemini-3-flash-preview";
  const prompt = `Audit Check. Regs: ${JSON.stringify(regs)} vs PLM: ${JSON.stringify(plm)}`;
  try {
    const response = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { overallScore: {type: Type.NUMBER}, riskLevel: {type: Type.STRING}, gapAnalysis: {type: Type.ARRAY, items: {type: Type.OBJECT, properties: {regulationClauseId: {type: Type.STRING}, severity: {type: Type.STRING}, issue: {type: Type.STRING}, missingArtifactType: {type: Type.STRING}, recommendation: {type: Type.STRING}}}}, traceabilityMatrix: {type: Type.ARRAY, items: {type: Type.OBJECT, properties: {regId: {type: Type.STRING}, artifacts: {type: Type.ARRAY, items: {type: Type.STRING}}}}} } } } });
    return response.text ? JSON.parse(response.text) : ({} as ComplianceAuditResult);
  } catch (err) {
    handleGeminiError(err, "Audit Logic Failure");
  }
};

export const generateCertificationReport = async (audit: any, title: string): Promise<CertificationReport> => {
  const model = "gemini-3-flash-preview";
  const prompt = `Generate Cert Report for ${title}: ${JSON.stringify(audit)}`;
  try {
    const response = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { title: {type: Type.STRING}, generatedDate: {type: Type.STRING}, executiveSummary: {type: Type.STRING}, complianceTable: {type: Type.STRING}, gapAnalysisSection: {type: Type.STRING}, conclusion: {type: Type.STRING} } } } });
    return response.text ? JSON.parse(response.text) : ({} as CertificationReport);
  } catch (err) {
    handleGeminiError(err, "Report Generation Failure");
  }
}
