// implements REQ-kibi-proposition-complete-ingestion
import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { semanticClaimKey } from "../../src/operations/semantic-advisor/clauses.js";
import {
  assertLogicalGroundingClaimKeys,
  validateSemanticInventoryBoundary,
} from "../../src/operations/semantic-advisor/ingestion-boundary.js";
import { SEMANTIC_INVENTORY_VERSION } from "../../src/operations/semantic-advisor/shared.js";
import type { SemanticAdvisorReceipt } from "../../src/operations/semantic-advisor/types.js";
import type { PrologPort } from "../../src/public/operations/runtime-types.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

function utf8Span(text: string): { start: number; end: number } {
  return { start: 0, end: Buffer.byteLength(text, "utf8") };
}

function receiptFor(
  text: string,
  overrides: Partial<SemanticAdvisorReceipt["propositions"][number]> = {},
): SemanticAdvisorReceipt {
  const claimKey = semanticClaimKey(text);
  const span = utf8Span(text);
  return {
    version: "kibi.semantic-advisor.v1",
    payload_hash: "hash",
    inventory_contract: {
      version: SEMANTIC_INVENTORY_VERSION,
      source_field: "semantic_text",
      source_hash: "hash",
    },
    logic_readiness: "needs_modeling",
    candidate_lane: "none",
    signals: [],
    ambiguity_witnesses: [],
    propositions: [
      {
        claim_key: claimKey,
        claim_text: text,
        role: "normative",
        status: "ontology_gap",
        span,
        ...overrides,
      },
    ],
    interpretations: [],
    shadow_analysis: [],
    suggestions: [],
    clauses: [],
    logic_coverage: {
      status: "partial",
      expected_claim_keys: [claimKey],
      declared_claim_keys: [claimKey],
      missing_claim_keys: [],
      unresolved_claim_keys: [],
    },
    suggested_next_tools: [],
    summary: "test",
  };
}

function payloadFor(
  text: string,
  inventory: Readonly<Record<string, unknown>>[],
  extra: Readonly<Record<string, unknown>> = {},
) {
  return {
    type: "req",
    id: "REQ-INGEST",
    properties: {
      title: "Ingest",
      status: "open",
      semantic_text: text,
      semantic_inventory_version: SEMANTIC_INVENTORY_VERSION,
      semantic_source_field: "semantic_text",
      semantic_source_hash: createHash("sha256").update(text).digest("hex"),
      logic_claims: inventory
        .filter((entry) => entry.role !== "rationale")
        .map((entry) => String(entry.claim_key)),
      semantic_inventory: inventory,
      ...extra,
    },
  };
}

describe("ingestion-boundary remaining inventory and grounding branches", () => {
  test("reports claim_key, span, proposition, and role/status mismatches", () => {
    restores.push(isolateKibiEnv());
    const text = "The service must log exports.";
    const receipt = receiptFor(text);
    const span = utf8Span(text);
    const derivedKey = semanticClaimKey(text);

    const claimKeyErrors = validateSemanticInventoryBoundary(
      payloadFor(text, [
        {
          claim_key: "CLAIM-WRONG",
          claim_text: text,
          role: "normative",
          status: "ontology_gap",
          span,
        },
      ]),
      [],
      receipt,
    ).errors;
    expect(claimKeyErrors.join(" ")).toContain(
      `claim_key must match claim_text (expected '${derivedKey}')`,
    );

    const spanErrors = validateSemanticInventoryBoundary(
      payloadFor(text, [
        {
          claim_key: derivedKey,
          claim_text: text,
          role: "normative",
          status: "ontology_gap",
          span: { start: 0, end: 3 },
        },
      ]),
      [],
      receipt,
    ).errors;
    expect(spanErrors.join(" ")).toContain("span must select its exact claim_text");

    const propositionErrors = validateSemanticInventoryBoundary(
      payloadFor(text, [
        {
          claim_key: derivedKey,
          claim_text: text,
          role: "definition",
          status: "ontology_gap",
          span,
        },
      ]),
      [],
      receipt,
    ).errors;
    expect(propositionErrors.join(" ")).toContain(
      "does not match advisor proposition",
    );

    const rationaleReceipt = receiptFor(text, {
      role: "rationale",
      status: "nonlogical",
    });
    const contextErrors = validateSemanticInventoryBoundary(
      payloadFor(text, [
        {
          claim_key: derivedKey,
          claim_text: text,
          role: "rationale",
          status: "modeled",
          span,
        },
      ]),
      [],
      rationaleReceipt,
    ).errors;
    expect(contextErrors.join(" ")).toContain("must use status 'nonlogical'");

    const assertiveErrors = validateSemanticInventoryBoundary(
      payloadFor(text, [
        {
          claim_key: derivedKey,
          claim_text: text,
          role: "normative",
          status: "nonlogical",
          span,
        },
      ]),
      [],
      receipt,
    ).errors;
    expect(assertiveErrors.join(" ")).toContain(
      "assertive role 'normative' cannot use status 'nonlogical'",
    );
  });

  test("assertLogicalGroundingClaimKeys rejects missing and duplicate claim keys", async () => {
    restores.push(isolateKibiEnv());
    const text = "The service must log exports.";
    const claimKey = semanticClaimKey(text);
    const payload = {
      type: "req",
      id: "REQ-INGEST",
      properties: {
        status: "open",
        semantic_inventory_version: SEMANTIC_INVENTORY_VERSION,
        semantic_inventory: [
          {
            claim_key: claimKey,
            status: "modeled",
          },
        ],
      },
    };
    const missing: Pick<PrologPort, "query"> = {
      query: async () => ({ success: false, bindings: {} }),
    };
    await expect(
      assertLogicalGroundingClaimKeys(missing as PrologPort, payload, [
        {
          type: "requires_predicate",
          from: "REQ-INGEST",
          to: "FACT-MISSING",
        },
      ]),
    ).rejects.toThrow("must declare a claim_key");

    const duplicate: Pick<PrologPort, "query"> = {
      query: async () => ({
        success: true,
        bindings: { ClaimKey: claimKey },
      }),
    };
    await expect(
      assertLogicalGroundingClaimKeys(duplicate as PrologPort, payload, [
        {
          type: "requires_predicate",
          from: "REQ-INGEST",
          to: "FACT-A",
        },
        {
          type: "requires_property",
          from: "REQ-INGEST",
          to: "FACT-B",
        },
      ]),
    ).rejects.toThrow("more than one logical grounding relationship");
  });
});
