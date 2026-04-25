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
  };
  contentHash: string;
}

export function createBriefId(): string { // implements REQ-opencode-kibi-briefing-v3
  return `brief-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function computeContentHash(payload: object): string { // implements REQ-opencode-kibi-briefing-v3
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
