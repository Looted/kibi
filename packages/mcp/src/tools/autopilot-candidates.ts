// Kibi — autopilot candidate builders
// Implements candidate assembly from public CLI extractors
import { extractFromManifest } from "kibi-cli/extractors/manifest";
import { extractFromMarkdown } from "kibi-cli/extractors/markdown";

import type { ExtractionResult as ManifestExtractionResult } from "kibi-cli/extractors/manifest";
import type { ExtractionResult as MarkdownExtractionResult } from "kibi-cli/extractors/markdown";

import path from "node:path";
import fs from "node:fs";

export interface Candidate {
  candidateId: string;
  entityType: "req" | "scenario" | "test" | "adr" | "fact" | "symbol" | string;
  title: string;
  // allow other source kinds (generic) without widening other callers
  sourceKind: "typed_markdown" | "symbol_manifest" | "generic_markdown" | string;
  sourcePath: string;
  confidence: number;
  confidenceBand: string;
  evidence: string[];
  relationships: Array<{ type: string; from: string; to: string }>;
  applyPlan: Array<Record<string, unknown>>;
}

interface ExistingEntitiesContext {
  ids: Set<string>;
  workspaceRoot?: string;
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

function isIgnoredGenericMarkdownPath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\.\//, "");
  return /(^|\/)(documentation|\.kb|\.git|node_modules|vendor|vendors|third_party|third-party|dist|coverage)(\/|$)/.test(
    normalized,
  );
}

function buildUpsertFromExtraction(
  er: {
    entity: ManifestExtractionResult["entity"] | MarkdownExtractionResult["entity"];
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
  discoveryResult: { markdownFiles: string[] },
  existingEntities: ExistingEntitiesContext,
): Candidate[] {
  const candidates: Candidate[] = [];
  const workspaceRoot = existingEntities.workspaceRoot ?? process.cwd();

  for (const filePath of discoveryResult.markdownFiles || []) {
    try {
      const extraction = extractFromMarkdown(filePath) as MarkdownExtractionResult;
      const { entity, relationships } = extraction;

      if (existingEntities.ids.has(entity.id)) continue;

      const { absolutePath, relativePath } = resolveCandidatePaths(
        filePath,
        workspaceRoot,
      );
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
  discoveryResult: { manifestFiles: string[] },
  existingEntities: ExistingEntitiesContext,
): Candidate[] {
  const candidates: Candidate[] = [];
  const workspaceRoot = existingEntities.workspaceRoot ?? process.cwd();

  for (const filePath of discoveryResult.manifestFiles || []) {
    try {
      const results = extractFromManifest(filePath) as ManifestExtractionResult[];
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
 * ADR/REQ/FACT candidates when clear heading heuristics match.
 *
 * discoveryResult.markdownFiles is expected to be a list of file paths
 * (absolute or relative). Files under documentation/**, .kb/**, .git/**,
 * node_modules/**, vendor/**, third_party/** are ignored to avoid vendored
 * trees and double-counting typed Kibi docs.
 */
// implements REQ-mcp-init-kibi-autopilot-v1
export function buildGenericMarkdownCandidates(
  discoveryResult: { markdownFiles?: string[] },
  existingEntities: ExistingEntitiesContext,
  minConfidence = 0.8,
): Candidate[] {
  const candidates: Candidate[] = [];
  const workspaceRoot = existingEntities.workspaceRoot ?? process.cwd();

  const files = discoveryResult.markdownFiles ?? [];
  for (const rawPath of files) {
    try {
      const filePath = String(rawPath);

      const { absolutePath, relativePath } = resolveCandidatePaths(
        filePath,
        workspaceRoot,
      );
      if (isIgnoredGenericMarkdownPath(relativePath)) continue;

      const base = path.basename(relativePath).toLowerCase();
      const inDocsDir = /(^|\/)docs\//.test(relativePath);

      // Only scan README.md, ARCHITECTURE.md or files under docs/**
      if (!(base === "readme.md" || base === "architecture.md" || inDocsDir)) {
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

        let type: "adr" | "req" | "fact" | null = null;
        let confidence = 0;

        // ADR heuristic: headings that mention ADR or Architectural Decision
        if (/\badr\b/i.test(heading) || /architectur.*decision/i.test(heading)) {
          type = "adr";
          confidence = 0.9;
        }

        // Requirements heuristic: explicit Requirements heading
        if (!type && /\brequirements?\b/i.test(heading)) {
          type = "req";
          confidence = 0.85;
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
        const idPrefix = type === "adr" ? "ADR" : type === "req" ? "REQ" : "FACT";
        const genId = `${idPrefix}-GEN-${slug || path.basename(relativePath).replace(/\.[^.]+$/, "")}`.toUpperCase();

        if (existingEntities.ids.has(genId)) continue;

        // Entity record for applyPlan; keep properties minimal and safe.
        const entity: Record<string, unknown> = {
          type,
          id: genId,
          title: heading,
          status: type === "fact" ? "active" : "open",
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

export default {
  buildTypedMarkdownCandidates,
  buildSymbolManifestCandidates,
};
