/**
 * kibi.ontology-pack.v1 — declared predicate schemas and typed match candidates.
 */

export const ONTOLOGY_POLARITIES = ["assert", "deny"] as const;
export type OntologyPolarity = (typeof ONTOLOGY_POLARITIES)[number];

export interface PredicateSchemaDefinition {
  readonly schemaId: string;
  readonly predicateName: string;
  readonly argumentNames: readonly string[];
  readonly argumentTypes: readonly string[];
  readonly title?: string;
  readonly description?: string;
  readonly aliases?: readonly string[];
}

export interface OntologyMatchContext {
  readonly claimKey: string;
  readonly statement: string;
  readonly role?: string;
  readonly normative?: boolean;
}

export interface OntologyMatchCandidate {
  readonly schemaId: string;
  readonly predicateName: string;
  readonly arguments: readonly string[];
  readonly polarity: OntologyPolarity;
  readonly confidence: number;
  readonly evidence: string;
  readonly rationale?: string;
}

export interface OntologyPackV1 {
  readonly id: string;
  schemas(): readonly PredicateSchemaDefinition[];
  match(input: OntologyMatchContext): readonly OntologyMatchCandidate[];
}
