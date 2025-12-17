import { GoogleGenAI, Type } from "@google/genai";
import { BOMItem, BOMDiscrepancy, RegulatoryImpact, ChangeRequestDraft, RegulationPipelineResult, PLMDataArtifact, ProcessedSegment, ComplianceAuditResult, CertificationReport, CCBAnalysisResult, EngineeringOrder } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- BOM Reconciliation ---

export const reconcileBOMs = async (
  asDesigned: BOMItem[],
  asBuilt: BOMItem[]
): Promise<BOMDiscrepancy[]> => {
  const model = "gemini-2.5-flash";
  const prompt = `
    Compare the following two Bill of Materials (BOM) for an aircraft assembly.
    1. Engineering BOM (As-Designed)
    2. Manufacturing Log (As-Built)

    Identify discrepancies such as version mismatches, missing parts, or unauthorized substitutions.
    Classify severity based on airworthiness risk.

    As-Designed: ${JSON.stringify(asDesigned)}
    As-Built: ${JSON.stringify(asBuilt)}
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            partNumber: { type: Type.STRING },
            issueType: { type: Type.STRING, enum: ['MISSING_PART', 'VERSION_MISMATCH', 'EXTRA_PART', 'QUANTITY_MISMATCH'] },
            severity: { type: Type.STRING, enum: ['CRITICAL', 'MAJOR', 'MINOR'] },
            description: { type: Type.STRING },
            recommendation: { type: Type.STRING },
          },
          required: ['partNumber', 'issueType', 'severity', 'description', 'recommendation'],
        },
      },
    },
  });

  if (response.text) {
    return JSON.parse(response.text) as BOMDiscrepancy[];
  }
  return [];
};

// --- Regulatory Monitoring ---

export const analyzeRegulatoryImpact = async (
  directiveText: string,
  fleetInventory: any[]
): Promise<RegulatoryImpact[]> => {
  const model = "gemini-2.5-flash";
  const prompt = `
    Analyze the following Airworthiness Directive (AD) or Service Bulletin (SB) text.
    Cross-reference it with the provided Fleet Inventory to identify which aircraft are affected.
    
    Tasks:
    1. Determine applicability to tail numbers based on Model, Engine, or installed Components.
    2. Classify Priority: 
       - URGENT if it's an Airworthiness Directive (AD) with immediate/short deadlines or safety of flight risks.
       - INFORMATIONAL if it's a Service Bulletin (SB) or optional.
       - ADMINISTRATIVE for paperwork only.
    3. Extract action and deadline.

    Directive Text: "${directiveText}"

    Fleet Inventory: ${JSON.stringify(fleetInventory)}
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            affectedTailNumber: { type: Type.STRING },
            component: { type: Type.STRING },
            requiredAction: { type: Type.STRING },
            deadline: { type: Type.STRING },
            complianceStatus: { type: Type.STRING, enum: ['COMPLIANT', 'NON_COMPLIANT', 'PENDING_INSPECTION'] },
            priority: { type: Type.STRING, enum: ['URGENT', 'INFORMATIONAL', 'ADMINISTRATIVE'] }
          },
          required: ['affectedTailNumber', 'component', 'requiredAction', 'deadline', 'complianceStatus', 'priority'],
        },
      },
    },
  });

  if (response.text) {
    return JSON.parse(response.text) as RegulatoryImpact[];
  }
  return [];
};

export const generateEngineeringOrder = async (
  impact: RegulatoryImpact,
  directiveText: string
): Promise<EngineeringOrder> => {
    const model = "gemini-2.5-flash";
    const prompt = `
        Draft an Engineering Order (EO) to address the following regulatory impact.
        
        Regulatory Requirement: "${directiveText.substring(0, 1000)}..."
        Target Aircraft: ${impact.affectedTailNumber} (Component: ${impact.component})
        Required Action: ${impact.requiredAction}

        The EO should be formal, actionable, and include specific instructions for mechanics.
    `;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    eoNumber: { type: Type.STRING },
                    relatedAD: { type: Type.STRING },
                    title: { type: Type.STRING },
                    complianceDeadline: { type: Type.STRING },
                    applicability: { type: Type.STRING },
                    instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
                    partsRequired: { type: Type.ARRAY, items: { type: Type.STRING } },
                    manHours: { type: Type.NUMBER },
                },
                required: ['eoNumber', 'relatedAD', 'title', 'complianceDeadline', 'applicability', 'instructions', 'partsRequired', 'manHours']
            }
        }
    });

    if (response.text) {
        return JSON.parse(response.text) as EngineeringOrder;
    }
    throw new Error("Failed to generate EO");
}

// --- CCB Assistant (Legacy) ---

export const generateChangeRequest = async (
  proposedChange: string,
  systemContext: string
): Promise<ChangeRequestDraft> => {
    // Legacy function support
  const model = "gemini-2.5-flash"; 
  const prompt = `
    You are an Intelligent Change Control Board (CCB) Assistant.
    An engineer is proposing the following change: "${proposedChange}".
    Context of the aircraft system: "${systemContext}".

    1. Perform a predictive impact analysis. Identify "ripple effects" on other systems.
    2. Draft a formal Change Request (CR) / Engineering Order (EO).
    3. Suggest compliance checks (FAA/EASA).
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          justification: { type: Type.STRING },
          impactAnalysis: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                affectedSystem: { type: Type.STRING },
                impactDescription: { type: Type.STRING },
                riskLevel: { type: Type.STRING, enum: ['HIGH', 'MEDIUM', 'LOW'] },
                recalibrationRequired: { type: Type.BOOLEAN },
              },
              required: ['affectedSystem', 'impactDescription', 'riskLevel', 'recalibrationRequired'],
            },
          },
          regulatoryComplianceNotes: { type: Type.STRING },
        },
        required: ['title', 'description', 'justification', 'impactAnalysis', 'regulatoryComplianceNotes'],
      },
    },
  });

  if (response.text) {
    return JSON.parse(response.text) as ChangeRequestDraft;
  }
  throw new Error("Failed to generate Change Request");
};

// --- CCB Assistant (Deep Ripple Analysis) ---

export const analyzeCCBRippleEffect = async (
  changeDescription: string,
  ebomContext: string,
  historicalContext: string
): Promise<CCBAnalysisResult> => {
    const model = "gemini-2.5-flash";
    
    // This prompt simulates the graph traversal logic requested.
    const prompt = `
        You are an Advanced Aviation Engineering AI Assistant specializing in Change Management.
        Your goal is to construct a "Dependency Map" and perform a "Ripple Effect Analysis" for a proposed Engineering Change Request (CR).
        
        INPUTS:
        1. Proposed Change: "${changeDescription}"
        2. Engineering BOM (Digital Thread Context): ${ebomContext.substring(0, 5000)}
        3. Historical Change Data (Memory): ${historicalContext.substring(0, 2000)}

        TASKS:
        1. Parse the change and identify the "Origin Node" (the part being changed).
        2. TIER 1 (Physical): Identify parents/children from the BOM and spatial neighbors (simulate using common aircraft knowledge if 3D data isn't explicit).
        3. TIER 2 (Functional): Identify systems that rely on this part (e.g., if it's a sensor, what computer reads it?). Infer from context.
        4. TIER 3 (Regulatory): Check if this touches Critical-to-Safety items (DO-178C, ARP4754A).
        5. TIER 4 (Logistical): Check inventory/supply chain implications.

        OUTPUT STRUCTURE (JSON):
        - nodes: Array of objects { id, label, type, layer }. Layer 1=Origin, 2=Physical, 3=Functional, 4=Reg/Logistic.
        - edges: Array of objects { from, to, label, type }.
        - summary: High level text summary.
        - tiers: Detailed lists for each impact tier.
    `;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    nodes: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                label: { type: Type.STRING },
                                type: { type: Type.STRING, enum: ['PART', 'SYSTEM', 'DOCUMENT', 'REGULATION', 'TOOL', 'RISK'] },
                                layer: { type: Type.INTEGER, description: "1=Origin, 2=Direct, 3=Functional, 4=Regulatory/Logistical" }
                            },
                            required: ['id', 'label', 'type', 'layer']
                        }
                    },
                    edges: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                from: { type: Type.STRING },
                                to: { type: Type.STRING },
                                label: { type: Type.STRING },
                                type: { type: Type.STRING, enum: ['PHYSICAL', 'FUNCTIONAL', 'REGULATORY'] }
                            },
                            required: ['from', 'to', 'label', 'type']
                        }
                    },
                    summary: {
                        type: Type.OBJECT,
                        properties: {
                            primaryImpact: { type: Type.STRING },
                            rippleDetected: { type: Type.STRING },
                            riskSummary: { type: Type.STRING },
                            physicalConflict: { type: Type.STRING },
                            recommendation: { type: Type.STRING }
                        },
                        required: ['primaryImpact', 'rippleDetected', 'riskSummary', 'physicalConflict', 'recommendation']
                    },
                    tiers: {
                        type: Type.OBJECT,
                        properties: {
                            physical: { type: Type.ARRAY, items: { type: Type.STRING } },
                            functional: { type: Type.ARRAY, items: { type: Type.STRING } },
                            regulatory: { type: Type.ARRAY, items: { type: Type.STRING } },
                            logistical: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ['physical', 'functional', 'regulatory', 'logistical']
                    }
                },
                required: ['nodes', 'edges', 'summary', 'tiers']
            }
        }
    });

    if (response.text) {
        return JSON.parse(response.text) as CCBAnalysisResult;
    }
    throw new Error("Failed to generate Ripple Analysis");
}

// --- Virtual Auditor (Chat) ---

export const auditorChat = async (history: { role: string; parts: { text: string }[] }[], newMessage: string) => {
    const aiChat = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const chat = aiChat.chats.create({
        model: 'gemini-2.5-flash',
        history: history,
        config: {
            systemInstruction: "You are a Virtual Aviation Auditor (AS9100 / FAA expert). Your goal is to help preparing for audits, check for cleanliness in documentation, and cite specific regulations. Be professional, strict, yet helpful."
        }
    });

    const result = await chat.sendMessage({ message: newMessage });
    return result.text;
}

// --- Regulatory Ingestion & Interpretation Pipeline ---

export const parseRegulationDocument = async (input: string | { data: string, mimeType: string }): Promise<RegulationPipelineResult> => {
  const model = "gemini-2.5-flash";
  
  const systemPrompt = `
    You are a Domain-Specialized Regulatory Interpretation Model for Aviation (DO-178C, DO-254, ARP4754A, CS-25).
    Your task is to ingest the provided regulatory document (text or file) and process it through the following pipeline:

    PIPELINE STEPS:
    1. SPLITTING: Break the document into logical segments (Part -> Subpart -> Section -> Clause).
    2. NORMALIZATION: 
       - Map "shall", "must", "required to" -> "COMPLIANCE_OBLIGATION"
       - Map "should", "recommended" -> "GUIDANCE"
       - Map others -> "OBSERVATION"
    3. METADATA TAGGING: Assign regulation source, clause number, DAL applicability (A/B/C/D/E), Lifecycle area, and Category.
    4. INTERPRETATION & EXTRACTION:
       - Translate the semantic meaning into an "Object of Compliance" (what is being regulated), "Requirement" (what it must do), and "Evidence Required" (artifacts).
       - Identify failure conditions if applicable.
  `;

  const requestParts: any[] = [{ text: systemPrompt }];

  if (typeof input === 'string') {
      requestParts.push({ text: `INPUT TEXT:\n${input.substring(0, 30000)}` });
  } else {
      requestParts.push({ inlineData: { mimeType: input.mimeType, data: input.data } });
      requestParts.push({ text: "Process the attached regulatory document file." });
  }

  const response = await ai.models.generateContent({
    model,
    contents: { parts: requestParts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          documentTitle: { type: Type.STRING },
          segments: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: "Clause Number e.g. 6.3.1" },
                original_text: { type: Type.STRING },
                semantic_summary: { type: Type.STRING, description: "Semantic chunk summary of context" },
                normalization: { type: Type.STRING, enum: ['COMPLIANCE_OBLIGATION', 'GUIDANCE', 'OBSERVATION'] },
                metadata: {
                  type: Type.OBJECT,
                  properties: {
                    source_document: { type: Type.STRING },
                    clause_number: { type: Type.STRING },
                    dal_applicability: { type: Type.ARRAY, items: { type: Type.STRING } },
                    lifecycle_area: { type: Type.STRING },
                    category: { type: Type.STRING },
                  },
                  required: ['source_document', 'dal_applicability', 'lifecycle_area'],
                },
                structured_rule: {
                  type: Type.OBJECT,
                  properties: {
                    rule_type: { type: Type.STRING },
                    object_of_compliance: { type: Type.STRING },
                    requirement: { type: Type.STRING },
                    evidence_required: { type: Type.ARRAY, items: { type: Type.STRING } },
                    failure_condition: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ['object_of_compliance', 'requirement', 'evidence_required'],
                },
              },
              required: ['id', 'original_text', 'normalization', 'metadata', 'structured_rule'],
            },
          },
        },
        required: ['documentTitle', 'segments'],
      },
    },
  });

  if (response.text) {
    return JSON.parse(response.text) as RegulationPipelineResult;
  }
  throw new Error("Failed to process regulation pipeline");
};

// --- Compliance Engine Services ---

export const extractRequirementsFromDocument = async (input: string | { data: string, mimeType: string }): Promise<PLMDataArtifact[]> => {
  const model = "gemini-2.5-flash";
  const systemPrompt = `
    You are a Requirements Extraction Specialist for Aviation Systems.
    Analyze the provided document (Requirements Spec, Design Doc, or Test Plan) and extract structured artifacts.
    
    For each item found:
    1. Identify the ID (e.g., REQ-001, SRS-5.1, TST-102). If none is explicit, generate a relevant one based on context.
    2. Classify Type: REQUIREMENT, TEST_CASE, TEST_RESULT, DESIGN_DOC, or CODE_FILE.
    3. Extract the text content/description.
    4. Status: 'APPROVED', 'DRAFT', or 'OBSOLETE' (default to DRAFT if unknown).
    5. TraceLinks: Extract any IDs referenced in the text (e.g., "Verifies REQ-001").
    
    Return a JSON array of these artifacts.
  `;

  const requestParts: any[] = [{ text: systemPrompt }];

  if (typeof input === 'string') {
      requestParts.push({ text: `DOCUMENT CONTENT:\n${input.substring(0, 30000)}` });
  } else {
      requestParts.push({ inlineData: { mimeType: input.mimeType, data: input.data } });
      requestParts.push({ text: "Process the attached requirements document." });
  }

  const response = await ai.models.generateContent({
    model,
    contents: { parts: requestParts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['REQUIREMENT', 'TEST_CASE', 'TEST_RESULT', 'DESIGN_DOC', 'CODE_FILE'] },
            name: { type: Type.STRING },
            status: { type: Type.STRING, enum: ['DRAFT', 'APPROVED', 'OBSOLETE'] },
            contentSnippet: { type: Type.STRING },
            traceLinks: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['id', 'type', 'name', 'status', 'contentSnippet']
        }
      }
    }
  });

  if (response.text) {
    return JSON.parse(response.text) as PLMDataArtifact[];
  }
  return [];
};

export const evaluateCompliance = async (
  regulationSegments: ProcessedSegment[],
  plmData: PLMDataArtifact[]
): Promise<ComplianceAuditResult> => {
  const model = "gemini-2.5-flash";
  
  const prompt = `
    You are an AI Compliance Auditor.
    
    Task: Perform a Gap Analysis and Compliance Check.
    
    1. Input 1 (Regulation Model): A list of regulatory segments defining what is required.
    2. Input 2 (Data Artifacts): A list of project artifacts (Requirements, Tests, Design Docs).
    
    Rules:
    - Check if "Evidence Required" in the regulation exists in the Artifacts.
    - Check if traceability links exist (e.g., does the Requirement link to a Test Case?).
    - Determine a compliance score (0-100).
    - Identify missing items (Gap Analysis).
    - Construct a traceability matrix mapping Regulation IDs to Found Artifact IDs.
    
    Regulation Model: ${JSON.stringify(regulationSegments.map(s => ({ id: s.id, requirement: s.structured_rule.requirement, evidence_needed: s.structured_rule.evidence_required })))}
    
    Data Artifacts: ${JSON.stringify(plmData)}
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallScore: { type: Type.NUMBER },
          riskLevel: { type: Type.STRING, enum: ['LOW', 'MODERATE', 'HIGH'] },
          evaluatedCount: { type: Type.NUMBER },
          passCount: { type: Type.NUMBER },
          gapAnalysis: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                regulationClauseId: { type: Type.STRING },
                severity: { type: Type.STRING, enum: ['HIGH', 'MEDIUM', 'LOW'] },
                issue: { type: Type.STRING },
                missingArtifactType: { type: Type.STRING },
                recommendation: { type: Type.STRING },
              },
              required: ['regulationClauseId', 'severity', 'issue', 'missingArtifactType', 'recommendation']
            },
          },
          traceabilityMatrix: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    regId: { type: Type.STRING },
                    artifacts: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            }
          }
        },
        required: ['overallScore', 'riskLevel', 'gapAnalysis', 'traceabilityMatrix']
      },
    },
  });

  if (response.text) {
    return JSON.parse(response.text) as ComplianceAuditResult;
  }
  throw new Error("Compliance analysis failed");
};

export const generateCertificationReport = async (
  auditResult: ComplianceAuditResult,
  docTitle: string
): Promise<CertificationReport> => {
  const model = "gemini-2.5-flash";
  const prompt = `
    Generate a Formal Certification Report based on the provided Compliance Audit Result.
    Document Title: ${docTitle}
    Audit Data: ${JSON.stringify(auditResult)}
    
    Format the output as Markdown text within the JSON fields.
    The tone should be formal, suitable for submission to FAA/EASA.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          generatedDate: { type: Type.STRING },
          executiveSummary: { type: Type.STRING },
          complianceTable: { type: Type.STRING },
          gapAnalysisSection: { type: Type.STRING },
          conclusion: { type: Type.STRING },
        },
        required: ['title', 'executiveSummary', 'complianceTable', 'gapAnalysisSection', 'conclusion']
      },
    },
  });

   if (response.text) {
    return JSON.parse(response.text) as CertificationReport;
  }
  throw new Error("Report generation failed");
}