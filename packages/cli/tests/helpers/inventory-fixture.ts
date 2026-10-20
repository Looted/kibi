import { dump } from "js-yaml";
import { extractFromMarkdownString } from "../../src/extractors/markdown.js";
import { semanticSourceHash } from "../../src/operations/semantic-advisor/shared.js";
import { currentPropositions } from "./schema6-fixture.js";

const CONTEXT_ROLES = new Set(["rationale", "example", "subjective"]);

/**
 * The requirement markdown with a semantic inventory contract that matches its
 * prose, so the staged gate and sync accept it as a new requirement.
 */
// implements REQ-kibi-proposition-complete-ingestion
export function withSemanticInventory(markdown: string): string {
  const { entity } = extractFromMarkdownString(
    markdown,
    ".kb/requirements/fixture.md",
  );
  const text = String(entity.semantic_text ?? entity.title);
  const field = entity.semantic_text === undefined ? "title" : "semantic_text";
  const inventory = currentPropositions(entity.id, text).map((entry) => ({
    ...entry,
    status: CONTEXT_ROLES.has(entry.role)
      ? "nonlogical"
      : entry.status === "modeled"
        ? "missing"
        : entry.status,
  }));
  const contract = dump(
    {
      logic_claims: inventory
        .filter((entry) => !CONTEXT_ROLES.has(entry.role))
        .map((entry) => entry.claim_key),
      semantic_inventory_version: "kibi.semantic-inventory.v1",
      semantic_source_field: field,
      semantic_source_hash: semanticSourceHash(text),
      semantic_inventory: inventory,
    },
    { lineWidth: -1, noRefs: true, flowLevel: -1 },
  );
  const end = markdown.indexOf("\n---", 3);
  if (!markdown.startsWith("---\n") || end < 0)
    throw new Error("withSemanticInventory needs front matter");
  return `${markdown.slice(0, end + 1)}${contract}${markdown.slice(end + 1)}`;
}
