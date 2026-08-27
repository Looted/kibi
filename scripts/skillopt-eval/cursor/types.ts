import { createHash } from "node:crypto";
import type { CanonicalSkill } from "../catalog";

export type CursorVariant = "baseline" | "one-shot" | "skillopt";

export type CursorQualificationCheck = Readonly<{
  name: "version" | "authenticated" | "models" | "kibi-mcp-ready";
  status: "pass" | "no-go";
  detail: string;
}>;

export type CursorQualificationReceipt = Readonly<{
  schemaVersion: "1.0.0";
  artifactType: "skillopt-cursor-qualification";
  verdict: "pass" | "no-go";
  cursorVersion: string | null;
  reasons: readonly string[];
  checks: readonly CursorQualificationCheck[];
  paidModelCalls: 0;
}>;

export type CursorCellOutcome = Readonly<{
  outcome: "pass" | "fail" | "ambiguous";
  score: number;
  hard: 0 | 1;
  criticalFailures: readonly string[];
  terminalCategory: string | null;
}>;

export type CursorCellReceipt = Readonly<{
  schemaVersion: "1.0.0";
  artifactType: "skillopt-cursor-cell";
  host: "cursor-agent";
  hostVersion: string;
  episodeId: string;
  runId: string;
  variant: CursorVariant;
  skill: CanonicalSkill | "bundle";
  taskId: string;
  candidateBodyHash: string;
  startedAt: string;
  finishedAt: string;
  exitCode: number | null;
  termination: "exit" | "timeout" | "interrupted";
  result: CursorCellOutcome;
  evidenceHashes: Readonly<{
    brokerTrace: string;
    diagnosticReceipt: string;
    finalState: string;
    transcript: string;
  }>;
}>;

export type CursorVariantSummary = Readonly<{
  variant: CursorVariant;
  cells: number;
  hardPasses: number;
  meanScore: number;
  securityFailures: number;
}>;

export type CursorCompatibilityReport = Readonly<{
  schemaVersion: "1.1.0";
  artifactType: "skillopt-cursor-compat";
  runId: string;
  skill: CanonicalSkill | "bundle";
  phase: "development" | "held-out";
  cursorVersion: string;
  qualificationVerdict: "pass" | "no-go";
  variants: readonly CursorVariantSummary[];
  cells: readonly Readonly<{
    taskId: string;
    variant: CursorVariant;
    outcome: string;
    score: number;
    criticalFailures: readonly string[];
  }>[];
  verdict: "compatible" | "incompatible" | "informational" | "not-qualified";
  reasons: readonly string[];
  productionAdoption: "external-verdict-required";
}>;

export class CursorQualificationError extends Error {
  readonly name = "CursorQualificationError";
}

export function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
