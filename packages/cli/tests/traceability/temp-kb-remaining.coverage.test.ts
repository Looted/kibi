// implements REQ-014
import { afterEach, describe, expect, test } from "bun:test";

import type { ExtractionResult } from "../../src/extractors/markdown.js";
import { PrologProcess, type QueryResult } from "../../src/prolog.js";
import { projectStagedEntities } from "../../src/traceability/temp-kb.js";

let previousExitCode: string | number | undefined | null;

afterEach(() => {
  process.exitCode = previousExitCode ?? 0;
});

class StubPrologProcess extends PrologProcess {
  public queries: Array<string | string[]> = [];

  constructor() {
    super({ timeout: 1 });
  }

  override async start(): Promise<void> {}

  override async query(goal: string | string[]): Promise<QueryResult> {
    this.queries.push(goal);
    return { success: true, bindings: {} };
  }

  override async terminate(): Promise<void> {}
}

const FIXED = "2026-04-05T00:00:00.000Z";

function entity(
  type: string,
  extra: Record<string, unknown> = {},
): ExtractionResult {
  return {
    entity: {
      id: `${type.toUpperCase()}-1`,
      type,
      title: `${type} one`,
      status: "active",
      created_at: FIXED,
      updated_at: FIXED,
      source: `.kb/${type}s/${type.toUpperCase()}-1.md`,
      ...extra,
    },
    sourceFile: `src/${type}.ts`,
    relationships: [],
  };
}

describe("projectStagedEntities remaining fact, req, symbol, and test fields", () => {
  test("serializes rule_ir, non-integer value_int skip, inventory, and proof payloads", async () => {
    previousExitCode = process.exitCode;
    const prolog = new StubPrologProcess();
    await projectStagedEntities(prolog, [
      entity("req", {
        semantic_inventory: [{ claim: "c1" }],
      }),
      entity("fact", {
        fact_kind: "rule",
        rule_ir: { all: ["x"] },
        value_int: 1.5,
        value_number: 3,
      }),
      entity("symbol", {
        symbol_role: "behavioral",
        granularity_reason: "extractor-miss",
        sourceLine: 4,
      }),
      entity("test", {
        verification_scope: "unit",
        verification_perspective: "internal",
        proof_contract: {
          version: "kibi.proof-contract.v1",
          test_id: "TEST-1",
          cases: [],
        },
        proof_bindings: [],
        proof_receipts: [],
      }),
    ]);
    const goals = prolog.queries
      .map((goal) => (Array.isArray(goal) ? goal.join(" ") : goal))
      .join("\n");
    expect(goals).toContain("semantic_inventory=");
    expect(goals).toContain("rule_ir=");
    expect(goals).toContain("value_number=3");
    expect(goals).not.toContain("value_int=1.5");
    expect(goals).toContain("granularity_reason=");
    expect(goals).toContain("proof_contract=");
    expect(goals).toContain("proof_bindings=");
    expect(goals).toContain("proof_receipts=");
  });
});
