
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
  id: string;
  title: string;
  description: string;
  status: 'TRIAGE' | 'CCB_REVIEW' | 'APPROVED' | 'IMPLEMENTATION' | 'CLOSED';
  submittedAt: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'PART' | 'SYSTEM' | 'DOCUMENT' | 'REGULATION' | 'TOOL' | 'RISK';
  layer: number; 
  description?: string;
  properties?: Record<string, string>;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  type: 'PHYSICAL' | 'FUNCTIONAL' | 'REGULATORY';
  description?: string;
}

export interface Stakeholder {
  role: string;
  reason: string;
  priority: 'REQUIRED' | 'CONSULTED' | 'INFORMED';
}

export interface ChangeConflict {
  crId: string;
  overlapSystem: string;
  conflictDescription: string;
}

export interface ChangeManagerResult {
  technical: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    tiers: {
      physical: string[];
      functional: string[];
      regulatory: string[];
      logistical: string[];
    };
  };
  management: {
    riskScore: number; 
    triageTrack: 'FAST_TRACK' | 'MANUAL_REVIEW';
    stakeholders: Stakeholder[];
    conflicts: ChangeConflict[];
    estimatedManHours: number;
    technicalJustification: string;
    preMeetingBriefing: string;
    recommendation: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface ProcessedSegment {
  id: string;
  original_text: string;
  semantic_summary: string;
  normalization: 'COMPLIANCE_OBLIGATION' | 'GUIDANCE' | 'OBSERVATION';
  metadata: {
    source_document: string;
    clause_number: string;
    dal_applicability: string[];
    lifecycle_area: string;
    category: string;
  };
  structured_rule: {
    rule_type: string;
    object_of_compliance: string;
    requirement: string;
    evidence_required: string[];
    failure_condition?: string[];
  };
}

export interface RegulationPipelineResult {
  documentTitle: string;
  segments: ProcessedSegment[];
}

export interface PLMDataArtifact {
  id: string;
  type: 'REQUIREMENT' | 'TEST_CASE' | 'TEST_RESULT' | 'DESIGN_DOC' | 'CODE_FILE';
  name: string;
  status: 'DRAFT' | 'APPROVED' | 'OBSOLETE';
  contentSnippet: string;
  traceLinks: string[];
}

export interface ComplianceAuditResult {
  overallScore: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
  evaluatedCount: number;
  passCount: number;
  gapAnalysis: {
    regulationClauseId: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    issue: string;
    missingArtifactType: string;
    recommendation: string;
  }[];
  traceabilityMatrix: { regId: string; artifacts: string[] }[];
}

export interface CertificationReport {
  title: string;
  generatedDate: string;
  executiveSummary: string;
  complianceTable: string;
  gapAnalysisSection: string;
  conclusion: string;
}
