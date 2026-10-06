import path from "node:path";

import { buildStrictWriteSet } from "../../utils/strict-modeling.js";
import {
  bootstrapProvenance,
  confidenceBand,
  provenanceBody,
  provenanceRequirementBody,
  slug,
  strictPlan,
  upsert,
  withDocumentBody,
} from "./candidate-helpers.js";
import { claimFor, normalizeClaimStatement } from "./requirement-claims.js";
import type {
  BootstrapEvidence,
  Candidate,
  SourceOnlySignal,
} from "./types.js";

export type CandidateBuildResult = {
  readonly candidates: readonly Candidate[];
  readonly sourceOnlySignals: readonly SourceOnlySignal[];
  readonly diagnostics: readonly string[];
  readonly suppressed: readonly Readonly<Record<string, unknown>>[];
};

function headingSignals(
  heading: string,
  sourcePath: string,
  textRef: string,
  minConfidence: number,
): SourceOnlySignal[] {
  const result: SourceOnlySignal[] = [];
  for (const [kind, pattern, confidence] of [
    ["req", /\brequirements?\b/i, 0.84],
    ["scenario", /\bscenarios?\b/i, 0.83],
    ["test", /\b(tests?|verification)\b/i, 0.82],
  ] as const) {
    if (pattern.test(heading) && confidence >= minConfidence) {
      result.push({
        kind,
        title: `Author ${kind === "req" ? "requirements" : `${kind}s`} from ${heading}`,
        sourcePath,
        confidence,
        evidence: [`generic_heading:${textRef}`],
      });
    }
  }
  return result;
}

function genericHeadingCandidate(
  item: BootstrapEvidence,
  heading: string,
  line: number,
  existingIds: ReadonlySet<string>,
  minConfidence: number,
): Candidate | null {
  const relativePath = item.relativePath ?? item.label;
  const type = /\badr\b|architectur.*decision/i.test(heading)
    ? "adr"
    : /\b(observations?|facts?|notes?)\b/i.test(heading)
      ? "fact"
      : null;
  const confidence = type === "adr" ? 0.9 : type === "fact" ? 0.8 : 0;
  if (!type || confidence < minConfidence) return null;
  const id =
    `${type === "adr" ? "ADR" : "FACT"}-GEN-${slug(heading, 60) || slug(path.basename(relativePath))}`.toUpperCase();
  if (existingIds.has(id)) return null;
  const entity = {
    type,
    id,
    title: heading,
    status: type === "adr" ? "proposed" : "active",
    ...(type === "fact" ? { fact_kind: "observation" } : {}),
    source: `bootstrap:generic:${relativePath}`,
    text_ref: `${relativePath}#L${line}`,
  };
  return {
    candidateId: `gen:${relativePath}:${type}:${slug(heading)}`,
    entityType: type,
    title: heading,
    sourceKind: "generic_markdown",
    sourcePath: item.absolutePath ?? relativePath,
    confidence,
    confidenceBand:
      confidence >= 0.95 ? "high" : confidence >= 0.8 ? "medium" : "low",
    evidence: [`generic_heading:${relativePath}#L${line}`],
    relationships: [],
    applyPlan: [
      withDocumentBody(
        upsert(entity),
        provenanceBody(
          heading,
          bootstrapProvenance(
            "generic markdown",
            `${relativePath} line ${line}`,
            confidence,
          ),
        ),
      ),
    ],
  };
}

function requirementCandidate(
  item: BootstrapEvidence,
  statement: string,
  line: number,
  heading: string | undefined,
  headingLine: number,
  existingIds: ReadonlySet<string>,
  minConfidence: number,
): Candidate | null {
  const relativePath = item.relativePath ?? item.label;
  const base = /\bshall\b/i.test(statement)
    ? 0.86
    : /\bmust\b/i.test(statement)
      ? 0.84
      : 0.78;
  const confidence = Math.min(
    0.95,
    base +
      (heading &&
      /requirements?|constraints?|polic(?:y|ies)|rules?/i.test(heading)
        ? 0.08
        : 0),
  );
  if (confidence < minConfidence) return null;
  const claim = claimFor(
    statement,
    relativePath,
    confidence,
    `${relativePath}#L${line}`,
  );
  if (!claim) return null;
  const writeSet = buildStrictWriteSet({ claim, statement });
  if (!writeSet.isStrict) return null;
  return {
    candidateId: `norm:${writeSet.req.id.toLowerCase()}`,
    entityType: "req",
    title: statement,
    sourceKind: "generic_markdown",
    sourcePath: item.absolutePath ?? relativePath,
    confidence,
    confidenceBand: confidenceBand(confidence),
    evidence: [
      `normative_statement:${relativePath}#L${line}`,
      ...(heading ? [`generic_heading:${relativePath}#L${headingLine}`] : []),
    ],
    relationships: writeSet.relationships.map(({ type, from, to }) => ({
      type,
      from,
      to,
    })),
    applyPlan: strictPlan(writeSet).map((step) =>
      step.type === "req"
        ? withDocumentBody(
            step,
            provenanceRequirementBody(
              statement,
              bootstrapProvenance(
                "generic markdown",
                `${relativePath} line ${line}${heading ? ` under the heading "${heading}"` : ""}`,
                confidence,
              ),
              `${relativePath}#L${line}`,
            ),
          )
        : step,
    ),
  };
}

// implements REQ-KIBI-BOOTSTRAP-PLAN
export function markdownCandidates(
  item: BootstrapEvidence,
  existingIds: ReadonlySet<string>,
  minConfidence: number,
): CandidateBuildResult {
  const candidates: Candidate[] = [];
  const sourceOnlySignals: SourceOnlySignal[] = [];
  const diagnostics: string[] = [];
  const relativePath = item.relativePath ?? item.label;
  let heading: string | undefined;
  let headingLine = 0;
  let fenced = false;
  for (const [index, line] of (item.content ?? "").split(/\r?\n/).entries()) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const match = line.match(/^\s*#+\s*(.+)$/);
    if (match?.[1]) {
      heading = match[1].trim();
      headingLine = index + 1;
      const candidate = genericHeadingCandidate(
        item,
        heading,
        headingLine,
        existingIds,
        minConfidence,
      );
      if (candidate) candidates.push(candidate);
      sourceOnlySignals.push(
        ...headingSignals(
          heading,
          item.absolutePath ?? relativePath,
          `${relativePath}#L${headingLine}`,
          minConfidence,
        ),
      );
      continue;
    }
    const statement = normalizeClaimStatement(line);
    if (!statement || !/\b(must|shall|should)\b/i.test(statement)) continue;
    try {
      const candidate = requirementCandidate(
        item,
        statement,
        index + 1,
        heading,
        headingLine,
        existingIds,
        minConfidence,
      );
      if (candidate) {
        if (
          !candidate.applyPlan.some(
            (payload) =>
              payload.type === "req" && existingIds.has(String(payload.id)),
          )
        )
          candidates.push(candidate);
      } else {
        diagnostics.push(
          `Requirement needs authoring at ${relativePath}#L${index + 1}: ${statement}`,
        );
        sourceOnlySignals.push({
          kind: "req",
          title: `Author requirement: ${statement}`,
          sourcePath: `${relativePath}#L${index + 1}`,
          confidence: 0.8,
          evidence: [`normative_statement:${relativePath}#L${index + 1}`],
        });
      }
    } catch (error) {
      diagnostics.push(
        `Requirement extraction failed at ${relativePath}#L${index + 1}: ${error instanceof Error ? error.message : String(error)}`,
      );
      sourceOnlySignals.push({
        kind: "req",
        title: `Review requirement: ${statement}`,
        sourcePath: `${relativePath}#L${index + 1}`,
        confidence: 0.8,
        evidence: [`normative_statement:${relativePath}#L${index + 1}`],
      });
    }
  }
  return { candidates, sourceOnlySignals, diagnostics, suppressed: [] };
}
