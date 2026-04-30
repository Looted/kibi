import * as crypto from "node:crypto";

export interface IdleBriefEnvelope {
  schemaVersion: "1.0";
  briefId: string;
  type: "success" | "warning";
  sessionId: string;
  branch: string;
  createdAt: string;
  unread: boolean;
  auditCursor: {
    lastTimestamp: string;
    lastOperation: string;
    entryCount: number;
    fileSize: number;
  };
  summary: string;
  counts: {
    requirementsAdded: number;
    relationshipsAdded: number;
    entitiesDeleted: number;
  };
  validation: {
    violations: Array<{
      rule: string;
      entityId: string;
      description: string;
      suggestion?: string;
      source?: string;
    }>;
    count: number;
    diagnostics: Array<{
      category: string;
      severity: string;
      message: string;
      file?: string;
      suggestion?: string;
    }>;
  };
  briefing: {
    tldr: string;
    promptBlock: string;
    citations: Array<{
      id: string;
      type?: string;
      title?: string;
      source?: string;
      textRef?: string;
    }>;
    constraints?: Array<{
      statement: string;
      citationIds: string[];
    }>;
    regressionRisks?: Array<{
      statement: string;
      citationIds: string[];
    }>;
    missingEvidence?: Array<{
      statement: string;
      citationIds: string[];
    }>;
  };
  contentHash: string;
}

export function createBriefId(): string { // implements REQ-opencode-kibi-briefing-v4
  return `brief-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function computeContentHash(payload: object): string { // implements REQ-opencode-kibi-briefing-v4
  const env = payload as IdleBriefEnvelope;

  // Normalize string: trim and collapse internal whitespace
  const norm = (s: string): string => s.trim().replace(/\s+/g, " ");

  // Build canonical visible-content projection (ignoring volatile fields)
  const projection = {
    type: env.type,
    summary: norm(env.summary),
    counts: env.counts,
    briefing: {
      tldr: norm(env.briefing.tldr),
      normalizedPromptBlock: norm(env.briefing.promptBlock),
      citations: (env.briefing.citations ?? []).map((c) => ({
        id: c.id,
        title: c.title ?? "",
      })),
      constraints: (env.briefing.constraints ?? []).map((c) => ({
        statement: norm(c.statement),
        citationIds: c.citationIds,
      })),
      regressionRisks: (env.briefing.regressionRisks ?? []).map((r) => ({
        statement: norm(r.statement),
        citationIds: r.citationIds,
      })),
      missingEvidence: (env.briefing.missingEvidence ?? []).map((m) => ({
        statement: norm(m.statement),
        citationIds: m.citationIds,
      })),
    },
    validation: {
      count: env.validation.count,
      violations: env.validation.violations.map((v) => ({
        rule: v.rule,
        entityId: v.entityId,
        description: norm(v.description),
      })),
    },
  };

  return crypto
    .createHash("sha256")
    .update(JSON.stringify(projection))
    .digest("hex");
}
