import { describe, expect, test } from "bun:test";
import { loadKbExtractionResults } from "../../../src/public/impact/full-kb-quality.js";

const CAPACITY = "Query exceeded bounded Prolog output capacity (ENOBUFS)";

type Row = Record<string, unknown>;
type Page = { entities: readonly Row[]; count: number };
type Answer = {
  success: boolean;
  bindings: Record<string, string>;
  error?: string;
};

function row(id: string, extra: Row = {}): Row {
  return {
    id,
    type: "req",
    title: id,
    status: "active",
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
    source: `docs/${id}.md`,
    ...extra,
  };
}

const noRelationships = async (): Promise<Answer> => ({
  success: true,
  bindings: { Rels: "[]" },
});

function indexed(
  pages: (input: { limit: number; offset: number }) => Page,
  query: (goal: string) => Promise<Answer> = noRelationships,
) {
  return {
    query,
    queryEntities: async (input: { limit?: number; offset?: number }) =>
      pages({ limit: input.limit ?? 0, offset: input.offset ?? 0 }),
  } as unknown as Parameters<typeof loadKbExtractionResults>[0];
}

describe("loadKbExtractionResults indexed projection", () => {
  test("copies the semantic, verification and predicate fields it knows", async () => {
    const [result] = await loadKbExtractionResults(
      indexed(() => ({
        count: 1,
        entities: [
          row("REQ-1", {
            semantic_inventory_version: "kibi.semantic-inventory.v1",
            semantic_source_field: "title",
            semantic_source_hash: "sha256:abc",
            semantic_inventory: [{ clause: "x" }],
            verification_perspective: "consumer",
            operator: "eq",
            value_type: "int",
            polarity: "assert",
          }),
        ],
      })),
    );
    expect(result?.entity).toMatchObject({
      semantic_inventory_version: "kibi.semantic-inventory.v1",
      semantic_source_field: "title",
      semantic_source_hash: "sha256:abc",
      semantic_inventory: [{ clause: "x" }],
      verification_perspective: "consumer",
      operator: "eq",
      value_type: "int",
      polarity: "assert",
    });
  });

  test("halves the page size when a page overflows the output capacity", async () => {
    const sizes: number[] = [];
    const results = await loadKbExtractionResults(
      indexed(({ limit, offset }) => {
        sizes.push(limit);
        if (limit > 8) throw new Error(CAPACITY);
        return {
          count: 3,
          entities: [row("REQ-a"), row("REQ-b"), row("REQ-c")].slice(
            offset,
            offset + limit,
          ),
        };
      }),
    );
    expect(sizes).toStrictEqual([32, 16, 8]);
    expect(results.map((result) => result.entity.id)).toStrictEqual([
      "REQ-a",
      "REQ-b",
      "REQ-c",
    ]);
  });

  test("refuses pages it cannot trust", async () => {
    const refuse = (pages: Parameters<typeof indexed>[0], message: string) =>
      expect(loadKbExtractionResults(indexed(pages))).rejects.toThrow(message);
    await refuse(() => {
      throw new Error("engine down");
    }, "engine down");
    await refuse(() => {
      throw "plain failure";
    }, "plain failure");
    let calls = 0;
    await refuse(() => {
      calls++;
      throw new Error(CAPACITY);
    }, CAPACITY);
    expect(calls).toBe(6);
    await refuse(
      () => ({ count: -1, entities: [] }),
      "returned an inconsistent count",
    );
    await refuse(
      ({ offset }) => ({
        count: offset === 0 ? 40 : 41,
        entities:
          offset === 0
            ? Array.from({ length: 32 }, (_, i) => row(`R${i}`))
            : [],
      }),
      "returned an inconsistent count",
    );
    await refuse(
      () => ({
        count: 40,
        entities: Array.from({ length: 33 }, (_, i) => row(`R${i}`)),
      }),
      "returned an oversized page",
    );
    await refuse(
      () => ({ count: 1, entities: [row("REQ-x", { type: "" })] }),
      "returned a malformed entity row",
    );
    await refuse(
      () => ({ count: 2, entities: [row("REQ-x"), row("REQ-x")] }),
      "returned duplicate entity ID: REQ-x",
    );
    await refuse(
      () => ({ count: 1, entities: [row("REQ-x"), row("REQ-y")] }),
      "returned more rows than its count",
    );
    await refuse(
      () => ({ count: 2, entities: [row("REQ-x")] }),
      "returned an incomplete page",
    );
  });

  test("a failed relationship query names its relationship type", async () => {
    await expect(
      loadKbExtractionResults(
        indexed(
          () => ({ count: 0, entities: [] }),
          async () => ({ success: false, bindings: {}, error: "no table" }),
        ),
      ),
    ).rejects.toThrow("Full KB relationship projection query failed for ");
    await expect(
      loadKbExtractionResults(
        indexed(
          () => ({ count: 0, entities: [] }),
          async () => ({ success: false, bindings: {} }),
        ),
      ),
    ).rejects.toThrow(": Unknown error");
  });
});

function bounded(ids: string | undefined, batch: (goal: string) => Answer) {
  return {
    query: async (goal: string): Promise<Answer> => {
      if (goal === "findall(Id, kb_entity(Id, _, _), Ids)")
        return {
          success: true,
          bindings: ids === undefined ? {} : { Ids: ids },
        };
      if (goal.includes("kb_entity")) return batch(goal);
      return { success: true, bindings: { Rels: "[]" } };
    },
  };
}

const entityRow = (id: string, type = "req") =>
  `['${id}',${type},[title='${id}',status=active,source='docs/${id}.md']]`;

describe("loadKbExtractionResults bounded projection", () => {
  const refuse = (prolog: ReturnType<typeof bounded>, message: string) =>
    expect(loadKbExtractionResults(prolog)).rejects.toThrow(message);

  test("refuses an ID enumeration it cannot trust", async () => {
    await refuse(
      bounded(undefined, () => ({ success: true, bindings: {} })),
      "Full KB entity ID enumeration query returned no Ids binding",
    );
    await refuse(
      bounded("'REQ-a'", () => ({ success: true, bindings: {} })),
      "Full KB entity ID enumeration returned malformed data",
    );
  });

  test("refuses an entity batch it cannot trust", async () => {
    await refuse(
      bounded("['REQ-a']", () => ({
        success: false,
        bindings: {},
        error: "bad goal",
      })),
      "Full KB bounded entity projection query failed: bad goal",
    );
    await refuse(
      bounded("['REQ-a']", () => ({ success: false, bindings: {} })),
      "Full KB bounded entity projection query failed: Unknown error",
    );
    await refuse(
      bounded("['REQ-a']", () => ({ success: true, bindings: {} })),
      "Full KB bounded entity projection query returned no Results binding",
    );
    await refuse(
      bounded("['REQ-a','REQ-a']", () => ({
        success: true,
        bindings: { Results: "[]" },
      })),
      "returned duplicate or empty requested IDs",
    );
    await refuse(
      bounded("['REQ-a']", () => ({
        success: true,
        bindings: { Results: `[${entityRow("", "req")}]` },
      })),
      "returned a malformed entity row",
    );
    await refuse(
      bounded("['REQ-a']", () => ({
        success: true,
        bindings: { Results: `[${entityRow("REQ-b")}]` },
      })),
      "returned an unexpected entity ID: REQ-b",
    );
    await refuse(
      bounded("['REQ-a','REQ-b']", () => ({
        success: true,
        bindings: { Results: `[${entityRow("REQ-a")}]` },
      })),
      "returned an incomplete page; missing REQ-b",
    );
  });
});
