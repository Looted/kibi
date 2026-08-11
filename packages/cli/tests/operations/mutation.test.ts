import { describe, expect, mock, test } from "bun:test";

import { buildPropertyList } from "../../src/operations/mutation/serialization.js";
import { analyzeSemanticAdvisorInput } from "../../src/operations/semantic-advisor/analyze-prose.js";
import type {
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";
import {
  deleteSpec,
  upsertSpec,
  validateUpsertSpec,
} from "../../src/public/operations/specs/mutation.js";

type QueryHandler = (goal: string) => PrologQueryResult;

function createContext(handler: QueryHandler): {
  readonly context: OperationContext;
  readonly query: ReturnType<typeof mock>;
  readonly save: ReturnType<typeof mock>;
} {
  const query = mock(async (goal: string) => handler(goal));
  const save = mock(async () => ({ success: true, bindings: {} }));
  const prolog: PrologPort = {
    query,
    nextSolution: async () => null,
    save,
  };
  return {
    context: {
      workspaceRoot: process.cwd(),
      signal: new AbortController().signal,
      clock: () => new Date("2026-07-21T12:00:00.000Z"),
      prolog,
    },
    query,
    save,
  };
}

const payload = {
  type: "req",
  id: "REQ-MUTATION-SHARED",
  properties: {
    title: "Shared mutation executor",
    status: "open",
    source: "test://mutation/shared",
  },
} as const;

const verificationReceipt = {
  version: "kibi.verification-receipt.v1",
  receipt_id: "VR-MUTATION-0001",
  test_id: "TEST-RECEIPT",
  runner: "bun",
  command: "bun test ./tests/e2e/receipt.test.ts",
  scope: "end_to_end",
  outcome: "passed",
  code_snapshot: "a".repeat(64),
  environment_hash: "b".repeat(64),
  started_at: "2026-07-21T11:55:00.000Z",
  finished_at: "2026-07-21T12:00:00.000Z",
  artifact_digest: "c".repeat(64),
} as const;

describe("shared mutation operation specs", () => {
  test("serializes semantic inventory as one quoted JSON value", () => {
    const properties = buildPropertyList({
      id: "REQ-INVENTORY",
      type: "req",
      semantic_inventory: [
        {
          claim_key: "CLAIM-ABCDEF0123456789",
          claim_text: "A stable claim",
          role: "normative",
          status: "modeled",
          span: { start: 0, end: 14 },
        },
      ],
    });

    expect(properties).toContain(
      'semantic_inventory="[{\\"claim_key\\":\\"CLAIM-ABCDEF0123456789\\"',
    );
    expect(properties).not.toContain(
      'semantic_inventory=[{"claim_key":"CLAIM-ABCDEF0123456789"',
    );
  });

  test("serializes receipt history as one quoted JSON value", () => {
    const properties = buildPropertyList({
      id: "TEST-RECEIPT",
      type: "test",
      verification_receipts: [verificationReceipt],
    });

    expect(properties).toContain(
      'verification_receipts="[{\\"version\\":\\"kibi.verification-receipt.v1\\"',
    );
    expect(properties).not.toContain(
      'verification_receipts=[{"version":"kibi.verification-receipt.v1"',
    );
  });

  test("validate-upsert accepts source-bound receipt history", async () => {
    const { context, query, save } = createContext(() => ({
      success: true,
      bindings: { Results: "[]" },
    }));

    const result = await validateUpsertSpec.execute(
      {
        type: "test",
        id: "TEST-RECEIPT",
        properties: {
          title: "Fresh receipt",
          status: "failing",
          verification_scope: "end_to_end",
          verification_receipts: [verificationReceipt],
        },
      },
      context,
    );

    expect(result.structuredContent).toMatchObject({
      valid: true,
      normalizedPreview: {
        id: "TEST-RECEIPT",
        verification_receipts: [verificationReceipt],
      },
    });
    expect(query).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();
  });

  test("validate-upsert rejects receipt history that does not bind its test and scope", async () => {
    const { context, save } = createContext(() => ({
      success: false,
      bindings: {},
    }));

    const result = await validateUpsertSpec.execute(
      {
        type: "test",
        id: "TEST-OTHER",
        properties: {
          title: "Mismatched receipt",
          status: "passing",
          verification_scope: "integration",
          verification_receipts: [verificationReceipt, verificationReceipt],
        },
      },
      context,
    );

    expect(result.structuredContent).toMatchObject({ valid: false });
    const errorText = result.structuredContent?.errors.join(" ") ?? "";
    expect(errorText).toContain("test_id must equal 'TEST-OTHER'");
    expect(errorText).toContain(
      "scope must equal the test verification_scope 'integration'",
    );
    expect(errorText).toContain("receipt_id duplicates 'VR-MUTATION-0001'");
    expect(save).not.toHaveBeenCalled();
  });

  test("validate-upsert rejects changes to persisted receipt history", async () => {
    const previousJson = JSON.stringify([verificationReceipt]);
    const { context, save } = createContext(() => ({
      success: true,
      bindings: {
        Results: `[['TEST-RECEIPT',test,[verification_receipts=${JSON.stringify(previousJson)}]]]`,
      },
    }));

    const result = await validateUpsertSpec.execute(
      {
        type: "test",
        id: "TEST-RECEIPT",
        properties: {
          title: "Mutated receipt",
          status: "passing",
          verification_scope: "end_to_end",
          verification_receipts: [
            { ...verificationReceipt, outcome: "failed" },
          ],
        },
      },
      context,
    );

    expect(result.structuredContent).toMatchObject({ valid: false });
    expect(result.structuredContent?.errors.join(" ")).toContain(
      "verification_receipts is append-only",
    );
    expect(save).not.toHaveBeenCalled();
  });

  test("validate-upsert returns a normalized preview without mutation", async () => {
    // Given
    const { context, query, save } = createContext(() => ({
      success: false,
      bindings: {},
    }));

    // When
    const result = await validateUpsertSpec.execute(payload, context);

    // Then
    expect(result.structuredContent).toMatchObject({
      valid: true,
      errors: [],
      normalizedPreview: {
        id: payload.id,
        type: payload.type,
        title: payload.properties.title,
        status: payload.properties.status,
      },
    });
    expect(query).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  test("validate-upsert rejects logical claim provenance with a mismatched stable key", async () => {
    const { context, query, save } = createContext(() => ({
      success: false,
      bindings: {},
    }));

    const result = await validateUpsertSpec.execute(
      {
        type: "fact",
        id: "FACT-MISMATCHED-CLAIM",
        properties: {
          title: "Mismatched claim",
          status: "active",
          source: "test://mutation/claim",
          fact_kind: "predicate",
          predicate_name: "dependency_rule",
          predicate_args: ["checkout", "payment", "submission"],
          canonical_key: "dependency_rule(checkout,payment,submission)",
          polarity: "assert",
          claim_key: "CLAIM-AAAAAAAAAAAAAAAA",
          claim_text: "Checkout requires payment before submission.",
        },
      },
      context,
    );

    expect(result.structuredContent).toMatchObject({
      valid: false,
      errors: [
        expect.stringContaining(
          "claim_key must equal the stable key derived from claim_text",
        ),
      ],
    });
    expect(query).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  test("validate-upsert rejects normative prose when its proposition ledger is omitted", async () => {
    const { context, save } = createContext(() => ({
      success: false,
      bindings: {},
    }));

    const result = await validateUpsertSpec.execute(
      {
        type: "req",
        id: "REQ-OMITTED-LEDGER",
        properties: {
          title: "OAuth support",
          status: "open",
          text_ref: "System must support OAuth2 authentication.",
        },
      },
      context,
    );

    expect(result.structuredContent).toMatchObject({
      valid: false,
      errors: [
        expect.stringContaining("Proposition-complete ingestion failed"),
      ],
    });
    expect(save).not.toHaveBeenCalled();
  });

  test("validate-upsert accepts explicit ontology gaps without claiming consistency", async () => {
    const { context, save } = createContext(() => ({
      success: false,
      bindings: {},
    }));
    const text = "System must support OAuth2 authentication.";
    const base = {
      type: "req",
      id: "REQ-EXPLICIT-GAP",
      properties: { title: "OAuth support", status: "open", text_ref: text },
    };
    const semantic = analyzeSemanticAdvisorInput({
      payload: { ...base, relationships: [] },
    });
    const contract = semantic.receipt.inventory_contract;

    const result = await validateUpsertSpec.execute(
      {
        ...base,
        properties: {
          ...base.properties,
          logic_claims: semantic.receipt.logic_coverage.expected_claim_keys,
          semantic_inventory_version: contract.version,
          semantic_source_field: contract.source_field,
          semantic_source_hash: contract.source_hash,
          semantic_inventory: semantic.receipt.propositions.map(
            (proposition) => ({ ...proposition, status: "ontology_gap" }),
          ),
        },
      },
      context,
    );

    expect(result.structuredContent).toMatchObject({
      valid: true,
      semanticAdvisor: {
        logic_readiness: "needs_modeling",
        logic_coverage: {
          unresolved_claim_keys: [expect.any(String)],
        },
      },
    });
    expect(save).not.toHaveBeenCalled();
  });

  test("validate-upsert rejects a modeled proposition linked to another claim", async () => {
    const { context, save } = createContext((goal): PrologQueryResult => {
      if (goal.includes("_SemanticGroundProps")) {
        return {
          success: true,
          bindings: { ClaimKey: "CLAIM-AAAAAAAAAAAAAAAA" },
        };
      }
      if (goal.includes("Type, _")) {
        return { success: true, bindings: { Type: "fact" } };
      }
      return { success: true, bindings: {} };
    });
    const text = "System must support OAuth2 authentication.";
    const base = {
      type: "req",
      id: "REQ-WRONG-GROUNDING",
      properties: { title: "OAuth support", status: "open", text_ref: text },
      relationships: [
        {
          type: "requires_predicate",
          from: "REQ-WRONG-GROUNDING",
          to: "FACT-WRONG-CLAIM",
        },
      ],
    };
    const semantic = analyzeSemanticAdvisorInput({ payload: base });
    const contract = semantic.receipt.inventory_contract;

    const result = await validateUpsertSpec.execute(
      {
        ...base,
        properties: {
          ...base.properties,
          logic_claims: semantic.receipt.logic_coverage.expected_claim_keys,
          semantic_inventory_version: contract.version,
          semantic_source_field: contract.source_field,
          semantic_source_hash: contract.source_hash,
          semantic_inventory: semantic.receipt.propositions.map(
            (proposition) => ({ ...proposition, status: "modeled" }),
          ),
        },
      },
      context,
    );

    expect(result.structuredContent).toMatchObject({
      valid: false,
      errors: [
        expect.stringContaining(
          "modeled proposition claim_keys must match logical grounding target claim_keys exactly",
        ),
      ],
    });
    expect(save).not.toHaveBeenCalled();
  });

  test("upsert persists through the Prolog save port after one atomic write", async () => {
    // Given
    const { context, query, save } = createContext(
      (goal): PrologQueryResult => {
        if (goal.startsWith("once(kb_entity(")) {
          return { success: false, bindings: {} };
        }
        return { success: true, bindings: {} };
      },
    );

    // When
    const result = await upsertSpec.execute(payload, context);

    // Then
    expect(result.structuredContent).toMatchObject({
      created: 1,
      updated: 0,
      relationships_created: 0,
    });
    expect(
      query.mock.calls.filter(([goal]) =>
        String(goal).startsWith("rdf_transaction"),
      ),
    ).toHaveLength(1);
    expect(save).toHaveBeenCalledTimes(1);
  });

  test("upsert does not save when its atomic write fails", async () => {
    // Given
    const { context, save } = createContext((goal) => {
      if (goal.startsWith("rdf_transaction")) {
        return {
          success: false,
          bindings: {},
          error: "relationship 2 failed",
        };
      }
      return { success: false, bindings: {} };
    });

    // When
    const invocation = upsertSpec.execute(
      {
        ...payload,
        relationships: [
          { type: "relates_to", from: payload.id, to: "REQ-FIRST" },
          { type: "relates_to", from: payload.id, to: "REQ-SECOND" },
        ],
      },
      context,
    );

    // Then
    await expect(invocation).rejects.toThrow("relationship 2 failed");
    expect(save).not.toHaveBeenCalled();
  });

  test("delete classifies mixed existing and missing ids", async () => {
    // Given
    const { context, query, save } = createContext(
      (goal): PrologQueryResult => {
        if (goal === "once(kb_entity('REQ-DELETE', _, _))") {
          return { success: true, bindings: {} };
        }
        if (goal === "once(kb_entity('REQ-MISSING', _, _))") {
          return { success: false, bindings: {} };
        }
        if (goal.includes("Dependents")) {
          return { success: true, bindings: { Dependents: "[]" } };
        }
        if (goal.includes("findall(['REQ-DELETE',Type,Props]")) {
          return {
            success: true,
            bindings: {
              Results:
                "[['REQ-DELETE',req,[id='REQ-DELETE',title=\"Delete me\",source=\"test://delete\"]]]",
            },
          };
        }
        if (goal.startsWith("rdf_transaction((kb_retract_entity(")) {
          return { success: true, bindings: {} };
        }
        throw new Error(`Unexpected goal: ${goal}`);
      },
    );

    // When
    const result = await deleteSpec.execute(
      { ids: ["REQ-DELETE", "REQ-MISSING"] },
      context,
    );

    // Then
    expect(result.structuredContent).toEqual({
      deleted: 1,
      skipped: 1,
      errors: ["Entity REQ-MISSING does not exist"],
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("kb_retract_entity('REQ-DELETE', req"),
    );
    expect(save).not.toHaveBeenCalled();
  });

  test("delete skips an entity referenced by a dependent", async () => {
    // Given
    const { context, query } = createContext((goal): PrologQueryResult => {
      if (goal.startsWith("once(kb_entity(")) {
        return { success: true, bindings: {} };
      }
      if (goal.includes("Dependents")) {
        return {
          success: true,
          bindings: { Dependents: "[[verified_by,'TEST-001']]" },
        };
      }
      throw new Error(`Unexpected goal: ${goal}`);
    });

    // When
    const result = await deleteSpec.execute({ ids: ["REQ-BLOCKED"] }, context);

    // Then
    expect(result.structuredContent).toEqual({
      deleted: 0,
      skipped: 1,
      errors: [
        "Cannot delete entity REQ-BLOCKED: has dependents (other entities reference it)",
      ],
    });
    expect(
      query.mock.calls.some(([goal]) =>
        String(goal).includes("kb_retract_entity"),
      ),
    ).toBe(false);
  });

  test("delete keeps mutation and save in one rollback-safe transaction", async () => {
    // Given
    const { context, query, save } = createContext(
      (goal): PrologQueryResult => {
        if (goal.startsWith("once(kb_entity(")) {
          return { success: true, bindings: {} };
        }
        if (goal.includes("Dependents")) {
          return { success: true, bindings: { Dependents: "[]" } };
        }
        if (goal.includes("findall(['REQ-SAVE-FAIL',Type,Props]")) {
          return {
            success: true,
            bindings: {
              Results:
                "[['REQ-SAVE-FAIL',req,[id='REQ-SAVE-FAIL',title=\"Rollback\"]]]",
            },
          };
        }
        if (goal.startsWith("rdf_transaction(")) {
          return { success: false, bindings: {}, error: "disk full" };
        }
        throw new Error(`Unexpected goal: ${goal}`);
      },
    );

    // When
    const invocation = deleteSpec.execute({ ids: ["REQ-SAVE-FAIL"] }, context);

    // Then
    await expect(invocation).rejects.toThrow(
      "Delete execution failed: Failed to save KB after delete: disk full",
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringMatching(/^rdf_transaction\(\(.*kb_save\)\)$/),
    );
    expect(save).not.toHaveBeenCalled();
  });
});
