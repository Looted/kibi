/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import * as path from "node:path";
import {
  persistEntities,
  persistRelationships,
} from "../../../src/commands/sync/persistence.js";
import type {
  ExtractedEntity,
  ExtractedRelationship,
  ExtractionResult,
} from "../../../src/extractors/markdown.js";
import type { PrologProcess, QueryResult } from "../../../src/prolog.js";

// --- Mocks ---

const mockToPrologAtom = mock((value: string) => {
  const simple = /^[a-z][a-zA-Z0-9_]*$/;
  return simple.test(value) ? value : `'${value.replace(/'/g, "''")}'`;
});

const mockToPrologString = mock((value: string) => {
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
  return `"${escaped}"`;
});

mock.module("../../../src/prolog/codec.js", () => ({
  toPrologAtom: mockToPrologAtom,
  toPrologString: mockToPrologString,
}));

// --- Helpers ---

function makeEntity(overrides: Partial<ExtractedEntity> = {}): ExtractedEntity {
  return {
    id: "REQ-001",
    type: "req",
    title: "Test Requirement",
    status: "open",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    source: ".kb/requirements/REQ-001.md",
    ...overrides,
  };
}

function makeResult(
  entityOverrides: Partial<ExtractedEntity> = {},
  relationships: ExtractedRelationship[] = [],
): ExtractionResult {
  return {
    entity: makeEntity(entityOverrides),
    relationships,
  };
}

type QueryMock = ReturnType<typeof mock> & {
  mockImplementation: (
    impl: (goal: string | string[]) => Promise<QueryResult>,
  ) => unknown;
};

type MockProlog = {
  query: QueryMock;
  callLog: string[];
  terminate: ReturnType<typeof mock>;
  start: ReturnType<typeof mock>;
};

function asPrologProcess(prolog: MockProlog): PrologProcess {
  return prolog as unknown as PrologProcess;
}

function makeProlog(queries?: Record<string, QueryResult>): MockProlog {
  const callLog: string[] = [];
  const defaultQueries = queries ?? {};
  return {
    query: mock(async (goal: string | string[]) => {
      const g = Array.isArray(goal) ? goal.join(", ") : goal;
      callLog.push(g);
      if (defaultQueries[g] !== undefined) {
        return defaultQueries[g];
      }
      return { success: true, bindings: {} as Record<string, string> };
    }) as QueryMock,
    callLog,
    terminate: mock(async () => {}),
    start: mock(async () => {}),
  };
}

// --- Tests ---

describe("persistEntities", () => {
  let consoleWarnSpy: ReturnType<typeof mock>;

  beforeEach(() => {
    mockToPrologAtom.mockClear();
    mockToPrologString.mockClear();
  });

  test("returns 0 entities and kbModified=false for empty results array", async () => {
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "[]" },
      },
    });

    const result = await persistEntities(
      asPrologProcess(prolog),
      [],
      new Set(),
    );

    expect(result.entityCount).toBe(0);
    expect(result.kbModified).toBe(false);
  });

  test("persists a single entity and returns entityCount=1, kbModified=true", async () => {
    const entity = makeEntity();
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "[]" },
      },
    });

    const result = await persistEntities(
      asPrologProcess(prolog),
      [{ entity, relationships: [] }],
      new Set(),
    );

    expect(result.entityCount).toBe(1);
    expect(result.kbModified).toBe(true);
  });

  test("persists generated symbol coordinates as proof evidence", async () => {
    const entity = makeEntity({
      id: "SYM-PROOF",
      type: "symbol",
      title: "proofSymbol",
      source: ".kb/symbols.yaml",
      sourceLine: 12,
      sourceColumn: 3,
      sourceEndLine: 18,
      sourceEndColumn: 1,
      symbol_role: "behavioral",
      granularity_reason: "legacy-link",
    });
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "[]" },
      },
    });

    await persistEntities(
      asPrologProcess(prolog),
      [{ entity, relationships: [], sourceFile: "src/proof.ts" }],
      new Set(),
    );

    const assertCall = prolog.callLog.find((goal) =>
      goal.includes("kb_assert_entity(symbol"),
    );
    expect(assertCall).toContain('sourceFile="src/proof.ts"');
    expect(assertCall).toContain("sourceLine=12");
    expect(assertCall).toContain("sourceColumn=3");
    expect(assertCall).toContain("sourceEndLine=18");
    expect(assertCall).toContain("sourceEndColumn=1");
    expect(assertCall).toContain("symbol_role=behavioral");
    expect(assertCall).toContain("granularity_reason='legacy-link'");
  });

  test("persists multiple entities", async () => {
    const entities = [
      makeEntity({ id: "REQ-001", type: "req" }),
      makeEntity({ id: "REQ-002", type: "req" }),
      makeEntity({ id: "ADR-001", type: "adr" }),
    ];
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "[]" },
      },
    });

    const results = entities.map((e) => ({ entity: e, relationships: [] }));
    const result = await persistEntities(
      asPrologProcess(prolog),
      results,
      new Set(),
    );

    expect(result.entityCount).toBe(3);
    expect(result.kbModified).toBe(true);
  });

  test("loads existing entity IDs from prolog and adds them to entityIds set", async () => {
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "[req001, 'REQ-002', adr001]" },
      },
    });

    const entityIds = new Set<string>();
    await persistEntities(asPrologProcess(prolog), [], entityIds);

    expect(entityIds.has("req001")).toBe(true);
    expect(entityIds.has("REQ-002")).toBe(true);
    expect(entityIds.has("adr001")).toBe(true);
  });

  test("handles existing IDs with empty prolog response", async () => {
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "" },
      },
    });

    const entityIds = new Set<string>();
    await persistEntities(asPrologProcess(prolog), [], entityIds);

    expect(entityIds.size).toBe(0);
  });

  test("handles existing IDs with prolog failure gracefully", async () => {
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: false,
        bindings: {},
      },
    });

    const entityIds = new Set<string>();
    await persistEntities(asPrologProcess(prolog), [], entityIds);

    expect(entityIds.size).toBe(0);
  });

  test("adds entity IDs from results to entityIds set", async () => {
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "[]" },
      },
    });

    const entityIds = new Set<string>();
    const results = [
      makeResult({ id: "REQ-001" }),
      makeResult({ id: "REQ-002" }),
    ];

    await persistEntities(asPrologProcess(prolog), results, entityIds);

    expect(entityIds.has("REQ-001")).toBe(true);
    expect(entityIds.has("REQ-002")).toBe(true);
  });

  test("handles entity with tags array", async () => {
    const entity = makeEntity({ tags: ["security", "api"] });
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "[]" },
      },
    });

    const result = await persistEntities(
      asPrologProcess(prolog),
      [{ entity, relationships: [] }],
      new Set(),
    );

    expect(result.entityCount).toBe(1);
    // Verify tags were encoded
    const assertCall = prolog.callLog.find((g) =>
      g.includes("kb_assert_entity"),
    );
    expect(assertCall).toContain("tags=[");
    expect(assertCall).toContain("security");
    expect(assertCall).toContain("api");
  });

  test("skips tags when array is empty", async () => {
    const entity = makeEntity({ tags: [] });
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "[]" },
      },
    });

    await persistEntities(
      asPrologProcess(prolog),
      [{ entity, relationships: [] }],
      new Set(),
    );

    const assertCall = prolog.callLog.find((g) =>
      g.includes("kb_assert_entity"),
    );
    expect(assertCall).not.toContain("tags=");
  });

  test("skips tags when undefined", async () => {
    const entity = makeEntity();
    entity.tags = undefined;
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "[]" },
      },
    });

    await persistEntities(
      asPrologProcess(prolog),
      [{ entity, relationships: [] }],
      new Set(),
    );

    const assertCall = prolog.callLog.find((g) =>
      g.includes("kb_assert_entity"),
    );
    expect(assertCall).not.toContain("tags=");
  });

  test("handles entity with owner", async () => {
    const entity = makeEntity({ owner: "platform-team" });
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "[]" },
      },
    });

    await persistEntities(
      asPrologProcess(prolog),
      [{ entity, relationships: [] }],
      new Set(),
    );

    const assertCall = prolog.callLog.find((g) =>
      g.includes("kb_assert_entity"),
    );
    expect(assertCall).toContain("owner=");
  });

  test("handles entity with priority", async () => {
    const entity = makeEntity({ priority: "high" });
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "[]" },
      },
    });

    await persistEntities(
      asPrologProcess(prolog),
      [{ entity, relationships: [] }],
      new Set(),
    );

    const assertCall = prolog.callLog.find((g) =>
      g.includes("kb_assert_entity"),
    );
    expect(assertCall).toContain("priority=");
  });

  test("handles entity with severity", async () => {
    const entity = makeEntity({ severity: "critical" });
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "[]" },
      },
    });

    await persistEntities(
      asPrologProcess(prolog),
      [{ entity, relationships: [] }],
      new Set(),
    );

    const assertCall = prolog.callLog.find((g) =>
      g.includes("kb_assert_entity"),
    );
    expect(assertCall).toContain("severity=");
  });

  test("handles entity with text_ref", async () => {
    const entity = makeEntity({ text_ref: "README.md#L42" });
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "[]" },
      },
    });

    await persistEntities(
      asPrologProcess(prolog),
      [{ entity, relationships: [] }],
      new Set(),
    );

    const assertCall = prolog.callLog.find((g) =>
      g.includes("kb_assert_entity"),
    );
    expect(assertCall).toContain("text_ref=");
  });

  test("serializes requirement manifests and predicate claim provenance", async () => {
    const requirement = makeEntity({
      semantic_text: "Checkout requires payment before submission",
      logic_claims: ["CLAIM-AAAAAAAAAAAAAAAA"],
      semantic_clauses: ["Checkout requires payment before submission"],
      semantic_inventory_version: "kibi.semantic-inventory.v1",
      semantic_source_field: "semantic_text",
      semantic_source_hash:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });
    const predicate = makeEntity({
      id: "FACT-LOGICAL",
      type: "fact",
      status: "active",
      fact_kind: "predicate",
      predicate_namespace: "product",
      predicate_name: "dependency_rule",
      predicate_args: ["checkout", "payment", "submission"],
      canonical_key: "dependency_rule(checkout,payment,submission)",
      polarity: "assert",
      claim_key: "CLAIM-AAAAAAAAAAAAAAAA",
      claim_text: "Checkout requires payment before submission.",
    });
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "[]" },
      },
    });

    await persistEntities(
      asPrologProcess(prolog),
      [
        { entity: requirement, relationships: [] },
        { entity: predicate, relationships: [] },
      ],
      new Set(),
    );

    const requirementCall = prolog.callLog.find((goal) =>
      goal.includes("REQ-001"),
    );
    const predicateCall = prolog.callLog.find((goal) =>
      goal.includes("FACT-LOGICAL"),
    );
    expect(requirementCall).toContain(
      "logic_claims=['CLAIM-AAAAAAAAAAAAAAAA']",
    );
    expect(requirementCall).toContain(
      'semantic_text="Checkout requires payment before submission"',
    );
    expect(requirementCall).toContain(
      'semantic_clauses=["Checkout requires payment before submission"]',
    );
    expect(requirementCall).toContain(
      'semantic_inventory_version="kibi.semantic-inventory.v1"',
    );
    expect(requirementCall).toContain('semantic_source_field="semantic_text"');
    expect(requirementCall).toContain(
      'semantic_source_hash="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"',
    );
    expect(predicateCall).toContain('predicate_name="dependency_rule"');
    expect(predicateCall).toContain(
      'predicate_args=["checkout","payment","submission"]',
    );
    expect(predicateCall).toContain('claim_key="CLAIM-AAAAAAAAAAAAAAAA"');
    expect(predicateCall).toContain(
      'claim_text="Checkout requires payment before submission."',
    );
  });

  test("handles entity with sourceFile", async () => {
    const entity = makeEntity();
    const sourceFile = "packages/opencode/src/brief-intent.ts";
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "[]" },
      },
    });

    await persistEntities(
      asPrologProcess(prolog),
      [{ entity, relationships: [], sourceFile }],
      new Set(),
    );

    const assertCall = prolog.callLog.find((g) =>
      g.includes("kb_assert_entity"),
    );
    expect(assertCall).toContain("sourceFile=");
    expect(assertCall).toContain("packages/opencode/src/brief-intent.ts");
  });

  test("serializes test entity verification scope and perspective", async () => {
    const entity = makeEntity({
      id: "TEST-UPLOAD",
      type: "test",
      status: "passing",
      verification_scope: "integration",
      verification_perspective: "consumer",
    });
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "[]" },
      },
    });

    await persistEntities(
      asPrologProcess(prolog),
      [{ entity, relationships: [] }],
      new Set(),
    );

    const assertCall = prolog.callLog.find((g) =>
      g.includes("kb_assert_entity"),
    );
    expect(assertCall).toContain("verification_scope=integration");
    expect(assertCall).toContain("verification_perspective=consumer");
  });

  test("serializes test verification contracts as preserved JSON", async () => {
    const entity = makeEntity({
      id: "TEST-CONTRACT",
      type: "test",
      status: "active",
      verification_scope: "end_to_end",
      // Legacy pre-proof-architecture blob: persistence must pass stored JSON
      // through unchanged, so the old version string is intentional here.
      proof_contract: {
        version: "kibi.verification-contract.v1",
        runner: "pnpm",
        command_argv: ["pnpm", "run", "e2e", "--", "e2e/contract.spec.ts"],
        required_case_symbols: ["SYM-CONTRACT-CASE"],
        required_projects: ["chromium"],
        success_policy: "all_required_cases_first_attempt",
      } as unknown as ExtractedEntity["proof_contract"],
    });
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "[]" },
      },
    });

    await persistEntities(
      asPrologProcess(prolog),
      [{ entity, relationships: [] }],
      new Set(),
    );

    const assertCall = prolog.callLog.find((g) =>
      g.includes("kb_assert_entity"),
    );
    expect(assertCall).toContain(
      'proof_contract="{\\"version\\":\\"kibi.verification-contract.v1\\"',
    );
  });

  test("serializes test verification receipts as preserved JSON", async () => {
    const entity = makeEntity({
      id: "TEST-RECEIPT",
      type: "test",
      status: "passing",
      verification_scope: "end_to_end",
      proof_receipts: [
        {
          version: "kibi.verification-receipt.v1",
          receipt_id: "VR-PERSISTENCE-0001",
          test_id: "TEST-RECEIPT",
          runner: "bun",
          command: "bun test ./tests/e2e/receipt.test.ts",
          scope: "end_to_end",
          outcome: "passed",
          code_snapshot: "a".repeat(64),
          environment_hash: "b".repeat(64),
          started_at: "2026-08-10T11:55:00.000Z",
          finished_at: "2026-08-10T12:00:00.000Z",
          artifact_digest: "c".repeat(64),
        },
      ] as unknown as ExtractedEntity["proof_receipts"],
    });
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "[]" },
      },
    });

    await persistEntities(
      asPrologProcess(prolog),
      [{ entity, relationships: [] }],
      new Set(),
    );

    const assertCall = prolog.callLog.find((g) =>
      g.includes("kb_assert_entity"),
    );
    expect(assertCall).toContain(
      'proof_receipts="[{\\"version\\":\\"kibi.verification-receipt.v1\\"',
    );
    expect(assertCall).toContain('\\"receipt_id\\":\\"VR-PERSISTENCE-0001\\"');
  });

  test("rejects removal of persisted receipt history during sync", async () => {
    const receipt = {
      version: "kibi.verification-receipt.v1",
      receipt_id: "VR-PERSISTENCE-0001",
      test_id: "TEST-RECEIPT",
      runner: "bun",
      command: "bun test ./tests/e2e/receipt.test.ts",
      scope: "end_to_end",
      outcome: "passed",
      code_snapshot: "a".repeat(64),
      environment_hash: "b".repeat(64),
      started_at: "2026-08-10T11:55:00.000Z",
      finished_at: "2026-08-10T12:00:00.000Z",
      artifact_digest: "c".repeat(64),
    } as const;
    const previousJson = JSON.stringify([receipt]);
    const entity = makeEntity({
      id: "TEST-RECEIPT",
      type: "test",
      status: "passing",
      verification_scope: "end_to_end",
    });
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "['TEST-RECEIPT']" },
      },
      "findall(['TEST-RECEIPT','test',Props], kb_entity('TEST-RECEIPT', 'test', Props), Results)":
        {
          success: true,
          bindings: {
            Results: `[['TEST-RECEIPT',test,[proof_receipts=${JSON.stringify(previousJson)}]]]`,
          },
        },
    });

    await expect(
      persistEntities(
        asPrologProcess(prolog),
        [{ entity, relationships: [] }],
        new Set(),
      ),
    ).rejects.toThrow("proof_receipts is append-only");
  });

  test("adds absolute source and missing fact value context to entity failures", async () => {
    const sourceFile = path.join(process.cwd(), "docs", "FACT-MISSING.md");
    const entity = makeEntity({
      id: "FACT-MISSING",
      type: "fact",
      fact_kind: "property_value",
    });
    const prolog = makeProlog();
    prolog.query.mockImplementation(async (goal: string | string[]) => {
      const g = Array.isArray(goal) ? goal.join(", ") : goal;
      if (g.includes("kb_assert_entity")) {
        return { success: false, bindings: {}, error: "shape failed" };
      }
      return { success: true, bindings: { ExistingIds: "[]" } };
    });

    expect(
      persistEntities(
        asPrologProcess(prolog),
        [{ entity, relationships: [], sourceFile }],
        new Set(),
      ),
    ).rejects.toThrow(
      "source=docs/FACT-MISSING.md; fact_kind=property_value; missing value field",
    );
  });

  test("serializes fact entity typed fields correctly", async () => {
    const entity = makeEntity({
      type: "fact",
      fact_kind: "subject",
      subject_key: "user",
      property_key: "age",
      operator: "gte",
      value_type: "int",
      value_string: "hello",
      value_int: 42,
      value_number: 3.14,
      value_bool: true,
      unit: "years",
      scope: "global",
      polarity: "require",
      closed_world: false,
      valid_from: "2026-01-01",
      valid_to: "2026-12-31",
      canonical_key: "user_age",
    });
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "[]" },
      },
    });

    await persistEntities(
      asPrologProcess(prolog),
      [{ entity, relationships: [] }],
      new Set(),
    );

    const assertCall = prolog.callLog.find((g) =>
      g.includes("kb_assert_entity"),
    );
    expect(assertCall).toContain("fact_kind=");
    expect(assertCall).toContain("subject_key=");
    expect(assertCall).toContain("property_key=");
    expect(assertCall).toContain("value_string=");
    expect(assertCall).toContain("value_int=");
    expect(assertCall).toContain("value_number=");
    expect(assertCall).toContain("value_bool=");
    expect(assertCall).toContain("unit=");
    expect(assertCall).toContain("scope=");
    expect(assertCall).toContain("polarity=");
    expect(assertCall).toContain("closed_world=");
    expect(assertCall).toContain("valid_from=");
    expect(assertCall).toContain("valid_to=");
    expect(assertCall).toContain("canonical_key=");
    expect(assertCall).toContain("operator=");
  });

  test("fact entity with no typed fields produces base props only", async () => {
    const entity = makeEntity({ type: "fact" });
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "[]" },
      },
    });

    await persistEntities(
      asPrologProcess(prolog),
      [{ entity, relationships: [] }],
      new Set(),
    );

    const assertCall = prolog.callLog.find((g) =>
      g.includes("kb_assert_entity"),
    );
    // Should have base props (id, title, status, etc.) but no fact-specific fields
    expect(assertCall).toContain("id=");
    expect(assertCall).toContain("title=");
    expect(assertCall).not.toContain("fact_kind=");
    expect(assertCall).not.toContain("value_int=");
  });

  test("non-fact entity does not serialize typed fields", async () => {
    const entity = makeEntity({
      type: "req",
      value_int: 42,
      fact_kind: "subject" as ExtractedEntity["fact_kind"],
    });
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "[]" },
      },
    });

    await persistEntities(
      asPrologProcess(prolog),
      [{ entity, relationships: [] }],
      new Set(),
    );

    const assertCall = prolog.callLog.find((g) =>
      g.includes("kb_assert_entity"),
    );
    expect(assertCall).not.toContain("fact_kind=");
    expect(assertCall).not.toContain("value_int=");
  });

  test("fact entity drops value_int when non-integer", async () => {
    const entity = makeEntity({ type: "fact", value_int: 3.14 });
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "[]" },
      },
    });

    await persistEntities(
      asPrologProcess(prolog),
      [{ entity, relationships: [] }],
      new Set(),
    );

    const assertCall = prolog.callLog.find((g) =>
      g.includes("kb_assert_entity"),
    );
    expect(assertCall).not.toContain("value_int=");
  });

  test("fact entity accepts value_int when integer", async () => {
    const entity = makeEntity({ type: "fact", value_int: 42 });
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "[]" },
      },
    });

    await persistEntities(
      asPrologProcess(prolog),
      [{ entity, relationships: [] }],
      new Set(),
    );

    const assertCall = prolog.callLog.find((g) =>
      g.includes("kb_assert_entity"),
    );
    expect(assertCall).toContain("value_int=42");
  });

  test("fact entity ignores undefined and null field values", async () => {
    const entity = makeEntity({
      type: "fact",
      subject_key: undefined,
      property_key: undefined,
      value_string: null as unknown as string,
      value_int: undefined,
      value_bool: undefined,
      fact_kind: undefined,
    });
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "[]" },
      },
    });

    await persistEntities(
      asPrologProcess(prolog),
      [{ entity, relationships: [] }],
      new Set(),
    );

    const assertCall = prolog.callLog.find((g) =>
      g.includes("kb_assert_entity"),
    );
    expect(assertCall).not.toContain("subject_key=");
    expect(assertCall).not.toContain("property_key=");
    expect(assertCall).not.toContain("value_string=");
    expect(assertCall).not.toContain("value_int=");
    expect(assertCall).not.toContain("value_bool=");
    expect(assertCall).not.toContain("fact_kind=");
  });

  test("fact entity ignores non-boolean value_bool", async () => {
    const entity = makeEntity({
      type: "fact",
      value_bool: "true" as unknown as boolean,
    });
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "[]" },
      },
    });

    await persistEntities(
      asPrologProcess(prolog),
      [{ entity, relationships: [] }],
      new Set(),
    );

    const assertCall = prolog.callLog.find((g) =>
      g.includes("kb_assert_entity"),
    );
    expect(assertCall).not.toContain("value_bool=");
  });

  test("fact entity ignores non-number value_int", async () => {
    const entity = makeEntity({
      type: "fact",
      value_int: "42" as unknown as number,
    });
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "[]" },
      },
    });

    await persistEntities(
      asPrologProcess(prolog),
      [{ entity, relationships: [] }],
      new Set(),
    );

    const assertCall = prolog.callLog.find((g) =>
      g.includes("kb_assert_entity"),
    );
    expect(assertCall).not.toContain("value_int=");
  });

  test("throws on prolog query failure", async () => {
    const entity = makeEntity();
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "[]" },
      },
    });
    // Override the kb_assert_entity call to fail
    prolog.query.mockImplementation(async (goal: string | string[]) => {
      const g = Array.isArray(goal) ? goal.join(", ") : goal;
      if (g.includes("kb_assert_entity")) {
        return {
          success: false,
          bindings: {},
          error: "assertion failed",
        };
      }
      return { success: true, bindings: { ExistingIds: "[]" } };
    });

    expect(
      persistEntities(
        asPrologProcess(prolog),
        [{ entity, relationships: [] }],
        new Set(),
      ),
    ).rejects.toThrow("Failed to upsert entity REQ-001");
  });

  test("throws with wrapped error on non-Error thrown", async () => {
    const entity = makeEntity();
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "[]" },
      },
    });
    // Override to throw only for kb_assert_entity calls
    prolog.query.mockImplementation(async (goal: string | string[]) => {
      const g = Array.isArray(goal) ? goal.join(", ") : goal;
      if (g.includes("kb_assert_entity")) {
        throw "string error";
      }
      return { success: true, bindings: { ExistingIds: "[]" } };
    });

    expect(
      persistEntities(
        asPrologProcess(prolog),
        [{ entity, relationships: [] }],
        new Set(),
      ),
    ).rejects.toThrow("Failed to upsert entity REQ-001: string error");
  });

  test("throws with error message from Error instance", async () => {
    const entity = makeEntity();
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "[]" },
      },
    });
    prolog.query.mockImplementation(async (goal: string | string[]) => {
      const g = Array.isArray(goal) ? goal.join(", ") : goal;
      if (g.includes("kb_assert_entity")) {
        throw new Error("custom prolog error");
      }
      return { success: true, bindings: { ExistingIds: "[]" } };
    });

    expect(
      persistEntities(
        asPrologProcess(prolog),
        [{ entity, relationships: [] }],
        new Set(),
      ),
    ).rejects.toThrow("Failed to upsert entity REQ-001: custom prolog error");
  });

  test("uses result.error when available, otherwise fallback message", async () => {
    const entity = makeEntity({ id: "NO-ERR-MSG" });
    const prolog = makeProlog();
    prolog.query.mockImplementation(async (goal: string | string[]) => {
      const g = Array.isArray(goal) ? goal.join(", ") : goal;
      if (g.includes("kb_assert_entity")) {
        return { success: false, bindings: {} } as QueryResult;
      }
      return { success: true, bindings: { ExistingIds: "[]" } };
    });

    expect(
      persistEntities(
        asPrologProcess(prolog),
        [{ entity, relationships: [] }],
        new Set(),
      ),
    ).rejects.toThrow("kb_assert_entity failed for NO-ERR-MSG");
  });

  test("increments entityCount and sets kbModified=true on success", async () => {
    const entities = [makeEntity({ id: "REQ-A" }), makeEntity({ id: "REQ-B" })];
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "[]" },
      },
    });

    const result = await persistEntities(
      asPrologProcess(prolog),
      entities.map((e) => ({ entity: e, relationships: [] })),
      new Set(),
    );

    expect(result.entityCount).toBe(2);
    expect(result.kbModified).toBe(true);
  });

  test("parses existing IDs with quoted atoms", async () => {
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: {
          ExistingIds: "['REQ-001','REQ-002','ADR-001']",
        },
      },
    });

    const entityIds = new Set<string>();
    await persistEntities(asPrologProcess(prolog), [], entityIds);

    expect(entityIds.has("REQ-001")).toBe(true);
    expect(entityIds.has("REQ-002")).toBe(true);
    expect(entityIds.has("ADR-001")).toBe(true);
  });

  test("skips empty atoms when parsing existing IDs", async () => {
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: { ExistingIds: "[req001, , req003]" },
      },
    });

    const entityIds = new Set<string>();
    await persistEntities(asPrologProcess(prolog), [], entityIds);

    expect(entityIds.has("req001")).toBe(true);
    expect(entityIds.has("req003")).toBe(true);
    // empty atom should be skipped
    expect(entityIds.size).toBe(2);
  });

  test("handles existingIds binding being undefined", async () => {
    const prolog = makeProlog({
      "findall(Id, kb_entity(Id, _, _), ExistingIds)": {
        success: true,
        bindings: {},
      },
    });

    const entityIds = new Set<string>();
    await persistEntities(asPrologProcess(prolog), [], entityIds);

    expect(entityIds.size).toBe(0);
  });
});

describe("persistRelationships", () => {
  beforeEach(() => {
    mockToPrologAtom.mockClear();
    mockToPrologString.mockClear();
  });

  test("returns 0 relationships and kbModified=false for empty inputs", async () => {
    const prolog = makeProlog();
    const result = await persistRelationships(asPrologProcess(prolog), [], []);

    expect(result.relationshipCount).toBe(0);
    expect(result.kbModified).toBe(false);
  });

  test("builds ID lookup from filename to entity ID", async () => {
    const prolog = makeProlog();
    const entity = makeEntity({
      id: "REQ-001",
      source: ".kb/requirements/REQ-001.md",
    });
    const rel: ExtractedRelationship = {
      type: "depends_on",
      from: "REQ-001", // matches filename
      to: "REQ-002",
    };

    const results = [{ entity, relationships: [rel] }];

    // The relationship should use the lookup-resolved ID
    await persistRelationships(asPrologProcess(prolog), results, []);

    const assertCall = prolog.callLog.find((g) =>
      g.includes("kb_assert_relationship"),
    );
    expect(assertCall).toBeDefined();
  });

  test("resolves from ID via lookup (filename → ID)", async () => {
    const prolog = makeProlog();
    const entity = makeEntity({
      id: "REQ-001",
      source: ".kb/requirements/my-requirement.md",
    });
    const rel: ExtractedRelationship = {
      type: "depends_on",
      from: "my-requirement", // should resolve to REQ-001
      to: "REQ-002",
    };

    const result = await persistRelationships(
      asPrologProcess(prolog),
      [
        { entity, relationships: [rel] },
        {
          entity: makeEntity({
            id: "REQ-002",
            source: ".kb/requirements/REQ-002.md",
          }),
          relationships: [],
        },
      ],
      [],
    );

    expect(result.relationshipCount).toBe(1);
  });

  test("resolves to ID via lookup", async () => {
    const prolog = makeProlog();
    const entity = makeEntity({
      id: "REQ-001",
      source: ".kb/requirements/my-requirement.md",
    });
    const entity2 = makeEntity({
      id: "REQ-002",
      source: ".kb/requirements/my-target.md",
    });
    const rel: ExtractedRelationship = {
      type: "depends_on",
      from: "REQ-001",
      to: "my-target", // should resolve to REQ-002
    };

    const results = [
      { entity, relationships: [rel] },
      { entity: entity2, relationships: [] },
    ];

    const result = await persistRelationships(
      asPrologProcess(prolog),
      results,
      [],
    );

    expect(result.relationshipCount).toBe(1);
    expect(result.kbModified).toBe(true);
  });

  test("falls back to rel.from when not in lookup", async () => {
    const prolog = makeProlog();
    const entity = makeEntity({ id: "REQ-001" });
    const rel: ExtractedRelationship = {
      type: "relates_to",
      from: "UNKNOWN-ID",
      to: "REQ-001",
    };

    const result = await persistRelationships(
      asPrologProcess(prolog),
      [{ entity, relationships: [rel] }],
      [],
    );

    expect(result.relationshipCount).toBe(1);
    // Verify the fallback ID was used in the query
    const assertCall = prolog.callLog.find((g) =>
      g.includes("kb_assert_relationship"),
    );
    expect(assertCall).toContain("UNKNOWN-ID");
  });

  test("falls back to rel.to when not in lookup", async () => {
    const prolog = makeProlog();
    const entity = makeEntity({ id: "REQ-001" });
    const rel: ExtractedRelationship = {
      type: "relates_to",
      from: "REQ-001",
      to: "MISSING-TARGET",
    };

    const result = await persistRelationships(
      asPrologProcess(prolog),
      [{ entity, relationships: [rel] }],
      [],
    );

    expect(result.relationshipCount).toBe(1);
    const assertCall = prolog.callLog.find((g) =>
      g.includes("kb_assert_relationship"),
    );
    expect(assertCall).toContain("MISSING-TARGET");
  });

  test("increments relCount on prolog success", async () => {
    const prolog = makeProlog();
    const entity = makeEntity({ id: "REQ-001" });
    const rels: ExtractedRelationship[] = [
      { type: "depends_on", from: "REQ-001", to: "REQ-002" },
      { type: "relates_to", from: "REQ-001", to: "REQ-003" },
    ];

    const result = await persistRelationships(
      asPrologProcess(prolog),
      [{ entity, relationships: rels }],
      [],
    );

    expect(result.relationshipCount).toBe(2);
    expect(result.kbModified).toBe(true);
  });

  test("tracks failed relationships on prolog failure", async () => {
    const prolog = makeProlog();
    prolog.query.mockImplementation(async (goal: string | string[]) => {
      const g = Array.isArray(goal) ? goal.join(", ") : goal;
      if (g.includes("depends_on")) {
        return {
          success: false,
          bindings: {},
          error: "entity not found",
        };
      }
      return { success: true, bindings: {} };
    });

    const entity = makeEntity({ id: "REQ-001" });
    const rels: ExtractedRelationship[] = [
      { type: "depends_on", from: "REQ-001", to: "REQ-002" },
      { type: "relates_to", from: "REQ-001", to: "REQ-003" },
    ];

    const warnSpy = mock();
    const origWarn = console.warn;
    console.warn = warnSpy;

    const result = await persistRelationships(
      asPrologProcess(prolog),
      [{ entity, relationships: rels }],
      [],
    );

    console.warn = origWarn;

    // depends_on fails all retries; relates_to succeeds on initial attempt
    expect(result.relationshipCount).toBe(1);
  });

  test("handles exception thrown during relationship assertion", async () => {
    const prolog = makeProlog();
    prolog.query.mockImplementation(async (goal: string | string[]) => {
      const g = Array.isArray(goal) ? goal.join(", ") : goal;
      if (g.includes("throws")) {
        throw new Error("connection lost");
      }
      return { success: true, bindings: {} };
    });

    const entity = makeEntity({ id: "REQ-001" });
    const rel: ExtractedRelationship = {
      type: "throws",
      from: "REQ-001",
      to: "REQ-002",
    };

    const origWarn = console.warn;
    console.warn = mock();

    const result = await persistRelationships(
      asPrologProcess(prolog),
      [{ entity, relationships: [rel] }],
      [],
    );

    console.warn = origWarn;

    // All retries also throw, so no relationships succeed
    expect(result.relationshipCount).toBe(0);
  });

  test("retries failed relationships up to 3 passes", async () => {
    let callCount = 0;
    const prolog = makeProlog();
    prolog.query.mockImplementation(async () => {
      callCount++;
      // Fail first, succeed on retry
      if (callCount <= 1) {
        return {
          success: false,
          bindings: {},
          error: "transient error",
        };
      }
      return { success: true, bindings: {} };
    });

    const entity = makeEntity({ id: "REQ-001" });
    const rel: ExtractedRelationship = {
      type: "depends_on",
      from: "REQ-001",
      to: "REQ-002",
    };

    const result = await persistRelationships(
      asPrologProcess(prolog),
      [{ entity, relationships: [rel] }],
      [],
    );

    // Initial attempt fails, first retry succeeds
    expect(result.relationshipCount).toBe(1);
    expect(result.kbModified).toBe(true);
    expect(callCount).toBe(2);
  });

  test("logs console warnings for remaining failures after retries", async () => {
    const prolog = makeProlog();
    prolog.query.mockImplementation(async () => ({
      success: false,
      bindings: {},
      error: "permanent failure",
    }));

    const entity = makeEntity({ id: "REQ-001" });
    const rel: ExtractedRelationship = {
      type: "depends_on",
      from: "REQ-001",
      to: "REQ-002",
    };

    const warnSpy = mock();
    const origWarn = console.warn;
    console.warn = warnSpy;

    await persistRelationships(
      asPrologProcess(prolog),
      [{ entity, relationships: [rel] }],
      [],
    );

    console.warn = origWarn;

    // Should have logged warnings
    expect(warnSpy.mock.calls.length).toBeGreaterThan(0);
    const allWarnOutput = warnSpy.mock.calls.map((c) => String(c)).join(" ");
    expect(allWarnOutput).toContain("relationship(s) failed");
    expect(allWarnOutput).toContain("depends_on");
    expect(allWarnOutput).toContain("Tip:");
  });

  test("logs missing entity tips for deterministic relationship failures", async () => {
    const prolog = makeProlog();
    prolog.query.mockImplementation(async () => ({
      success: false,
      bindings: {},
      error: "entity does not exist: REQ-MISSING",
    }));
    const warnSpy = mock();
    const origWarn = console.warn;
    console.warn = warnSpy;

    try {
      await persistRelationships(
        asPrologProcess(prolog),
        [
          {
            entity: makeEntity({ id: "REQ-001" }),
            relationships: [
              { type: "depends_on", from: "REQ-001", to: "REQ-MISSING" },
            ],
          },
        ],
        [],
      );
    } finally {
      console.warn = origWarn;
    }

    const warnOutput = warnSpy.mock.calls
      .map((call) => call.join(" "))
      .join("\n");
    expect(warnOutput).toContain("REQ-MISSING");
    expect(warnOutput).toContain("Create the missing docs");
  });

  test("logs schema tips for invalid relationship failures", async () => {
    const prolog = makeProlog();
    prolog.query.mockImplementation(async () => ({
      success: false,
      bindings: {},
      error: "Invalid relationship direction",
    }));
    const warnSpy = mock();
    const origWarn = console.warn;
    console.warn = warnSpy;

    try {
      await persistRelationships(
        asPrologProcess(prolog),
        [
          {
            entity: makeEntity({ id: "REQ-001" }),
            relationships: [
              { type: "implements", from: "REQ-001", to: "SYM-WRONG" },
            ],
          },
        ],
        [],
      );
    } finally {
      console.warn = origWarn;
    }

    const warnOutput = warnSpy.mock.calls
      .map((call) => call.join(" "))
      .join("\n");
    expect(warnOutput).toContain("relationship types and directions");
  });

  test("deduplicates failure log warnings", async () => {
    const prolog = makeProlog();
    prolog.query.mockImplementation(async () => ({
      success: false,
      bindings: {},
      error: "fail",
    }));

    const entity = makeEntity({ id: "REQ-001" });
    // Two identical relationships — should only log once
    const rels: ExtractedRelationship[] = [
      { type: "depends_on", from: "REQ-001", to: "REQ-002" },
      { type: "depends_on", from: "REQ-001", to: "REQ-002" },
    ];

    const warnSpy = mock();
    const origWarn = console.warn;
    console.warn = warnSpy;

    await persistRelationships(
      asPrologProcess(prolog),
      [{ entity, relationships: rels }],
      [],
    );

    console.warn = origWarn;

    // Should have deduplicated — only one "depends_on: REQ-001 -> REQ-002" line
    const warnOutput = warnSpy.mock.calls
      .map((c) => (Array.isArray(c) ? c.join(" ") : String(c)))
      .join("\n");
    // Count occurrences of the specific relationship log
    const matchCount = (
      warnOutput.match(/depends_on: REQ-001 -> REQ-002/g) || []
    ).length;
    expect(matchCount).toBe(1);
  });

  test("handles shard relationships", async () => {
    const prolog = makeProlog();
    const shardRel: ExtractedRelationship = {
      type: "relates_to",
      from: "REQ-001",
      to: "REQ-002",
    };

    const result = await persistRelationships(
      asPrologProcess(prolog),
      [],
      [shardRel],
    );

    expect(result.relationshipCount).toBe(1);
    expect(result.kbModified).toBe(true);
  });

  test("handles shard relationship failure", async () => {
    const prolog = makeProlog();
    prolog.query.mockImplementation(async () => ({
      success: false,
      bindings: {},
      error: "target not found",
    }));

    const shardRel: ExtractedRelationship = {
      type: "depends_on",
      from: "REQ-001",
      to: "REQ-002",
    };

    const warnSpy = mock();
    const origWarn = console.warn;
    console.warn = warnSpy;

    const result = await persistRelationships(
      asPrologProcess(prolog),
      [],
      [shardRel],
    );

    console.warn = origWarn;

    expect(result.relationshipCount).toBe(0);
    expect(result.kbModified).toBe(false);
  });

  test("handles shard relationship exception", async () => {
    const prolog = makeProlog();
    prolog.query.mockImplementation(async () => {
      throw new Error("shard connection error");
    });

    const shardRel: ExtractedRelationship = {
      type: "relates_to",
      from: "REQ-001",
      to: "REQ-002",
    };

    const warnSpy = mock();
    const origWarn = console.warn;
    console.warn = warnSpy;

    const result = await persistRelationships(
      asPrologProcess(prolog),
      [],
      [shardRel],
    );

    console.warn = origWarn;

    expect(result.relationshipCount).toBe(0);
  });

  test("handles non-Error thrown during shard relationship", async () => {
    const prolog = makeProlog();
    prolog.query.mockImplementation(async () => {
      throw "string shard error";
    });

    const shardRel: ExtractedRelationship = {
      type: "relates_to",
      from: "REQ-001",
      to: "REQ-002",
    };

    const warnSpy = mock();
    const origWarn = console.warn;
    console.warn = warnSpy;

    const result = await persistRelationships(
      asPrologProcess(prolog),
      [],
      [shardRel],
    );

    console.warn = origWarn;

    expect(result.relationshipCount).toBe(0);
  });

  test("handles non-Error thrown during retry", async () => {
    let callCount = 0;
    const prolog = makeProlog();
    prolog.query.mockImplementation(async () => {
      callCount++;
      if (callCount <= 1) {
        return {
          success: false,
          bindings: {},
          error: "first fail",
        };
      }
      throw "retry string error";
    });

    const entity = makeEntity({ id: "REQ-001" });
    const rel: ExtractedRelationship = {
      type: "depends_on",
      from: "REQ-001",
      to: "REQ-002",
    };

    const warnSpy = mock();
    const origWarn = console.warn;
    console.warn = warnSpy;

    const result = await persistRelationships(
      asPrologProcess(prolog),
      [{ entity, relationships: [rel] }],
      [],
    );

    console.warn = origWarn;

    expect(result.relationshipCount).toBe(0);
  });

  test("combines results relationships and shard relationships", async () => {
    const prolog = makeProlog();
    const entity = makeEntity({ id: "REQ-001" });
    const resultRel: ExtractedRelationship = {
      type: "depends_on",
      from: "REQ-001",
      to: "REQ-002",
    };
    const shardRel: ExtractedRelationship = {
      type: "relates_to",
      from: "REQ-001",
      to: "REQ-003",
    };

    const result = await persistRelationships(
      asPrologProcess(prolog),
      [{ entity, relationships: [resultRel] }],
      [shardRel],
    );

    expect(result.relationshipCount).toBe(2);
    expect(result.kbModified).toBe(true);
  });

  test("does not log warnings when all relationships succeed", async () => {
    const prolog = makeProlog();
    const entity = makeEntity({ id: "REQ-001" });
    const rel: ExtractedRelationship = {
      type: "depends_on",
      from: "REQ-001",
      to: "REQ-002",
    };

    const warnSpy = mock();
    const origWarn = console.warn;
    console.warn = warnSpy;

    await persistRelationships(
      asPrologProcess(prolog),
      [{ entity, relationships: [rel] }],
      [],
    );

    console.warn = origWarn;

    expect(warnSpy.mock.calls.length).toBe(0);
  });

  test("lookup maps entity.id to entity.id (direct ID lookup)", async () => {
    const prolog = makeProlog();
    const entity = makeEntity({
      id: "REQ-001",
      source: ".kb/requirements/REQ-001.md",
    });
    const rel: ExtractedRelationship = {
      type: "depends_on",
      from: "REQ-001", // direct ID — should still be in lookup
      to: "REQ-002",
    };

    const result = await persistRelationships(
      asPrologProcess(prolog),
      [{ entity, relationships: [rel] }],
      [],
    );

    expect(result.relationshipCount).toBe(1);
  });

  test("attempts one Prolog restart when retries repeatedly return query failed", async () => {
    const prolog = makeProlog();
    prolog.query.mockImplementation(async (goal: string | string[]) => {
      const g = Array.isArray(goal) ? goal.join(", ") : goal;
      prolog.callLog.push(g);
      return { success: false, bindings: {}, error: "Query failed" };
    });

    const entity = makeEntity({ id: "REQ-001" });
    const rel: ExtractedRelationship = {
      type: "depends_on",
      from: "REQ-001",
      to: "REQ-002",
    };

    const warnSpy = mock();
    const origWarn = console.warn;
    console.warn = warnSpy;

    const result = await persistRelationships(
      asPrologProcess(prolog),
      [{ entity, relationships: [rel] }],
      [],
    );

    console.warn = origWarn;

    expect(result.relationshipCount).toBe(0);
    expect(prolog.terminate).toHaveBeenCalledTimes(1);
    expect(prolog.start).toHaveBeenCalledTimes(1);
  });
});
