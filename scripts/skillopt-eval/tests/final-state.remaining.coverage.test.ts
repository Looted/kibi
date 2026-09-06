// implements REQ-skillopt-predicate-first-requirements
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  decodeFinalStatePredicateSnapshot,
  FinalStateReceiptSchema,
} from "../runtime/final-state";

const spies: Array<{ mockRestore: () => void }> = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  if (process.exitCode === 1) process.exitCode = 0;
});

const HASH = "a".repeat(64);

const binding = {
  caseId: "deny-polarity",
  roots: {
    publicManifestHash: HASH,
    workspaceHash: HASH,
    fixtureSeedHash: HASH,
  },
  sequence: 1,
};

function resultHash(result: unknown): string {
  return createHash("sha256").update(JSON.stringify(result)).digest("hex");
}

function snapshot(entities: unknown[], extras: Record<string, unknown> = {}) {
  const result = {
    structuredContent: { entities },
  };
  return {
    schemaVersion: "1.0.0",
    workspaceRoot: "/tmp/ws",
    binding,
    requests: [
      {
        tool: "kb_query",
        args: {},
        result,
        resultHash: resultHash(result),
      },
    ],
    ...extras,
  };
}

describe("final-state remaining fact targets and decode errors", () => {
  test("decodes rule facts, empty property values, and non-zod decode failures", () => {
    const decoded = decodeFinalStatePredicateSnapshot(
      JSON.stringify(
        snapshot([
          {
            type: "req",
            id: "REQ-1",
            requires_rule: "FACT-RULE",
            requires_property: "FACT-EMPTY",
            constrains: "FACT-SCHEMA",
          },
          {
            type: "fact",
            id: "FACT-RULE",
            fact_kind: "rule",
            rule_name: "retain-window",
          },
          {
            type: "fact",
            id: "FACT-SCHEMA",
            fact_kind: "rule_schema",
            rule_name: "schema-one",
          },
          {
            type: "fact",
            id: "FACT-EMPTY",
            fact_kind: "property_value",
            property_key: "count",
          },
        ]),
      ),
      binding,
    );
    expect(decoded.facts.some((fact) => fact.id === "FACT-RULE")).toBe(true);

    const parse = spyOn(FinalStateReceiptSchema, "parse").mockImplementation(
      () => {
        throw new TypeError("unexpected decoder");
      },
    );
    spies.push(parse);
    expect(() =>
      decodeFinalStatePredicateSnapshot(
        JSON.stringify(snapshot([{ type: "fact", id: "FACT-X" }])),
        binding,
      ),
    ).toThrow("unexpected decoder");
  });
});
