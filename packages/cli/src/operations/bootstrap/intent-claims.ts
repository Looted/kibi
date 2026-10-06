import { buildStrictWriteSet } from "../../utils/strict-modeling.js";
import { confidenceBand, strictPlan } from "./candidate-helpers.js";
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

/**
 * Turn intent the agent harvested from declared knowledge sources into cited
 * bootstrap candidates. Kibi never contacts those sources: it only records
 * what the agent read, binds it into the plan hash through the declared
 * context, and keeps the citation on every candidate it produces. A claim the
 * strict modeler cannot ground stays an explicit authoring follow-up instead
 * of becoming unverifiable knowledge.
 */
// implements REQ-kibi-bootstrap-knowledge-sources
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
    if (source.authority === "stale") {
      suppressed.push({
        candidateId: "",
        reason: "stale_knowledge_source",
        sourcePath: claim.reference,
        entityType: "req",
        statement: claim.statement,
        sourceId: source.id,
      });
      continue;
    }
    const confidence = AUTHORITY_CONFIDENCE[source.authority];
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
        applyPlan: strictPlan(writeSet),
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
  return { candidates, sourceOnlySignals, suppressed, diagnostics };
}
