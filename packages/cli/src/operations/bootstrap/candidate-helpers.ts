import { renderRequirementBody } from "../../entity-body-context.js";
import type { StrictWriteSet } from "../../utils/strict-modeling.js";
import { annotateModelRequirementStep } from "../modeling/model-requirement.js";
import { semanticClaimKey } from "../semantic-advisor/clauses.js";

export function confidenceBand(value: number): string {
  return value >= 0.9 ? "high" : value >= 0.8 ? "medium" : "low";
}

export function slug(value: string, limit = 80): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, limit);
}

export function upsert<
  T extends { readonly type?: unknown; readonly id?: unknown },
>(
  entity: T,
  relationships: readonly {
    readonly type: string;
    readonly from: string;
    readonly to: string;
  }[] = [],
): Readonly<Record<string, unknown>> {
  const { type, id, ...properties } = entity;
  return {
    type: String(type ?? ""),
    id: String(id ?? ""),
    properties,
    relationships,
  };
}

export function strictPlan(
  writeSet: StrictWriteSet,
): readonly Readonly<Record<string, unknown>>[] {
  if (!writeSet.isStrict) {
    return [
      {
        type: "fact",
        id: writeSet.observationFact.id,
        properties: writeSet.observationFact.properties,
        relationships: [],
      },
    ];
  }
  const claimKey = semanticClaimKey(writeSet.req.properties.title);
  return [
    {
      type: "fact",
      id: writeSet.subjectFact.id,
      properties: writeSet.subjectFact.properties,
      relationships: [],
    },
    {
      type: "fact",
      id: writeSet.propertyFact.id,
      properties: writeSet.propertyFact.properties,
      relationships: [],
    },
    {
      type: "req",
      id: writeSet.req.id,
      properties: writeSet.req.properties,
      relationships: writeSet.relationships.map(({ type, from, to }) => ({
        type,
        from,
        to,
      })),
    },
  ].map((step) =>
    annotateModelRequirementStep(step, {
      claimKey,
      statement: writeSet.req.properties.title,
      logicClaims: [claimKey],
    }),
  );
}

/**
 * Attach an authored body to an upsert step so the entity document carries
 * more than its front matter.
 */
// implements REQ-kb-entity-body-context
export function withDocumentBody(
  step: Readonly<Record<string, unknown>>,
  body: string,
): Readonly<Record<string, unknown>> {
  return { ...step, document: { body } };
}

/**
 * Where a deterministic bootstrap provider found an entry. No reason was
 * stated in the source, so the sentence records provenance instead of
 * inventing one; later schema versions and reviewers keep the origin.
 */
// implements REQ-kb-entity-body-context
export function bootstrapProvenance(
  provider: string,
  location: string,
  confidence: number,
): string {
  return `Recorded deterministically by the ${provider} bootstrap provider from ${location} (confidence ${confidence.toFixed(2)}). The source states no reason for this entry, so it preserves where the knowledge came from for later schema versions and reviewers.`;
}

/** Body for a non-requirement entity: its title, then its provenance. */
// implements REQ-kb-entity-body-context
export function provenanceBody(title: string, provenance: string): string {
  return `${title.trim()}\n\n${provenance}\n`;
}

/**
 * Body for a requirement found in prose: the statement, the provenance as
 * its Context and the quoted statement with its location as its Source.
 */
// implements REQ-kb-entity-body-context
export function provenanceRequirementBody(
  statement: string,
  provenance: string,
  reference: string,
): string {
  return renderRequirementBody({
    statement,
    context: provenance,
    source: { excerpt: statement, reference },
  });
}
