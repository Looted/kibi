/**
 * kibi.ontology-pack.v1 — declared predicate schemas and typed match candidates.
 */

// implements REQ-capability-plugin-protocol-v1
export const ONTOLOGY_POLARITIES = ["assert", "deny"] as const;
// implements REQ-capability-plugin-protocol-v1
export type OntologyPolarity = (typeof ONTOLOGY_POLARITIES)[number];

// implements REQ-capability-plugin-protocol-v1
export interface PredicateSchemaDefinition {
  readonly schemaId: string;
  readonly predicateName: string;
  readonly argumentNames: readonly string[];
  readonly argumentTypes: readonly string[];
  readonly title?: string;
  readonly description?: string;
  readonly aliases?: readonly string[];
}

// implements REQ-capability-plugin-protocol-v1
export interface OntologyMatchContext {
  readonly claimKey: string;
  readonly statement: string;
  readonly role?: string;
  readonly normative?: boolean;
}

// implements REQ-capability-plugin-protocol-v1
export interface OntologyMatchCandidate {
  readonly schemaId: string;
  readonly predicateName: string;
  readonly arguments: readonly string[];
  readonly polarity: OntologyPolarity;
  readonly confidence: number;
  readonly evidence: string;
  readonly rationale?: string;
}

// implements REQ-capability-plugin-protocol-v1
export interface OntologyPackV1 {
  readonly id: string;
  schemas(): readonly PredicateSchemaDefinition[];
  match(input: OntologyMatchContext): readonly OntologyMatchCandidate[];
}
