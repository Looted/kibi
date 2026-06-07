// Kibi — autopilot candidate builders
// Implements candidate assembly from public CLI extractors
import { extractFromManifest } from "kibi-cli/extractors/manifest";
import { extractFromMarkdown } from "kibi-cli/extractors/markdown";
import {
  type StrictWriteSet,
  buildStrictWriteSet,
  modelRequirementClaims,
} from "kibi-cli/public/check-types";

import type { ExtractionResult as ManifestExtractionResult } from "kibi-cli/extractors/manifest";
import type { ExtractionResult as MarkdownExtractionResult } from "kibi-cli/extractors/markdown";
import type { AutopilotEvidence } from "./autopilot-discovery.js";

import fs from "node:fs";
import path from "node:path";
import { createRepoIgnorePolicy } from "kibi-cli/ignore-policy";
import {
  estimateNormativeSignalConfidence,
  extractRequirementClaim,
  strictWriteSetToApplyPlan,
  writeSetPrimaryEntityId,
} from "./model-requirement.js";

export interface Candidate {
  candidateId: string;
  entityType: "req" | "scenario" | "test" | "adr" | "fact" | "symbol" | string;
  title: string;
  // allow other source kinds (generic) without widening other callers
  sourceKind:
    | "typed_markdown"
    | "symbol_manifest"
    | "generic_markdown"
    | string;
  sourcePath: string;
  confidence: number;
  confidenceBand: string;
  evidence: string[];
  relationships: Array<{ type: string; from: string; to: string }>;
  applyPlan: Array<Record<string, unknown>>;
}

export interface SourceOnlyAuthoringSignal {
  kind: "req" | "scenario" | "test";
  title: string;
  sourcePath: string;
  confidence: number;
  evidence: string[];
}

interface ExistingEntitiesContext {
  ids: Set<string>;
  workspaceRoot?: string;
}

interface DiscoveryInput {
  markdownFiles?: string[];
  manifestFiles?: string[];
  evidence?: AutopilotEvidence[];
}

function slugify(value: string, maxLength = 80): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, maxLength);
}

function sortUniquePaths(paths: string[]): string[] {
  return Array.from(new Set(paths)).sort();
}

function getEvidenceFilePaths(
  discoveryResult: DiscoveryInput,
  kind: AutopilotEvidence["kind"],
): string[] {
  return sortUniquePaths(
    (discoveryResult.evidence ?? [])
      .filter((item) => item.kind === kind)
      .map((item) => item.absolutePath ?? "")
      .filter((item): item is string => Boolean(item)),
  );
}

function getTypedMarkdownFiles(discoveryResult: DiscoveryInput): string[] {
  const evidenceFiles = getEvidenceFilePaths(discoveryResult, "typed_markdown");
  if (evidenceFiles.length > 0) return evidenceFiles;
  return discoveryResult.markdownFiles ?? [];
}

function getManifestFiles(discoveryResult: DiscoveryInput): string[] {
  const evidenceFiles = getEvidenceFilePaths(
    discoveryResult,
    "symbol_manifest",
  );
  if (evidenceFiles.length > 0) return evidenceFiles;
  return discoveryResult.manifestFiles ?? [];
}

function getGenericMarkdownFiles(discoveryResult: DiscoveryInput): string[] {
  const evidenceFiles = getEvidenceFilePaths(
    discoveryResult,
    "generic_markdown",
  );
  if (evidenceFiles.length > 0) return evidenceFiles;
  return discoveryResult.markdownFiles ?? [];
}

function hasGenericMarkdownEvidence(discoveryResult: DiscoveryInput): boolean {
  return (discoveryResult.evidence ?? []).some(
    (item) => item.kind === "generic_markdown",
  );
}

function getFactEvidence(discoveryResult: DiscoveryInput): AutopilotEvidence[] {
  return (discoveryResult.evidence ?? []).filter(
    (item) =>
      item.kind === "repo_metadata" ||
      item.kind === "repo_layout" ||
      item.kind === "test_topology" ||
      item.kind === "source_symbols",
  );
}

function toConfidenceBand(confidence: number): string {
  if (confidence >= 0.9) return "high";
  if (confidence >= 0.8) return "medium";
  return "low";
}

function resolveCandidatePaths(
  filePath: string,
  workspaceRoot: string,
): { absolutePath: string; relativePath: string } {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(workspaceRoot, filePath);
  const relativePath = (path.relative(workspaceRoot, absolutePath) || filePath)
    .split(path.sep)
    .join("/");
  return { absolutePath, relativePath };
}

// Legacy helper removed in favor of the shared ignore policy from kibi-cli/ignore-policy.
// Use createRepoIgnorePolicy(workspaceRoot).isIgnored(relativePath) in builders.

function shouldIncludeGenericMarkdown(
  relativePath: string,
  providerScopedMarkdown: boolean,
): boolean {
  const base = path.basename(relativePath).toLowerCase();
  const inDocsDir = /(^|\/)docs\//.test(relativePath);

  if (providerScopedMarkdown) return true;
  return base === "readme.md" || base === "architecture.md" || inDocsDir;
}

function pushSignal(
  signals: SourceOnlyAuthoringSignal[],
  signal: SourceOnlyAuthoringSignal,
  seen: Set<string>,
) {
  const key = `${signal.kind}::${signal.sourcePath}::${signal.title}`;
  if (seen.has(key)) return;
  seen.add(key);
  signals.push(signal);
}

interface NormativeRequirementSeed {
  input: {
    claim: ReturnType<typeof extractRequirementClaim>["claim"];
    statement: string;
  };
  writeSet: StrictWriteSet;
  sourcePath: string;
  evidence: string[];
}

function buildUpsertFromExtraction(
  er: {
    entity:
      | ManifestExtractionResult["entity"]
      | MarkdownExtractionResult["entity"];
    relationships:
      | Array<ManifestExtractionResult["relationships"][number]>
      | Array<MarkdownExtractionResult["relationships"][number]>;
  },
  typeOverride?: string,
) {
  const ent = er.entity as unknown as Record<string, unknown>;
  const type = typeOverride ?? String(ent.type ?? "");
  const id = String(ent.id ?? "");
  // Copy properties except `type` to avoid delete
  const properties: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(ent)) {
    if (k === "type") continue;
    properties[k] = v;
  }

  return {
    type,
    id,
    properties,
    relationships: er.relationships ?? [],
  };
}

// implements REQ-mcp-init-kibi-autopilot-v1
export function buildTypedMarkdownCandidates(
  discoveryResult: DiscoveryInput,
  existingEntities: ExistingEntitiesContext,
): Candidate[] {
  const candidates: Candidate[] = [];
  const workspaceRoot = existingEntities.workspaceRoot ?? process.cwd();
  const ignorePolicy = createRepoIgnorePolicy(workspaceRoot);

  for (const filePath of getTypedMarkdownFiles(discoveryResult)) {
    try {
      const extraction = extractFromMarkdown(
        filePath,
      ) as MarkdownExtractionResult;
      const { entity, relationships } = extraction;

      if (existingEntities.ids.has(entity.id)) continue;

      const { absolutePath, relativePath } = resolveCandidatePaths(
        filePath,
        workspaceRoot,
      );
      if (ignorePolicy.isIgnored(relativePath)) continue;
      const candidateId = `md:${relativePath}:${entity.id}`;
      const upsert = buildUpsertFromExtraction({ entity, relationships });

      candidates.push({
        candidateId,
        entityType: entity.type,
        title: entity.title,
        sourceKind: "typed_markdown",
        sourcePath: absolutePath,
        confidence: 1.0,
        confidenceBand: "high",
        evidence: [
          `extracted_from_markdown:${relativePath}`,
          `entity_id:${entity.id}`,
        ],
        relationships: relationships || [],
        applyPlan: [upsert],
      });
    } catch (error) {
      // skip files that fail extraction
    }
  }

  return candidates;
}

// implements REQ-mcp-init-kibi-autopilot-v1
export function buildSymbolManifestCandidates(
  discoveryResult: DiscoveryInput,
  existingEntities: ExistingEntitiesContext,
): Candidate[] {
  const candidates: Candidate[] = [];
  const workspaceRoot = existingEntities.workspaceRoot ?? process.cwd();

  for (const filePath of getManifestFiles(discoveryResult)) {
    try {
      const results = extractFromManifest(
        filePath,
      ) as ManifestExtractionResult[];
      for (const res of results) {
        const entity = res.entity;
        const relationships = res.relationships || [];

        if (existingEntities.ids.has(entity.id)) continue;

        const { absolutePath, relativePath } = resolveCandidatePaths(
          filePath,
          workspaceRoot,
        );
        const candidateId = `mf:${relativePath}:${entity.id}`;
        const upsert = buildUpsertFromExtraction({ entity, relationships });

        candidates.push({
          candidateId,
          entityType: entity.type,
          title: entity.title,
          sourceKind: "symbol_manifest",
          sourcePath: absolutePath,
          confidence: 0.98,
          confidenceBand: "high",
          evidence: [
            `extracted_from_manifest:${relativePath}`,
            `entity_id:${entity.id}`,
          ],
          relationships,
          applyPlan: [upsert],
        });
      }
    } catch (error) {
      // skip manifest parse errors
    }
  }

  return candidates;
}

/**
 * Conservative generic markdown candidate builder.
 * Scans a small, safe set of top-level markdown files and emits only
 * ADR/FACT candidates when clear heading heuristics match.
 *
 * discoveryResult.markdownFiles is expected to be a list of file paths
 * (absolute or relative). Files under documentation/**, .kb/**, .git/**,
 * node_modules/**, vendor/**, third_party/** are ignored to avoid vendored
 * trees and double-counting typed Kibi docs.
 */
// implements REQ-mcp-init-kibi-autopilot-v1
export function buildGenericMarkdownCandidates(
  discoveryResult: DiscoveryInput,
  existingEntities: ExistingEntitiesContext,
  minConfidence = 0.8,
): Candidate[] {
  const candidates: Candidate[] = [];
  const workspaceRoot = existingEntities.workspaceRoot ?? process.cwd();
  const ignorePolicy = createRepoIgnorePolicy(workspaceRoot);
  const providerScopedMarkdown = hasGenericMarkdownEvidence(discoveryResult);

  const files = getGenericMarkdownFiles(discoveryResult);
  for (const rawPath of files) {
    try {
      const filePath = String(rawPath);

      const { absolutePath, relativePath } = resolveCandidatePaths(
        filePath,
        workspaceRoot,
      );
      if (ignorePolicy.isIgnored(relativePath)) continue;

      // Legacy path-only discovery was conservative. Provider-scoped discovery
      // already filters eligible generic docs, so allow broader repo markdown there.
      if (!shouldIncludeGenericMarkdown(relativePath, providerScopedMarkdown)) {
        continue;
      }

      if (!fs.existsSync(absolutePath)) continue;
      const content = fs.readFileSync(absolutePath, "utf8");
      const lines = content.split(/\r?\n/);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line === undefined) continue;
        const headingMatch = line.match(/^\s*#+\s*(.+)$/);
        if (!headingMatch) continue;
        const headingRaw = headingMatch[1];
        if (!headingRaw) continue;
        const heading = headingRaw.trim();
        const headingLower = heading.toLowerCase();

        let type: "adr" | "fact" | null = null;
        let confidence = 0;

        // ADR heuristic: headings that mention ADR or Architectural Decision
        if (
          /\badr\b/i.test(heading) ||
          /architectur.*decision/i.test(heading)
        ) {
          type = "adr";
          confidence = 0.9;
        }

        // Fact/Observation heuristic
        if (!type && /\b(observations?|facts?|notes?)\b/i.test(heading)) {
          type = "fact";
          confidence = 0.8;
        }

        if (!type) continue;

        // Suppress below-threshold candidates early
        if (confidence < minConfidence) continue;

        // Build a safe ID for the candidate. Use a repo-relative slug so it's
        // deterministic across runs and comparable to typed candidates.
        const slug = heading
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
          .slice(0, 60);
        const idPrefix = type === "adr" ? "ADR" : "FACT";
        const genId =
          `${idPrefix}-GEN-${slug || path.basename(relativePath).replace(/\.[^.]+$/, "")}`.toUpperCase();

        if (existingEntities.ids.has(genId)) continue;

        // Entity record for applyPlan; keep properties minimal and safe.
        const entity: Record<string, unknown> = {
          type,
          id: genId,
          title: heading,
          status:
            type === "fact" ? "active" : type === "adr" ? "proposed" : "open",
          source: `autopilot:generic:${relativePath}`,
          text_ref: `${relativePath}#L${i + 1}`,
        };
        if (type === "fact") {
          // Generic facts are observations by policy
          entity.fact_kind = "observation";
        }

        const upsert = buildUpsertFromExtraction(
          {
            entity: entity as unknown as ManifestExtractionResult["entity"],
            relationships: [],
          },
          type,
        );

        const candidateId = `gen:${relativePath}:${type}:${slug}`;
        const confidenceBand = confidence >= 0.95 ? "high" : "medium";

        candidates.push({
          candidateId,
          entityType: type,
          title: heading,
          sourceKind: "generic_markdown",
          sourcePath: absolutePath,
          confidence,
          confidenceBand,
          evidence: [`generic_heading:${relativePath}#L${i + 1}`],
          relationships: [],
          applyPlan: [upsert],
        });
      }
    } catch (error) {
      // skip unreadable files silently
    }
  }

  return candidates;
}

// implements REQ-mcp-init-kibi-autopilot-v1
export function collectSourceOnlyAuthoringSignals(
  discoveryResult: DiscoveryInput,
  existingEntities: ExistingEntitiesContext,
  minConfidence = 0.8,
): SourceOnlyAuthoringSignal[] {
  const signals: SourceOnlyAuthoringSignal[] = [];
  const seen = new Set<string>();
  const workspaceRoot = existingEntities.workspaceRoot ?? process.cwd();
  const ignorePolicy = createRepoIgnorePolicy(workspaceRoot);
  const providerScopedMarkdown = hasGenericMarkdownEvidence(discoveryResult);

  for (const rawPath of getGenericMarkdownFiles(discoveryResult)) {
    try {
      const filePath = String(rawPath);
      const { absolutePath, relativePath } = resolveCandidatePaths(
        filePath,
        workspaceRoot,
      );
      if (ignorePolicy.isIgnored(relativePath)) continue;
      if (!shouldIncludeGenericMarkdown(relativePath, providerScopedMarkdown))
        continue;
      if (!fs.existsSync(absolutePath)) continue;

      const content = fs.readFileSync(absolutePath, "utf8");
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line === undefined) continue;
        const headingMatch = line.match(/^\s*#+\s*(.+)$/);
        if (!headingMatch) continue;
        const headingRaw = headingMatch[1];
        if (!headingRaw) continue;
        const heading = headingRaw.trim();
        const textRef = `${relativePath}#L${i + 1}`;

        if (/\brequirements?\b/i.test(heading) && 0.84 >= minConfidence) {
          pushSignal(
            signals,
            {
              kind: "req",
              title: `Author requirements from ${heading}`,
              sourcePath: absolutePath,
              confidence: 0.84,
              evidence: [`generic_heading:${textRef}`],
            },
            seen,
          );
        }

        if (/\bscenarios?\b/i.test(heading) && 0.83 >= minConfidence) {
          pushSignal(
            signals,
            {
              kind: "scenario",
              title: `Author scenarios from ${heading}`,
              sourcePath: absolutePath,
              confidence: 0.83,
              evidence: [`generic_heading:${textRef}`],
            },
            seen,
          );
        }

        if (
          /\b(tests?|verification)\b/i.test(heading) &&
          0.82 >= minConfidence
        ) {
          pushSignal(
            signals,
            {
              kind: "test",
              title: `Author tests from ${heading}`,
              sourcePath: absolutePath,
              confidence: 0.82,
              evidence: [`generic_heading:${textRef}`],
            },
            seen,
          );
        }
      }
    } catch {
      // ignore unreadable files when deriving authoring signals
    }
  }

  for (const item of discoveryResult.evidence ?? []) {
    const confidence =
      typeof item.data.confidence === "number" ? item.data.confidence : 0;
    if (item.kind === "test_topology" && confidence >= minConfidence) {
      const sourcePath =
        item.absolutePath ??
        path.resolve(workspaceRoot, item.relativePath ?? item.label);
      const relativePath = item.relativePath ?? item.label;
      pushSignal(
        signals,
        {
          kind: "test",
          title: `Author TEST coverage for ${relativePath}`,
          sourcePath,
          confidence,
          evidence: Array.isArray(item.data.evidence)
            ? item.data.evidence.filter(
                (value): value is string => typeof value === "string",
              )
            : [`test_topology:${relativePath}`],
        },
        seen,
      );
    }
  }

  return signals.sort((left, right) => {
    if (right.confidence !== left.confidence)
      return right.confidence - left.confidence;
    if (left.kind !== right.kind) return left.kind.localeCompare(right.kind);
    return left.sourcePath.localeCompare(right.sourcePath);
  });
}

// implements REQ-mcp-init-kibi-autopilot-v1
export function buildNormativeRequirementCandidates(
  discoveryResult: DiscoveryInput,
  existingEntities: ExistingEntitiesContext,
  minConfidence = 0.8,
): Candidate[] {
  const candidates: Candidate[] = [];
  const seeds: NormativeRequirementSeed[] = [];
  const workspaceRoot = existingEntities.workspaceRoot ?? process.cwd();
  const providerScopedMarkdown = hasGenericMarkdownEvidence(discoveryResult);
  const ignorePolicy = createRepoIgnorePolicy(workspaceRoot);

  for (const rawPath of getGenericMarkdownFiles(discoveryResult)) {
    try {
      const filePath = String(rawPath);
      const { absolutePath, relativePath } = resolveCandidatePaths(
        filePath,
        workspaceRoot,
      );
      if (ignorePolicy.isIgnored(relativePath)) continue;
      if (!shouldIncludeGenericMarkdown(relativePath, providerScopedMarkdown))
        continue;
      if (!fs.existsSync(absolutePath)) continue;

      const content = fs.readFileSync(absolutePath, "utf8");
      const lines = content.split(/\r?\n/);
      let activeHeading: string | undefined;
      let activeHeadingLine: number | undefined;
      let inCodeFence = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line === undefined) continue;

        if (/^\s*(```|~~~)/.test(line)) {
          inCodeFence = !inCodeFence;
          continue;
        }
        if (inCodeFence) continue;

        const headingMatch = line.match(/^\s*#+\s*(.+)$/);
        if (headingMatch?.[1]) {
          activeHeading = headingMatch[1].trim();
          activeHeadingLine = i + 1;
          continue;
        }

        const statement = line
          .replace(/^\s*[-*+]\s+/, "")
          .replace(/^\s*\d+[.)]\s+/, "")
          .trim();
        if (!statement || !/\b(must|shall|should)\b/i.test(statement)) continue;

        const confidence = estimateNormativeSignalConfidence(
          statement,
          activeHeading,
        );
        if (confidence < minConfidence) continue;

        const extracted = extractRequirementClaim({
          text: statement,
          source: relativePath,
          confidence,
          provenance: `${relativePath}#L${i + 1}`,
        });
        const writeSet = buildStrictWriteSet({
          claim: extracted.claim,
          statement: extracted.statement,
        });
        if (!writeSet.isStrict) continue;

        seeds.push({
          input: {
            claim: extracted.claim,
            statement: extracted.statement,
          },
          writeSet,
          sourcePath: absolutePath,
          evidence: [
            `normative_statement:${relativePath}#L${i + 1}`,
            ...(activeHeading && activeHeadingLine
              ? [`generic_heading:${relativePath}#L${activeHeadingLine}`]
              : []),
          ],
        });
      }
    } catch {
      // ignore unreadable files when deriving strict requirement candidates
    }
  }

  const modeledIds = new Set(
    modelRequirementClaims(seeds.map((seed) => seed.input)).map((writeSet) =>
      writeSetPrimaryEntityId(writeSet),
    ),
  );
  const emittedIds = new Set<string>();

  for (const seed of seeds) {
    const entityId = writeSetPrimaryEntityId(seed.writeSet);
    if (!modeledIds.has(entityId) || emittedIds.has(entityId)) continue;
    if (existingEntities.ids.has(entityId)) continue;

    emittedIds.add(entityId);
    candidates.push({
      candidateId: `norm:${entityId.toLowerCase()}`,
      entityType: "req",
      title: seed.input.statement,
      sourceKind: "generic_markdown",
      sourcePath: seed.sourcePath,
      confidence: seed.writeSet.confidence,
      confidenceBand: toConfidenceBand(seed.writeSet.confidence),
      evidence: seed.evidence,
      relationships: seed.writeSet.relationships.map((relationship) => ({
        type: relationship.type,
        from: relationship.from,
        to: relationship.to,
      })),
      applyPlan: strictWriteSetToApplyPlan(seed.writeSet),
    });
  }

  return candidates;
}

// implements REQ-mcp-init-kibi-autopilot-v1
export function buildProviderEvidenceCandidates(
  discoveryResult: DiscoveryInput,
  existingEntities: ExistingEntitiesContext,
  minConfidence = 0.8,
): Candidate[] {
  const candidates: Candidate[] = [];
  const workspaceRoot = existingEntities.workspaceRoot ?? process.cwd();

  for (const item of getFactEvidence(discoveryResult)) {
    const relativePath = item.relativePath ?? item.label;
    const absolutePath =
      item.absolutePath ?? path.resolve(workspaceRoot, relativePath);
    const confidence =
      typeof item.data.confidence === "number" ? item.data.confidence : 0.8;
    if (confidence < minConfidence) continue;

    const factKind =
      typeof item.data.factKind === "string" && item.data.factKind.length > 0
        ? item.data.factKind
        : item.kind === "repo_metadata"
          ? "meta"
          : "observation";
    const title =
      typeof item.data.title === "string" && item.data.title.length > 0
        ? item.data.title
        : `Autopilot evidence from ${relativePath}`;
    const slugSource = `${item.kind}-${relativePath}`;
    const generatedId =
      `FACT-GEN-${slugify(slugSource, 64) || "evidence"}`.toUpperCase();
    if (existingEntities.ids.has(generatedId)) continue;

    const textRef = relativePath.includes("#")
      ? relativePath
      : `${relativePath}`;
    const evidence = Array.isArray(item.data.evidence)
      ? item.data.evidence.filter(
          (value): value is string => typeof value === "string",
        )
      : [];

    candidates.push({
      candidateId: `prov:${item.kind}:${slugify(relativePath, 96) || "evidence"}`,
      entityType: "fact",
      title,
      sourceKind: item.kind,
      sourcePath: absolutePath,
      confidence,
      confidenceBand: toConfidenceBand(confidence),
      evidence:
        evidence.length > 0
          ? evidence
          : [`provider:${item.provider}`, `${item.kind}:${relativePath}`],
      relationships: [],
      applyPlan: [
        {
          type: "fact",
          id: generatedId,
          properties: {
            id: generatedId,
            title,
            status: "active",
            fact_kind: factKind,
            source: `autopilot:${item.provider}:${relativePath}`,
            text_ref: textRef,
          },
          relationships: [],
        },
      ],
    });
  }

  return candidates;
}

export default {
  buildTypedMarkdownCandidates,
  buildSymbolManifestCandidates,
  buildGenericMarkdownCandidates,
  collectSourceOnlyAuthoringSignals,
  buildNormativeRequirementCandidates,
  buildProviderEvidenceCandidates,
};
