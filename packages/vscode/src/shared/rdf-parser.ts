/*
 * Shared RDF parsing utilities for Kibi VS Code extension.
 *
 * These pure functions operate on raw RDF/XML string content and have no
 * dependency on the VS Code API, making them testable in isolation.
 */

export interface KbRelationship {
  relType: string;
  fromId: string;
  toId: string;
}

/** All relationship types recognised by the Kibi KB schema. */
export const KB_RELATIONSHIP_TYPES: ReadonlyArray<string> = [
  "depends_on",
  "specified_by",
  "verified_by",
  "validates",
  "implements",
  "covered_by",
  "executable_for",
  "constrained_by",
  "guards",
  "publishes",
  "consumes",
  "relates_to",
];

// implements REQ-vscode-traceability
/**
 * Parse inline-style RDF relationships from a kb.rdf document.
 *
 * Matches `<kb:relType rdf:resource="...entity/ID"/>` predicates nested
 * inside each `<rdf:Description rdf:about="...entity/ID">` block and returns
 * a flat list of `{ relType, fromId, toId }` triples.
 */
export function parseRdfRelationships(content: string): KbRelationship[] {
  const relationships: KbRelationship[] = [];

  const blockRe =
    /<rdf:Description rdf:about="(?:(?:urn:kibi:)|kb:)entity\/([^"]+)">([\s\S]*?)<\/rdf:Description>/g;

  while (true) {
    const blockMatch = blockRe.exec(content);
    if (!blockMatch) break;

    const fromId = blockMatch[1];
    const block = blockMatch[2];

    for (const relType of KB_RELATIONSHIP_TYPES) {
      const relRe = new RegExp(
        `<kb:${relType}[^>]*rdf:resource="(?:(?:http://kibi\\.dev/kb/)|kb:)entity/([^"]+)"[^>]*/?>`,
        "g",
      );
      while (true) {
        const relMatch = relRe.exec(block);
        if (!relMatch) break;
        relationships.push({ relType, fromId, toId: relMatch[1] });
      }
    }
  }

  return relationships;
}
