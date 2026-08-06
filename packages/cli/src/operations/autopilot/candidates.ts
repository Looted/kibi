import path from "node:path";

import { extractFromManifestString } from "../../extractors/manifest.js";
import { extractFromMarkdownString } from "../../extractors/markdown.js";
import { confidenceBand, slug, upsert } from "./candidate-helpers.js";
import {
  type CandidateBuildResult,
  markdownCandidates,
} from "./markdown-candidates.js";
import type {
  AutopilotEvidence,
  Candidate,
  SourceOnlySignal,
} from "./types.js";

function typedCandidates(
  item: AutopilotEvidence,
  existingIds: ReadonlySet<string>,
): Candidate[] {
  try {
    const results =
      item.kind === "symbol_manifest"
        ? extractFromManifestString(
            item.content ?? "",
            item.relativePath ?? item.label,
          )
        : [
            extractFromMarkdownString(
              item.content ?? "",
              item.relativePath ?? item.label,
            ),
          ];
    return results.flatMap(({ entity, relationships }) => {
      if (existingIds.has(entity.id)) return [];
      const sourceKind =
        item.kind === "symbol_manifest" ? "symbol_manifest" : "typed_markdown";
      return [
        {
          candidateId: `${sourceKind === "symbol_manifest" ? "mf" : "md"}:${item.relativePath}:${entity.id}`,
          entityType: entity.type,
          title: entity.title,
          sourceKind,
          sourcePath: item.absolutePath ?? item.label,
          confidence: sourceKind === "symbol_manifest" ? 0.98 : 1,
          confidenceBand: "high",
          evidence: [
            `extracted_from_${sourceKind}:${item.relativePath}`,
            `entity_id:${entity.id}`,
          ],
          relationships: relationships.map(({ type, from, to }) => ({
            type,
            from,
            to,
          })),
          applyPlan: [upsert(entity, relationships)],
        },
      ];
    });
  } catch {
    return [];
  }
}

function providerCandidate(
  item: AutopilotEvidence,
  existingIds: ReadonlySet<string>,
  minConfidence: number,
): Candidate[] {
  if (
    !new Set([
      "repo_metadata",
      "repo_layout",
      "test_topology",
      "source_symbols",
    ]).has(item.kind)
  )
    return [];
  const relativePath = item.relativePath ?? item.label;
  const confidence =
    typeof item.data.confidence === "number" ? item.data.confidence : 0.8;
  const id =
    `FACT-GEN-${slug(`${item.kind}-${relativePath}`, 64) || "evidence"}`.toUpperCase();
  if (confidence < minConfidence || existingIds.has(id)) return [];
  const symbolTitle =
    item.kind === "source_symbols" && /\.(?:[cm]?[jt]sx?)$/i.test(relativePath)
      ? `Source symbols: ${path.basename(relativePath, path.extname(relativePath))}`
      : undefined;
  const title =
    symbolTitle ??
    (typeof item.data.title === "string"
      ? item.data.title
      : `Autopilot evidence from ${relativePath}`);
  const entity = {
    type: "fact",
    id,
    title,
    status: "active",
    fact_kind:
      typeof item.data.factKind === "string"
        ? item.data.factKind
        : item.kind === "repo_metadata"
          ? "meta"
          : "observation",
    source: `autopilot:${item.provider}:${relativePath}`,
    text_ref: relativePath,
  };
  const evidence = Array.isArray(item.data.evidence)
    ? item.data.evidence.filter(
        (value): value is string => typeof value === "string",
      )
    : [`provider:${item.provider}`];
  return [
    {
      candidateId: `prov:${item.kind}:${slug(relativePath, 96) || "evidence"}`,
      entityType: "fact",
      title,
      sourceKind: item.kind,
      sourcePath: item.absolutePath ?? relativePath,
      confidence,
      confidenceBand: confidenceBand(confidence),
      evidence,
      relationships: [],
      applyPlan: [upsert(entity)],
    },
  ];
}

// implements REQ-mcp-init-kibi-autopilot-v1, REQ-kibi-operation-interface-parity
export function buildAutopilotCandidates(
  evidence: readonly AutopilotEvidence[],
  existingIds: ReadonlySet<string>,
  minConfidence: number,
  includeGenericMarkdown: boolean,
): CandidateBuildResult {
  const candidates: Candidate[] = [];
  const sourceOnlySignals: SourceOnlySignal[] = [];
  for (const item of evidence) {
    if (item.kind === "typed_markdown" || item.kind === "symbol_manifest")
      candidates.push(...typedCandidates(item, existingIds));
    if (item.kind === "generic_markdown" && includeGenericMarkdown) {
      const built = markdownCandidates(item, existingIds, minConfidence);
      candidates.push(...built.candidates);
      sourceOnlySignals.push(...built.sourceOnlySignals);
    }
    candidates.push(...providerCandidate(item, existingIds, minConfidence));
  }
  return {
    candidates,
    sourceOnlySignals: sourceOnlySignals.sort(
      (left, right) =>
        right.confidence - left.confidence ||
        left.sourcePath.localeCompare(right.sourcePath),
    ),
  };
}
