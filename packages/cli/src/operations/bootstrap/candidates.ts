import path from "node:path";

import { extractFromManifestString } from "../../extractors/manifest.js";
import { extractFromMarkdownString } from "../../extractors/markdown.js";
import { PROVENANCE_STUB_TAG } from "../../provenance-stub.js";
import {
  bootstrapProvenance,
  confidenceBand,
  provenanceBody,
  provenanceStubBody,
  slug,
  upsert,
  withDocumentBody,
} from "./candidate-helpers.js";
import {
  type CandidateBuildResult,
  markdownCandidates,
} from "./markdown-candidates.js";
import type { SubjectKeyRegistry } from "./requirement-claims.js";
import type {
  BootstrapEvidence,
  Candidate,
  SourceOnlySignal,
} from "./types.js";

function typedCandidates(
  item: BootstrapEvidence,
  existingIds: ReadonlySet<string>,
): Candidate[] {
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
}

/**
 * The claim a provider states about its source, or undefined when the
 * provider found only that the file exists. A provider candidate without a
 * claim is a provenance stub: its body would be nothing but the provenance
 * template, so it is written as a `meta` fact tagged
 * `bootstrap:provenance-stub` instead of an observation that search, gap and
 * coverage reports would otherwise read as knowledge.
 */
// implements REQ-bootstrap-provenance-stubs
export function providerClaim(item: BootstrapEvidence): string | undefined {
  const claim =
    typeof item.data.claim === "string" ? item.data.claim.trim() : "";
  return claim.length > 0 ? claim : undefined;
}

/** Whether a planned candidate writes a provenance stub. */
// implements REQ-bootstrap-provenance-stubs
export function isProvenanceStubCandidate(candidate: Candidate): boolean {
  return candidate.applyPlan.some((payload) => {
    const properties = payload.properties;
    if (properties === null || typeof properties !== "object") return false;
    const tags = (properties as Readonly<Record<string, unknown>>).tags;
    return Array.isArray(tags) && tags.includes(PROVENANCE_STUB_TAG);
  });
}

// implements REQ-bootstrap-provenance-stubs
function providerCandidate(
  item: BootstrapEvidence,
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
    (typeof item.data.title === "string" ? item.data.title : undefined) ??
    symbolTitle ??
    `Bootstrap evidence from ${relativePath}`;
  const claim = providerClaim(item);
  const stub = claim === undefined;
  const entity = {
    type: "fact",
    id,
    title,
    status: "active",
    fact_kind: stub
      ? "meta"
      : typeof item.data.factKind === "string"
        ? item.data.factKind
        : item.kind === "repo_metadata"
          ? "meta"
          : "observation",
    source: `bootstrap:${item.provider}:${relativePath}`,
    text_ref: relativePath,
    ...(stub ? { tags: [PROVENANCE_STUB_TAG] } : {}),
  };
  const evidence = Array.isArray(item.data.evidence)
    ? item.data.evidence.filter(
        (value): value is string => typeof value === "string",
      )
    : [`provider:${item.provider}`, `${item.provider}:${relativePath}`];
  const provenance = `${bootstrapProvenance(item.provider, relativePath, confidence)}${evidence.length > 0 ? ` Evidence: ${evidence.join("; ")}.` : ""}`;
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
      applyPlan: [
        withDocumentBody(
          upsert(entity),
          stub
            ? provenanceStubBody(title, provenance)
            : provenanceBody(`${title.trim()}\n\n${claim}`, provenance),
        ),
      ],
    },
  ];
}

// implements REQ-KIBI-BOOTSTRAP-PLAN, REQ-kibi-operation-interface-parity
// implements REQ-KIBI-BOOTSTRAP-PLAN
export function buildBootstrapCandidates(
  evidence: readonly BootstrapEvidence[],
  existingIds: ReadonlySet<string>,
  minConfidence: number,
  includeGenericMarkdown: boolean,
  subjectKeys?: SubjectKeyRegistry,
): CandidateBuildResult {
  const candidates: Candidate[] = [];
  const sourceOnlySignals: SourceOnlySignal[] = [];
  const diagnostics: string[] = [];
  const suppressed: Readonly<Record<string, unknown>>[] = [];
  for (const item of evidence) {
    if (item.kind === "typed_markdown" || item.kind === "symbol_manifest") {
      try {
        candidates.push(...typedCandidates(item, existingIds));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const sourcePath = item.relativePath ?? item.label;
        diagnostics.push(
          `Bootstrap extraction failed at ${sourcePath}: ${message}`,
        );
        suppressed.push({
          candidateId: "",
          sourcePath,
          entityType: "",
          reason: "extraction_failed",
          message,
        });
      }
    }
    if (item.kind === "generic_markdown" && includeGenericMarkdown) {
      const built = markdownCandidates(
        item,
        existingIds,
        minConfidence,
        subjectKeys,
      );
      candidates.push(...built.candidates);
      sourceOnlySignals.push(...built.sourceOnlySignals);
      diagnostics.push(...built.diagnostics);
      suppressed.push(...built.suppressed);
    }
    if (item.kind === "test_topology") {
      const confidence =
        typeof item.data.confidence === "number" ? item.data.confidence : 0.8;
      if (confidence >= minConfidence) {
        sourceOnlySignals.push({
          kind: "test",
          title: `Author TEST coverage for ${item.label}`,
          sourcePath: item.absolutePath ?? item.relativePath ?? item.label,
          confidence,
          evidence: Array.isArray(item.data.evidence)
            ? item.data.evidence.filter(
                (value): value is string => typeof value === "string",
              )
            : [`test_topology:${item.relativePath ?? item.label}`],
        });
      }
    }
    candidates.push(...providerCandidate(item, existingIds, minConfidence));
  }
  return {
    candidates,
    diagnostics,
    suppressed,
    sourceOnlySignals: sourceOnlySignals.sort(
      (left, right) =>
        right.confidence - left.confidence ||
        left.sourcePath.localeCompare(right.sourcePath),
    ),
  };
}
