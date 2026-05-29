import { readFile } from "node:fs/promises";
import path from "node:path";
import type { PrologProcess } from "kibi-cli/prolog";
import {
  type SemanticClaim,
  type StrictWriteSet,
  buildStrictWriteSet,
} from "kibi-cli/public/check-types";
import { getSchemaVersionStatus } from "kibi-cli/schema-version";
import { resolveWorkspaceRoot } from "../workspace.js";

const STRICT_FALLBACK_CONFIDENCE = 0.69;
const NORMATIVE_SECTION_PATTERN = /\b(requirements?|polic(?:y|ies)|rules?)\b/i;

export interface ModelRequirementArgs {
  text: string;
  source?: string;
  sourceFiles?: string[];
  confidence?: number;
  subjectKey?: string;
  propertyKey?: string;
  operator?: SemanticClaim["operator"];
  value?: string | number | boolean;
  provenance?: string;
}

export interface ExtractedRequirementClaim {
  claim: SemanticClaim;
  extractionMode: "provided" | "heuristic" | "fallback";
  extractionWarnings: string[];
}

export interface ModelRequirementResult {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: {
    statement: string;
    source: string;
    sourceFiles: string[];
    claim: SemanticClaim;
    writeSet: StrictWriteSet;
    applyPlan: Array<Record<string, unknown>>;
    isStrict: boolean;
    confidence: number;
    extractionMode: "provided" | "heuristic" | "fallback";
    extractionWarnings: string[];
    migrationWarning: string | null;
  };
  applyPlan: Array<Record<string, unknown>>;
  writeSet: StrictWriteSet;
  migrationWarning: string | null;
}

function normalizeText(text: string): string {
  const normalized = String(text ?? "").trim();
  if (!normalized) {
    throw new Error(
      "Requirement modeling failed: text must be a non-empty string",
    );
  }
  return normalized;
}

function normalizeOptionalString(
  value: string | undefined,
): string | undefined {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeSourceFiles(sourceFiles: string[] | undefined): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const sourceFile of sourceFiles ?? []) {
    const trimmed = String(sourceFile ?? "").trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

function clampConfidence(confidence: number | undefined): number {
  const numeric =
    typeof confidence === "number" && Number.isFinite(confidence)
      ? confidence
      : 0.8;
  return Math.round(Math.min(1, Math.max(0, numeric)) * 100) / 100;
}

function normalizeClaimValue(value: unknown): string | number | boolean {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new Error(
        "Requirement modeling failed: value must be a finite number",
      );
    }
    return value;
  }

  throw new Error(
    "Requirement modeling failed: value must be a string, number, or boolean",
  );
}

function stripListPrefix(value: string): string {
  return value
    .replace(/^\s*[-*+]\s+/, "")
    .replace(/^\s*\d+[.)]\s+/, "")
    .trim();
}

function trimSentenceTail(value: string): string {
  return value.replace(/[\s.?!:;]+$/g, "").trim();
}

function cleanSubject(value: string): string {
  const cleaned = trimSentenceTail(stripListPrefix(value));
  return cleaned.replace(/^(?:the|a|an)\s+/i, "").trim() || cleaned;
}

function cleanPredicate(value: string): string {
  return trimSentenceTail(stripListPrefix(value)) || "statement";
}

function fallbackSubjectFromSource(source: string): string {
  const basename = path
    .basename(source, path.extname(source))
    .replace(/[-_]+/g, " ")
    .trim();
  return basename || "Requirement";
}

function hasExplicitClaimFields(args: ModelRequirementArgs): boolean {
  return (
    args.subjectKey !== undefined ||
    args.propertyKey !== undefined ||
    args.operator !== undefined ||
    args.value !== undefined
  );
}

function buildFallbackClaim(
  statement: string,
  source: string,
  confidence: number,
  provenance: string | undefined,
): ExtractedRequirementClaim {
  return {
    claim: {
      source,
      subjectKey: fallbackSubjectFromSource(source),
      propertyKey: "statement",
      operator: "eq",
      value: statement,
      confidence: Math.min(confidence, STRICT_FALLBACK_CONFIDENCE),
      ...(provenance ? { provenance } : {}),
    },
    extractionMode: "fallback",
    extractionWarnings: [
      "Deterministic claim extraction could not infer a strict semantic claim; emitted a review artifact instead.",
    ],
  };
}

function extractHeuristicClaim(
  statement: string,
  source: string,
  confidence: number,
  provenance: string | undefined,
): ExtractedRequirementClaim | null {
  const normalized = stripListPrefix(statement);

  const retentionMatch = normalized.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+retained\s+for\s+(?<value>\d+)\s+(?<unit>day|days|month|months|year|years)\.?$/i,
  );
  if (retentionMatch?.groups) {
    const { unit, subject, value } = retentionMatch.groups;
    if (!unit || !subject || !value) return null;
    const normalizedUnit = unit.toLowerCase().startsWith("day")
      ? "Days"
      : unit.toLowerCase().startsWith("month")
        ? "Months"
        : "Years";
    return {
      claim: {
        source,
        subjectKey: cleanSubject(subject),
        propertyKey: `Retention ${normalizedUnit}`,
        operator: "eq",
        value: Number(value),
        confidence,
        ...(provenance ? { provenance } : {}),
      },
      extractionMode: "heuristic",
      extractionWarnings: [],
    };
  }

  const enabledMatch = normalized.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<state>enabled|disabled)\.?$/i,
  );
  if (enabledMatch?.groups) {
    const { subject, state } = enabledMatch.groups;
    if (!subject || !state) return null;
    return {
      claim: {
        source,
        subjectKey: cleanSubject(subject),
        propertyKey: "enabled",
        operator: "bool",
        value: state.toLowerCase() === "enabled",
        confidence,
        ...(provenance ? { provenance } : {}),
      },
      extractionMode: "heuristic",
      extractionWarnings: [],
    };
  }

  const forbiddenMatch = normalized.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+not\s+(?<predicate>.+?)\.?$/i,
  );
  if (forbiddenMatch?.groups) {
    const { subject, predicate } = forbiddenMatch.groups;
    if (!subject || !predicate) return null;
    return {
      claim: {
        source,
        subjectKey: cleanSubject(subject),
        propertyKey: cleanPredicate(predicate),
        operator: "polarity",
        value: "forbid",
        confidence,
        ...(provenance ? { provenance } : {}),
      },
      extractionMode: "heuristic",
      extractionWarnings: [],
    };
  }

  const requiredMatch = normalized.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+(?<predicate>.+?)\.?$/i,
  );
  if (requiredMatch?.groups) {
    const { subject, predicate } = requiredMatch.groups;
    if (!subject || !predicate) return null;
    return {
      claim: {
        source,
        subjectKey: cleanSubject(subject),
        propertyKey: cleanPredicate(predicate),
        operator: "polarity",
        value: "require",
        confidence,
        ...(provenance ? { provenance } : {}),
      },
      extractionMode: "heuristic",
      extractionWarnings: [],
    };
  }

  return null;
}

export function estimateNormativeSignalConfidence(
  statement: string,
  heading?: string,
): number {
  const normalizedStatement = stripListPrefix(statement).toLowerCase();
  if (!/\b(must|shall|should)\b/.test(normalizedStatement)) {
    return 0;
  }

  let confidence = normalizedStatement.includes(" shall ")
    ? 0.86
    : normalizedStatement.includes(" must ")
      ? 0.84
      : 0.78;

  if (heading && NORMATIVE_SECTION_PATTERN.test(heading)) {
    confidence += 0.08;
  }

  return Math.round(Math.min(0.95, confidence) * 100) / 100;
}

export function extractRequirementClaim(
  args: ModelRequirementArgs,
): ExtractedRequirementClaim & {
  statement: string;
  source: string;
  sourceFiles: string[];
} {
  const statement = normalizeText(args.text);
  const sourceFiles = normalizeSourceFiles(args.sourceFiles);
  const source = normalizeOptionalString(args.source) ?? sourceFiles[0];
  if (!source) {
    throw new Error(
      "Requirement modeling failed: provide source or at least one sourceFiles entry",
    );
  }

  const provenance = normalizeOptionalString(args.provenance);
  const confidence = clampConfidence(args.confidence);

  if (hasExplicitClaimFields(args)) {
    if (
      !normalizeOptionalString(args.subjectKey) ||
      !normalizeOptionalString(args.propertyKey) ||
      args.operator === undefined ||
      args.value === undefined
    ) {
      throw new Error(
        "Requirement modeling failed: subjectKey, propertyKey, operator, and value must all be provided when any extracted claim field is supplied",
      );
    }

    return {
      statement,
      source,
      sourceFiles,
      claim: {
        source,
        subjectKey: normalizeOptionalString(args.subjectKey) as string,
        propertyKey: normalizeOptionalString(args.propertyKey) as string,
        operator: args.operator,
        value: normalizeClaimValue(args.value),
        confidence,
        ...(provenance ? { provenance } : {}),
      },
      extractionMode: "provided",
      extractionWarnings: [],
    };
  }

  const heuristic = extractHeuristicClaim(
    statement,
    source,
    confidence,
    provenance,
  );
  if (heuristic) {
    return {
      statement,
      source,
      sourceFiles,
      ...heuristic,
    };
  }

  return {
    statement,
    source,
    sourceFiles,
    ...buildFallbackClaim(statement, source, confidence, provenance),
  };
}

function toRelationshipPlanRows(
  relationships: StrictWriteSet["relationships"],
): Array<Record<string, unknown>> {
  return relationships.map((relationship) => ({
    type: relationship.type,
    from: relationship.from,
    to: relationship.to,
  }));
}

export function strictWriteSetToApplyPlan(
  writeSet: StrictWriteSet,
): Array<Record<string, unknown>> {
  if (!writeSet.isStrict) {
    return [
      {
        type: writeSet.observationFact.type,
        id: writeSet.observationFact.id,
        properties: writeSet.observationFact.properties,
        relationships: [],
      },
    ];
  }

  return [
    {
      type: writeSet.subjectFact.type,
      id: writeSet.subjectFact.id,
      properties: writeSet.subjectFact.properties,
      relationships: [],
    },
    {
      type: writeSet.propertyFact.type,
      id: writeSet.propertyFact.id,
      properties: writeSet.propertyFact.properties,
      relationships: [],
    },
    {
      type: writeSet.req.type,
      id: writeSet.req.id,
      properties: writeSet.req.properties,
      relationships: toRelationshipPlanRows(writeSet.relationships),
    },
  ];
}

export function writeSetPrimaryEntityId(writeSet: StrictWriteSet): string {
  return writeSet.isStrict ? writeSet.req.id : writeSet.observationFact.id;
}

export async function getWorkspaceMigrationWarning(
  workspaceRoot = resolveWorkspaceRoot(),
): Promise<string | null> {
  const configPath = path.join(workspaceRoot, ".kb", "config.json");

  let rawConfig: string;
  try {
    rawConfig = await readFile(configPath, "utf8");
  } catch {
    return null;
  }

  try {
    const parsed = JSON.parse(rawConfig) as {
      schemaVersion?: number | string;
    } | null;
    const status = getSchemaVersionStatus(parsed ?? undefined);
    return status.warning;
  } catch {
    return "KB config schemaVersion could not be read and should be checked before applying automated modeling.";
  }
}

export async function handleKbModelRequirement(
  _prolog: PrologProcess,
  args: ModelRequirementArgs,
): Promise<ModelRequirementResult> {
  const extracted = extractRequirementClaim(args);
  const writeSet = buildStrictWriteSet({
    claim: extracted.claim,
    statement: extracted.statement,
  });
  const applyPlan = strictWriteSetToApplyPlan(writeSet);
  const migrationWarning = await getWorkspaceMigrationWarning();

  const strictSummary = writeSet.isStrict
    ? `Modeled strict requirement into ${applyPlan.length} sequential applyPlan step(s).`
    : "Modeled a non-blocking observation review artifact; deterministic claim extraction stayed below the strict threshold.";

  const structuredContent = {
    statement: extracted.statement,
    source: extracted.source,
    sourceFiles: extracted.sourceFiles,
    claim: extracted.claim,
    writeSet,
    applyPlan,
    isStrict: writeSet.isStrict,
    confidence: writeSet.confidence,
    extractionMode: extracted.extractionMode,
    extractionWarnings: extracted.extractionWarnings,
    migrationWarning,
  };

  return {
    content: [
      {
        type: "text",
        text: migrationWarning
          ? `${strictSummary} Migration warning included.`
          : strictSummary,
      },
    ],
    structuredContent,
    applyPlan,
    writeSet,
    migrationWarning,
  };
}
