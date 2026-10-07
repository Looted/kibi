import { createHash } from "node:crypto";
import { renderRequirementBody } from "../../entity-body-context.js";
import { buildStrictWriteSet } from "../../utils/strict-modeling.js";
import { confidenceBand, strictPlan, upsert } from "./candidate-helpers.js";
import { claimFor } from "./requirement-claims.js";
import type {
  BootstrapDeclaredContext,
  BootstrapIntentClaim,
  BootstrapKnowledgeSource,
  Candidate,
  SourceOnlySignal,
} from "./types.js";

/** How much a claim is trusted follows the authority the human assigned. */
const AUTHORITY_CONFIDENCE = {
  authoritative: 0.9,
  supporting: 0.82,
} as const;

export type IntentClaimBuildResult = {
  readonly candidates: readonly Candidate[];
  readonly sourceOnlySignals: readonly SourceOnlySignal[];
  readonly suppressed: readonly Readonly<Record<string, unknown>>[];
  readonly diagnostics: readonly string[];
};

function citation(
  source: BootstrapKnowledgeSource,
  claim: BootstrapIntentClaim,
): readonly string[] {
  return [
    `intent_claim:${source.id}:${claim.reference}`,
    `knowledge_source:${source.kind}:${source.locator}`,
    `source_authority:${source.authority}`,
    ...(source.connector ? [`connector:${source.connector}`] : []),
  ];
}

function digest(...parts: readonly string[]): string {
  return createHash("sha256")
    .update(parts.join("\u0000"))
    .digest("hex")
    .slice(0, 16)
    .toUpperCase();
}

/**
 * The entity body a claim persists: the statement, then a `## Source`
 * section with the verbatim excerpt, the knowledge source title and the
 * claim's reference. The external source (a ticket, a page) may be gone by the
 * next migration; the body is what remains.
 */
// implements REQ-kb-entity-body-context
function claimBody(
  source: BootstrapKnowledgeSource,
  claim: BootstrapIntentClaim,
): string {
  return renderRequirementBody({
    statement: claim.statement,
    source: {
      excerpt: claim.excerpt,
      title: source.title,
      reference: claim.reference,
    },
  });
}

/**
 * Attach the claim body to an upsert step. The body is the statement plus the
 * cited source; no context tag is added, so a claim whose source states no
 * reason is reported by entity-context-missing instead of being acknowledged.
 */
// implements REQ-kb-entity-body-context
function withClaimBody(
  step: Readonly<Record<string, unknown>>,
  body: string,
): Readonly<Record<string, unknown>> {
  return { ...step, document: { body } };
}

/**
 * An observation or open question from a declared source is evidence for the
 * human, not a requirement: it becomes a cited, non-blocking observation fact
 * so the plan keeps it without entering the contradiction lane.
 */
// implements REQ-bootstrap-claim-kinds-and-conflicts
function reviewClaimCandidate(
  source: BootstrapKnowledgeSource,
  claim: BootstrapIntentClaim,
  kind: "observation" | "open_question",
  confidence: number,
): Candidate {
  const id = `FACT-BOOTSTRAP-${kind === "open_question" ? "QUESTION" : "OBSERVATION"}-${digest(source.id, claim.reference, claim.statement)}`;
  const entity = {
    type: "fact",
    id,
    title: claim.statement,
    status: "active",
    fact_kind: "observation",
    source: `knowledge-source:${source.id}`,
    text_ref: `${source.id}:${claim.reference}`,
    tags: [
      "bootstrap",
      `knowledge-source:${source.id}`,
      kind === "open_question" ? "review:open-question" : "claim:observation",
    ],
  };
  return {
    candidateId: `claim:${source.id}:${id.toLowerCase()}`,
    entityType: "fact",
    title: claim.statement,
    sourceKind: "intent_claim",
    sourcePath: claim.reference,
    confidence,
    confidenceBand: confidenceBand(confidence),
    evidence: [
      ...citation(source, claim),
      `claim_kind:${kind}`,
      ...(claim.excerpt ? [`excerpt:${claim.excerpt}`] : []),
    ],
    relationships: [],
    applyPlan: [withClaimBody(upsert(entity), claimBody(source, claim))],
  };
}

/**
 * A conflict the agent declared between claims becomes an observation fact
 * tagged review:conflict that cites every conflicting claim, so the
 * disagreement stays explicit in the KB instead of an external report.
 */
// implements REQ-bootstrap-claim-kinds-and-conflicts
function conflictCandidates(
  declared: BootstrapDeclaredContext,
  sources: ReadonlyMap<string, BootstrapKnowledgeSource>,
  existingIds: ReadonlySet<string>,
  minConfidence: number,
): IntentClaimBuildResult {
  const claims = new Set(
    (declared.intentClaims ?? []).map(
      (claim) => `${claim.sourceId}\u0000${claim.reference}`,
    ),
  );
  const candidates: Candidate[] = [];
  const suppressed: Readonly<Record<string, unknown>>[] = [];
  const diagnostics: string[] = [];
  const confidence = AUTHORITY_CONFIDENCE.authoritative;
  for (const conflict of declared.conflicts ?? []) {
    const refs = conflict.claimReferences.map(
      (ref) => `${ref.sourceId}:${ref.reference}`,
    );
    const undeclared = conflict.claimReferences.filter(
      (ref) => !claims.has(`${ref.sourceId}\u0000${ref.reference}`),
    );
    if (undeclared.length > 0) {
      diagnostics.push(
        `Conflict "${conflict.note}" cites claim(s) not declared in intentClaims: ${undeclared.map((ref) => `${ref.sourceId}:${ref.reference}`).join(", ")}; declare them or correct the reference.`,
      );
      continue;
    }
    const id = `FACT-BOOTSTRAP-CONFLICT-${digest(...[...refs].sort(), conflict.note)}`;
    const candidateId = `conflict:${id.toLowerCase()}`;
    if (confidence < minConfidence) {
      suppressed.push({
        candidateId,
        reason: "below_min_confidence",
        sourcePath: refs.join(", "),
        entityType: "fact",
      });
      continue;
    }
    if (existingIds.has(id)) {
      suppressed.push({
        candidateId,
        reason: "entity_exists",
        sourcePath: refs.join(", "),
        entityType: "fact",
      });
      continue;
    }
    const title = `Conflict between ${refs.join(" and ")}: ${conflict.note}`;
    const evidenceLines = conflict.claimReferences.map((ref) => {
      const source = sources.get(ref.sourceId);
      const claim = (declared.intentClaims ?? []).find(
        (row) =>
          row.sourceId === ref.sourceId && row.reference === ref.reference,
      );
      return [
        `- ${[source?.title, ref.reference].filter(Boolean).join(" - ")}${claim ? `: ${claim.statement}` : ""}`,
        ...(claim?.excerpt
          ? [`  > ${claim.excerpt.replace(/\s*\n\s*/g, " ")}`]
          : []),
      ].join("\n");
    });
    const conflictBody = `${conflict.note}\n\n## Evidence\n\n${evidenceLines.join("\n")}\n`;
    candidates.push({
      candidateId,
      entityType: "fact",
      title,
      sourceKind: "intent_claim",
      sourcePath: refs.join(", "),
      confidence,
      confidenceBand: confidenceBand(confidence),
      evidence: conflict.claimReferences.flatMap((ref) => {
        const source = sources.get(ref.sourceId);
        return [
          `intent_claim:${ref.sourceId}:${ref.reference}`,
          ...(source
            ? [`knowledge_source:${source.kind}:${source.locator}`]
            : []),
        ];
      }),
      relationships: [],
      applyPlan: [
        withClaimBody(
          upsert({
            type: "fact",
            id,
            title,
            status: "active",
            fact_kind: "observation",
            source: "bootstrap:declared-conflict",
            text_ref: refs.join("; "),
            tags: [
              "bootstrap",
              "review:conflict",
              ...[
                ...new Set(
                  conflict.claimReferences.map(
                    (ref) => `knowledge-source:${ref.sourceId}`,
                  ),
                ),
              ],
            ],
          }),
          conflictBody,
        ),
      ],
    });
  }
  return { candidates, sourceOnlySignals: [], suppressed, diagnostics };
}

/**
 * Turn intent the agent harvested from declared knowledge sources into cited
 * bootstrap candidates. Kibi never contacts those sources: it only records
 * what the agent read, binds it into the plan hash through the declared
 * context, and keeps the citation on every candidate it produces. A claim the
 * strict modeler cannot ground stays an explicit authoring follow-up instead
 * of becoming unverifiable knowledge.
 */
// implements REQ-kibi-bootstrap-knowledge-sources, REQ-bootstrap-claim-kinds-and-conflicts
export function buildIntentClaimCandidates(
  declared: BootstrapDeclaredContext,
  existingIds: ReadonlySet<string>,
  minConfidence: number,
): IntentClaimBuildResult {
  const sources = new Map(
    (declared.knowledgeSources ?? []).map((source) => [source.id, source]),
  );
  const candidates: Candidate[] = [];
  const sourceOnlySignals: SourceOnlySignal[] = [];
  const suppressed: Readonly<Record<string, unknown>>[] = [];
  const diagnostics: string[] = [];
  for (const claim of declared.intentClaims ?? []) {
    const source = sources.get(claim.sourceId);
    if (!source) {
      diagnostics.push(
        `Intent claim cites an undeclared knowledge source "${claim.sourceId}" (${claim.reference}); declare it in knowledgeSources or drop the claim.`,
      );
      continue;
    }
    const kind = claim.kind ?? "intent";
    if (source.authority === "stale") {
      suppressed.push({
        candidateId: "",
        reason: "stale_knowledge_source",
        sourcePath: claim.reference,
        entityType: kind === "intent" ? "req" : "fact",
        statement: claim.statement,
        sourceId: source.id,
      });
      continue;
    }
    // The excerpt is the only verbatim quote from the source; without it an
    // intent or observation would persist as a bare sentence. Only an open
    // question may omit it.
    if (kind !== "open_question" && !claim.excerpt) {
      suppressed.push({
        candidateId: "",
        reason: "missing_excerpt",
        sourcePath: claim.reference,
        entityType: kind === "intent" ? "req" : "fact",
        statement: claim.statement,
        sourceId: source.id,
      });
      diagnostics.push(
        `Claim at ${source.id}:${claim.reference} is an ${kind === "intent" ? "intent" : "observation"} claim without an excerpt; quote the passage it came from in excerpt so the entity keeps it, then re-plan.`,
      );
      continue;
    }
    const confidence = AUTHORITY_CONFIDENCE[source.authority];
    if (kind !== "intent") {
      const review = reviewClaimCandidate(source, claim, kind, confidence);
      const id = String(review.applyPlan[0]?.id ?? "");
      if (confidence < minConfidence || existingIds.has(id))
        suppressed.push({
          candidateId: review.candidateId,
          reason:
            confidence < minConfidence
              ? "below_min_confidence"
              : "entity_exists",
          sourcePath: claim.reference,
          entityType: "fact",
        });
      else candidates.push(review);
      continue;
    }
    const evidence = citation(source, claim);
    const provenance = `${source.id}:${claim.reference}`;
    let writeSet: ReturnType<typeof buildStrictWriteSet> | null = null;
    try {
      const modeled = claimFor(
        claim.statement,
        `knowledge-source:${source.id}`,
        confidence,
        provenance,
      );
      writeSet = modeled
        ? buildStrictWriteSet({ claim: modeled, statement: claim.statement })
        : null;
      if (!modeled)
        diagnostics.push(
          `Intent claim needs authoring at ${source.id}:${claim.reference}: ${claim.statement}`,
        );
    } catch (error) {
      diagnostics.push(
        `Intent claim extraction failed at ${source.id}:${claim.reference}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (
      writeSet?.isStrict &&
      confidence >= minConfidence &&
      !existingIds.has(writeSet.req.id)
    ) {
      candidates.push({
        candidateId: `claim:${source.id}:${writeSet.req.id.toLowerCase()}`,
        entityType: "req",
        title: claim.statement,
        sourceKind: "intent_claim",
        sourcePath: claim.reference,
        confidence,
        confidenceBand: confidenceBand(confidence),
        evidence,
        relationships: writeSet.relationships.map(({ type, from, to }) => ({
          type,
          from,
          to,
        })),
        applyPlan: strictPlan(writeSet).map((step) =>
          step.type === "req"
            ? withClaimBody(step, claimBody(source, claim))
            : step,
        ),
      });
      continue;
    }
    if (writeSet?.isStrict && confidence < minConfidence)
      suppressed.push({
        candidateId: `claim:${source.id}:${writeSet.req.id.toLowerCase()}`,
        reason: "below_min_confidence",
        sourcePath: claim.reference,
        entityType: "req",
      });
    if (writeSet?.isStrict && existingIds.has(writeSet.req.id)) {
      suppressed.push({
        candidateId: `claim:${source.id}:${writeSet.req.id.toLowerCase()}`,
        reason: "entity_exists",
        sourcePath: claim.reference,
        entityType: "req",
      });
      continue;
    }
    sourceOnlySignals.push({
      kind: "req",
      title: `Author requirement from ${source.title} ${claim.reference}: ${claim.statement}`,
      sourcePath: claim.reference,
      confidence,
      evidence,
    });
  }
  const declaredConflicts = conflictCandidates(
    declared,
    sources,
    existingIds,
    minConfidence,
  );
  return {
    candidates: [...candidates, ...declaredConflicts.candidates],
    sourceOnlySignals,
    suppressed: [...suppressed, ...declaredConflicts.suppressed],
    diagnostics: [...diagnostics, ...declaredConflicts.diagnostics],
  };
}
