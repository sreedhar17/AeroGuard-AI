export enum AppView {
  DASHBOARD = 'DASHBOARD',
  BOM_RECONCILIATION = 'BOM_RECONCILIATION',
  REGULATORY_ALERTS = 'REGULATORY_ALERTS',
  CCB_ASSISTANT = 'CCB_ASSISTANT',
  VIRTUAL_AUDITOR = 'VIRTUAL_AUDITOR',
  REGULATION_PARSER = 'REGULATION_PARSER',
  COMPLIANCE_HUB = 'COMPLIANCE_HUB',
}

export interface BOMItem {
  partNumber: string;
  description: string;
  revision: string;
  serialNumber?: string;
  quantity: number;
}

export interface BOMDiscrepancy {
  partNumber: string;
  issueType: 'MISSING_PART' | 'VERSION_MISMATCH' | 'EXTRA_PART' | 'QUANTITY_MISMATCH';
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  description: string;
  recommendation: string;
}

export interface RegulatoryImpact {
  affectedTailNumber: string;
  component: string;
  requiredAction: string;
  deadline: string;
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING_INSPECTION';
  priority: 'URGENT' | 'INFORMATIONAL' | 'ADMINISTRATIVE';
}

export interface RegulatoryFeedItem {
  id: string;
  source: 'FAA' | 'EASA';
  type: 'AD' | 'SB' | 'NPA';
  title: string;
  receivedAt: string;
  rawText: string;
  status: 'NEW' | 'ANALYZED' | 'IGNORED';
}

export interface EngineeringOrder {
  eoNumber: string;
  relatedAD: string;
  title: string;
  complianceDeadline: string;
  applicability: string;
  instructions: string[];
  partsRequired: string[];
  manHours: number;
}

export interface ChangeImpact {
  affectedSystem: string;
  impactDescription: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  recalibrationRequired: boolean;
}

export interface ChangeRequestDraft {
  title: string;
  description: string;
  justification: string;
  impactAnalysis: ChangeImpact[];
  regulatoryComplianceNotes: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

// --- Regulatory Ingestion & Interpretation Pipeline Types ---

export type RegulationNormalization = 'COMPLIANCE_OBLIGATION' | 'GUIDANCE' | 'OBSERVATION';

export interface StructuredRule {
  rule_type: string;
  object_of_compliance: string; // e.g., "installed system"
  requirement: string; // e.g., "perform intended function"
  evidence_required: string[]; // e.g., ["FHA", "SSA"]
  failure_condition?: string[]; // e.g., ["catastrophic"]
}

export interface RegulationMetadata {
  source_document: string; // e.g., DO-178C
  clause_number: string;
  dal_applicability: string[]; // e.g., ["DAL-A", "DAL-B"]
  lifecycle_area: string; // e.g., "Software Verification"
  category: string; // e.g., "Software"
}

export interface ProcessedSegment {
  id: string;
  original_text: string;
  semantic_summary: string;
  normalization: RegulationNormalization;
  metadata: RegulationMetadata;
  structured_rule: StructuredRule;
}

export interface RegulationPipelineResult {
  documentTitle: string;
  segments: ProcessedSegment[];
}

// --- Compliance Engine & PLM Integration Types ---

export interface PLMDataArtifact {
  id: string;
  type: 'REQUIREMENT' | 'TEST_CASE' | 'TEST_RESULT' | 'DESIGN_DOC' | 'CODE_FILE';
  name: string;
  status: 'DRAFT' | 'APPROVED' | 'OBSOLETE';
  contentSnippet: string;
  traceLinks: string[]; // IDs of linked items
}

export interface ComplianceGap {
  regulationClauseId: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  issue: string; // e.g., "Missing Test Coverage"
  missingArtifactType: string;
  recommendation: string;
}

export interface ComplianceAuditResult {
  overallScore: number; // 0-100
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
  evaluatedCount: number;
  passCount: number;
  gapAnalysis: ComplianceGap[];
  traceabilityMatrix: { regId: string; artifacts: string[] }[];
}

export interface CertificationReport {
  title: string;
  generatedDate: string;
  executiveSummary: string;
  complianceTable: string; // Markdown table
  gapAnalysisSection: string;
  conclusion: string;
}

// --- CCB Knowledge Graph & Ripple Analysis Types ---

export interface GraphNode {
  id: string;
  label: string;
  type: 'PART' | 'SYSTEM' | 'DOCUMENT' | 'REGULATION' | 'TOOL' | 'RISK';
  layer: number; // 1: Origin, 2: Direct, 3: Functional, 4: Reg/Logistics
}

export interface GraphEdge {
  from: string;
  to: string;
  label: string; // e.g., "Physically Connects", "Data Flow", "Regulates"
  type: 'PHYSICAL' | 'FUNCTIONAL' | 'REGULATORY';
}

export interface ImpactSummary {
  primaryImpact: string;
  rippleDetected: string;
  riskSummary: string;
  physicalConflict: string;
  recommendation: string;
}

export interface CCBAnalysisResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: ImpactSummary;
  tiers: {
    physical: string[];
    functional: string[];
    regulatory: string[];
    logistical: string[];
  };
}