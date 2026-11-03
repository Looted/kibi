import { describe, expect, test } from "bun:test";
import { persistEntities } from "../../src/commands/sync/persistence.js";
import type {
  ExtractedEntity,
  ExtractionResult,
} from "../../src/extractors/markdown.js";
import type { PrologProcess } from "../../src/prolog.js";

function entity(overrides: Partial<ExtractedEntity>): ExtractionResult {
  return {
    entity: {
      id: "REQ-001",
      type: "req",
      title: "Title",
      status: "open",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      source: ".kb/requirements/REQ-001.md",
      ...overrides,
    } as ExtractedEntity,
    relationships: [],
  };
}

async function goalsFor(results: ExtractionResult[]): Promise<string[]> {
  const goals: string[] = [];
  const prolog = {
    query: async (goal: string) => {
      goals.push(goal);
      return { success: true, bindings: {} };
    },
  } as unknown as PrologProcess;
  const outcome = await persistEntities(prolog, results, new Set(), {
    loadExistingEntityIds: false,
  });
  expect(outcome).toStrictEqual({
    entityCount: results.length,
    kbModified: true,
  });
  return goals;
}

describe("persistEntities optional property serialization", () => {
  test("serializes decision, evidence, exemption and origin properties", async () => {
    const [req, scenario] = await goalsFor([
      entity({
        firmness: "firm",
        required_evidence: "proved",
        exempts_claims: ["claim_a", "claim_b"],
        origin: { kind: "human", ref: "PR-1" },
      } as Partial<ExtractedEntity>),
      entity({
        id: "SCEN-001",
        type: "scenario",
        expects: "rejection",
      } as Partial<ExtractedEntity>),
    ]);
    expect(req).toContain("firmness=firm");
    expect(req).toContain("required_evidence=proved");
    expect(req).toContain("exempts_claims=[claim_a,claim_b]");
    expect(req).toContain(
      `origin=${JSON.stringify(JSON.stringify({ kind: "human", ref: "PR-1" }))}`,
    );
    expect(scenario).toContain("expects=rejection");
  });

  test("serializes typed fact vocabularies as JSON strings", async () => {
    const [fact] = await goalsFor([
      entity({
        id: "FACT-001",
        type: "fact",
        argument_constants: { role: ["admin", "user"] },
      } as Partial<ExtractedEntity>),
    ]);
    expect(fact).toContain(
      `argument_constants=${JSON.stringify(JSON.stringify({ role: ["admin", "user"] }))}`,
    );
  });
});
