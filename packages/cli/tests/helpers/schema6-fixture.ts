import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { dump } from "js-yaml";
import { analyzeSemanticAdvisorInput } from "../../src/operations/semantic-advisor/analyze-prose.js";
import { semanticSourceHash } from "../../src/operations/semantic-advisor/shared.js";

/**
 * A small synthetic schema 5 KB that reproduces the inventory drift seen in
 * real repositories after a semantic-advisor change: the stored inventory was
 * written by an older advisor that classified claim 0 as descriptive and
 * claim 1 as rationale; the current advisor reads both as normative.
 */

export const UPLOAD_TEXT =
  "Interrupted uploads must resume from the last confirmed chunk. Each resumed upload must verify the checksum of every chunk before completion. This keeps large uploads affordable on mobile networks.";

export const EXCEPTION_TEXT =
  "Uploads from trusted LAN mirrors may skip checksum verification.";

export type Proposition = {
  claim_key: string;
  claim_text: string;
  role: string;
  status: string;
  span: { start: number; end: number };
  reason?: string;
};

export function currentPropositions(id: string, text: string): Proposition[] {
  const { receipt } = analyzeSemanticAdvisorInput({
    payload: {
      type: "req",
      id,
      properties: { title: id, status: "open", semantic_text: text },
      relationships: [],
    },
  });
  return receipt.propositions.map((proposition) => ({
    claim_key: proposition.claim_key,
    claim_text: proposition.claim_text,
    role: proposition.role,
    status: proposition.status,
    span: { start: proposition.span.start, end: proposition.span.end },
  }));
}

const CONTEXT_ROLES = new Set(["rationale", "example", "subjective"]);

function frontmatter(data: Record<string, unknown>): string {
  return dump(data, { lineWidth: -1, noRefs: true, flowLevel: -1 });
}

function writeDoc(
  root: string,
  relative: string,
  data: Record<string, unknown>,
  body: string,
): void {
  const absolute = path.join(root, relative);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, `---\n${frontmatter(data)}---\n\n${body}\n`, "utf8");
}

/** A requirement whose inventory matches the current advisor; nothing modeled. */
export function writeCurrentRequirement(
  root: string,
  id: string,
  text: string,
  extra: Record<string, unknown> = {},
): Proposition[] {
  const propositions = currentPropositions(id, text);
  const inventory = propositions.map((proposition) => ({
    ...proposition,
    status: CONTEXT_ROLES.has(proposition.role)
      ? "nonlogical"
      : proposition.status === "modeled"
        ? "missing"
        : proposition.status,
  }));
  writeDoc(
    root,
    `.kb/requirements/${id}.md`,
    {
      id,
      title: id,
      type: "req",
      status: "open",
      ...extra,
      logic_claims: inventory
        .filter((entry) => !CONTEXT_ROLES.has(entry.role))
        .map((entry) => entry.claim_key),
      semantic_inventory_version: "kibi.semantic-inventory.v1",
      semantic_source_field: "semantic_text",
      semantic_source_hash: semanticSourceHash(text),
      semantic_inventory: inventory,
    },
    text,
  );
  return propositions;
}

/**
 * Write a drifted requirement plus the predicate fact grounding claim
 * `groundClaim`. Grounding claim 0 is safe to re-derive (it stays modeled);
 * grounding claim 1 is not (it was nonlogical and becomes unresolved, so its
 * grounding no longer matches a modeled claim).
 */
export function writeDriftedRequirement(
  root: string,
  id: string,
  groundClaim: 0 | 1,
): { propositions: Proposition[]; factId: string } {
  const propositions = currentPropositions(id, UPLOAD_TEXT);
  if (
    propositions.length !== 3 ||
    propositions[0]?.role !== "normative" ||
    propositions[1]?.role !== "normative"
  ) {
    throw new Error(
      `schema6 fixture expects three advisor propositions with two normative ones; got ${JSON.stringify(propositions)}`,
    );
  }
  const [first, second, third] = propositions as [
    Proposition,
    Proposition,
    Proposition,
  ];
  const factId = `FACT-${id.slice(4)}-GROUNDING`;
  const stored = [
    {
      ...first,
      role: "descriptive",
      status: groundClaim === 0 ? "modeled" : "ontology_gap",
    },
    { ...second, role: "rationale", status: "nonlogical" },
    { ...third, status: "missing" },
  ];
  writeDoc(
    root,
    `.kb/requirements/${id}.md`,
    {
      id,
      title: id,
      type: "req",
      status: "open",
      logic_claims: [first.claim_key, third.claim_key],
      semantic_inventory_version: "kibi.semantic-inventory.v1",
      semantic_source_field: "semantic_text",
      semantic_source_hash: semanticSourceHash(UPLOAD_TEXT),
      semantic_inventory: stored,
      links: [{ type: "requires_predicate", target: factId }],
    },
    UPLOAD_TEXT,
  );
  const grounded = groundClaim === 0 ? first : second;
  writeDoc(
    root,
    `.kb/facts/${factId}.md`,
    {
      id: factId,
      title: `${id} grounding`,
      type: "fact",
      status: "active",
      fact_kind: "predicate",
      predicate_namespace: "test",
      predicate_name: `grounds_${groundClaim}`,
      predicate_args: ["upload", "chunk"],
      canonical_key: `grounds_${groundClaim}(upload,chunk)`,
      polarity: "assert",
      claim_key: grounded.claim_key,
      claim_text: grounded.claim_text,
    },
    "Grounding fact.",
  );
  return { propositions, factId };
}

/** An exception requirement that exempts `baseId` but has no approved_by. */
export function writeUnapprovedException(
  root: string,
  id: string,
  baseId: string,
): void {
  writeCurrentRequirement(root, id, EXCEPTION_TEXT, {
    links: [{ type: "exempts", target: baseId }],
  });
}

export function writeManifest(root: string, schemaVersion: number): void {
  mkdirSync(path.join(root, ".kb"), { recursive: true });
  writeFileSync(
    path.join(root, ".kb", "manifest.json"),
    `${JSON.stringify(
      {
        manifestVersion: 1,
        schemaVersion,
        semanticAdvisorBackfill: "completed",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}
