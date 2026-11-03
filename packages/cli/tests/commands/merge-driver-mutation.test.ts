// implements REQ-cli-kb-merge-driver
import { describe, expect, test } from "bun:test";
import {
  canonical,
  mergeKbManifests,
} from "../../src/commands/merge-driver.js";

const merged = (content: string) => ({ status: "merged", content });
const conflict = (...conflicts: string[]) => ({
  status: "conflict",
  conflicts,
});

/** A symbols manifest of the given records, one YAML mapping each. */
function symbols(...records: Record<string, unknown>[]): string {
  if (records.length === 0) return "symbols: []\n";
  const lines = ["symbols:"];
  for (const record of records) {
    Object.entries(record).forEach(([key, value], index) => {
      lines.push(
        `${index === 0 ? "  - " : "    "}${key}: ${JSON.stringify(value)}`,
      );
    });
  }
  return `${lines.join("\n")}\n`;
}

/** The merged record list, parsed back. */
function records(content: string): unknown {
  return (Bun.YAML.parse(content) as { symbols: unknown }).symbols;
}

function mergeRecords(
  base: Record<string, unknown>[] | null,
  ours: Record<string, unknown>,
  theirs: Record<string, unknown>,
) {
  const result = mergeKbManifests(
    base === null ? symbols() : symbols(...base),
    symbols(ours),
    symbols(theirs),
  );
  return result.status === "merged" ? records(result.content) : result;
}

describe("canonical", () => {
  test("writes arrays, sorted objects and scalars", () => {
    expect(canonical([1, "a", null])).toBe('[1,"a",null]');
    expect(canonical({ b: 1, a: [2], c: undefined, d: { z: 1, y: 2 } })).toBe(
      '{"a":[2],"b":1,"d":{"y":2,"z":1}}',
    );
    expect(canonical({ b: 1, a: 2 })).toBe(canonical({ a: 2, b: 1 }));
    expect(canonical({ a: 1, a2: 1, b: 1 })).toBe('{"a":1,"a2":1,"b":1}');
    expect(canonical({ b: 1, a2: 1, a: 1 })).toBe('{"a":1,"a2":1,"b":1}');
    expect(canonical({})).toBe("{}");
    expect(canonical([])).toBe("[]");
    expect(canonical(undefined)).toBe("undefined");
    expect(canonical(null)).toBe("null");
    expect(canonical(0)).toBe("0");
    expect(canonical("")).toBe('""');
  });
});

describe("parsing each side", () => {
  test("names the first YAML error", () => {
    const result = mergeKbManifests("a: [", "{}\n", "{}\n");
    expect(result.status).toBe("conflict");
    const [message] = (result as { conflicts: string[] }).conflicts;
    expect(message?.startsWith("base: not valid YAML (")).toBe(true);
    expect(message?.endsWith(")")).toBe(true);
    expect(message?.length).toBeGreaterThan("base: not valid YAML ()".length);
  });

  test("refuses a scalar or list top level", () => {
    expect(mergeKbManifests("hello\n", "- 1\n", "{}\n")).toStrictEqual(
      conflict(
        "base: top level is not a mapping",
        "ours: top level is not a mapping",
      ),
    );
  });

  test("refuses list entries without a non-empty string id", () => {
    for (const entry of [
      '  - id: ""\n',
      "  - id: 3\n",
      "  - plain\n",
      "  - title: x\n",
    ]) {
      expect(
        mergeKbManifests(symbols(), `symbols:\n${entry}`, symbols()),
      ).toStrictEqual(conflict("ours: symbols entry without a string id"));
    }
  });

  test("refuses a duplicate id", () => {
    expect(
      mergeKbManifests(symbols(), symbols(), symbols({ id: "A" }, { id: "A" })),
    ).toStrictEqual(conflict("theirs: duplicate id A"));
  });

  test("refuses a list key whose value is not a list", () => {
    for (const value of ["", "5", "{ a: 1 }"])
      expect(
        mergeKbManifests(symbols(), `symbols: ${value}\n`, symbols()),
      ).toStrictEqual(conflict("ours: symbols is not a list"));
  });
});

describe("top-level fields", () => {
  test("takes theirs in place when only they changed", () => {
    expect(
      mergeKbManifests(
        "version: 1\nkind: x\nsymbols: []\n",
        "version: 1\nkind: x\nsymbols: []\n",
        "kind: x\nversion: 2\nsymbols: []\n",
      ),
    ).toStrictEqual(merged("version: 2\nkind: x\nsymbols: []\n"));
  });

  test("drops a field only they removed and keeps one only we changed", () => {
    expect(
      mergeKbManifests(
        "version: 1\nkind: x\nsymbols: []\n",
        "version: 1\nkind: x\nsymbols: []\n",
        "kind: x\nsymbols: []\n",
      ),
    ).toStrictEqual(merged("kind: x\nsymbols: []\n"));
    expect(
      mergeKbManifests(
        "version: 1\nsymbols: []\n",
        "version: 3\nsymbols: []\n",
        "version: 1\nsymbols: []\n",
      ),
    ).toStrictEqual(merged("version: 3\nsymbols: []\n"));
  });

  test("keeps a field both sides changed alike", () => {
    expect(
      mergeKbManifests("version: 1\n", "version: 2\n", "version: 2\n"),
    ).toStrictEqual(merged("version: 2\n"));
  });

  test("merges a manifest without a list as its fields", () => {
    expect(
      mergeKbManifests("version: 1\n", "version: 1\n", "version: 2\n"),
    ).toStrictEqual(merged("version: 2\n"));
  });
});

describe("records", () => {
  test("adds a list ours lacks from theirs", () => {
    expect(
      mergeKbManifests(
        "version: 1\n",
        "version: 1\n",
        "version: 1\nsymbols:\n  - id: X\n",
      ),
    ).toStrictEqual(merged("version: 1\nsymbols:\n  - id: X\n"));
  });

  test("keeps the style of our list", () => {
    expect(
      mergeKbManifests(symbols(), symbols(), symbols({ id: "X" })),
    ).toStrictEqual(merged(`symbols: [ { id: "X" } ]\n`));
  });

  test("honours their deletion of a record we left alone", () => {
    expect(
      mergeKbManifests(symbols({ id: "A" }), symbols({ id: "A" }), "{}\n"),
    ).toStrictEqual(merged("symbols: []\n"));
  });

  test("keeps records only one side added, ours first", () => {
    expect(mergeRecords(null, { id: "A" }, { id: "B" })).toStrictEqual([
      { id: "A" },
      { id: "B" },
    ]);
  });

  test("conflicts on a deletion against an edit either way", () => {
    expect(
      mergeKbManifests(
        symbols({ id: "A", v: 1 }, { id: "B", v: 1 }),
        symbols({ id: "A", v: 2 }),
        symbols({ id: "B", v: 2 }),
      ),
    ).toStrictEqual(
      conflict(
        "A: changed on ours but deleted on theirs",
        "B: deleted on ours but changed on theirs",
      ),
    );
  });

  test("drops a record both sides deleted or one deleted unchanged", () => {
    expect(
      mergeKbManifests(
        symbols({ id: "A" }, { id: "B" }, { id: "C" }),
        symbols({ id: "B" }),
        symbols({ id: "C" }),
      ),
    ).toStrictEqual(merged("symbols: []\n"));
  });

  test("takes the one side that edited a record", () => {
    const base = [{ id: "A", v: 1 }];
    expect(
      mergeRecords(base, { id: "A", v: 2 }, { id: "A", v: 1 }),
    ).toStrictEqual([{ id: "A", v: 2 }]);
    expect(
      mergeRecords(base, { id: "A", v: 1 }, { id: "A", v: 3 }),
    ).toStrictEqual([{ id: "A", v: 3 }]);
    expect(
      mergeRecords(base, { id: "A", v: 4 }, { id: "A", v: 4 }),
    ).toStrictEqual([{ id: "A", v: 4 }]);
  });

  test("merges fields of a record both sides edited", () => {
    expect(
      mergeRecords(
        [{ id: "A", a: 1, b: 1, c: 1, gone: 1 }],
        { id: "A", a: 2, b: 1, c: 5, mine: 1 },
        { id: "A", a: 1, b: 3, c: 5, theirs: 1, gone: 1 },
      ),
    ).toStrictEqual([{ id: "A", a: 2, b: 3, c: 5, mine: 1, theirs: 1 }]);
  });

  test("merges fields of a record both sides added differently", () => {
    expect(
      mergeRecords(null, { id: "A", a: 1 }, { id: "A", b: 2 }),
    ).toStrictEqual([{ id: "A", a: 1, b: 2 }]);
    expect(
      mergeRecords(null, { id: "A", a: 1 }, { id: "A", a: 2 }),
    ).toStrictEqual(conflict("A: both sides changed a"));
  });

  test("drops a field one side removed while the other kept it", () => {
    expect(
      mergeRecords(
        [{ id: "A", a: 1, x: 1 }],
        { id: "A", a: 2 },
        { id: "A", a: 1, x: 1 },
      ),
    ).toStrictEqual([{ id: "A", a: 2 }]);
    expect(
      mergeRecords(
        [{ id: "A", a: 1, x: 1 }],
        { id: "A", a: 2, x: 1 },
        { id: "A", a: 1 },
      ),
    ).toStrictEqual([{ id: "A", a: 2 }]);
  });

  test("reports every field both sides changed differently", () => {
    expect(
      mergeRecords(
        [{ id: "A", a: 1, b: 1 }],
        { id: "A", a: 2, b: 2 },
        { id: "A", a: 3, b: 3 },
      ),
    ).toStrictEqual(
      conflict("A: both sides changed a", "A: both sides changed b"),
    );
  });
});

describe("set fields", () => {
  const set = (field: string, base: unknown, ours: unknown, theirs: unknown) =>
    mergeRecords(
      [{ id: "A", t: 0, ...(base === undefined ? {} : { [field]: base }) }],
      { id: "A", t: 1, ...(ours === undefined ? {} : { [field]: ours }) },
      {
        id: "A",
        t: 0,
        u: 1,
        ...(theirs === undefined ? {} : { [field]: theirs }),
      },
    );

  test("union additions and honour removals", () => {
    expect(set("links", ["a", "b"], ["a", "b", "c"], ["a", "d"])).toStrictEqual(
      [{ id: "A", t: 1, links: ["a", "c", "d"], u: 1 }],
    );
    expect(
      set("relationships", ["a", "b"], ["a"], ["a", "b", "c", "c"]),
    ).toStrictEqual([{ id: "A", t: 1, relationships: ["a", "c"], u: 1 }]);
  });

  test("treat a missing set as empty", () => {
    expect(set("links", ["a"], undefined, ["a", "b"])).toStrictEqual([
      { id: "A", t: 1, links: ["b"], u: 1 },
    ]);
    expect(set("links", undefined, ["x"], ["y"])).toStrictEqual([
      { id: "A", t: 1, links: ["x", "y"], u: 1 },
    ]);
  });

  test("conflict for other fields or non-list values", () => {
    expect(set("tags", ["a"], ["a", "b"], ["c"])).toStrictEqual(
      conflict("A: both sides changed tags"),
    );
    expect(set("links", ["a"], "b", ["c"])).toStrictEqual(
      conflict("A: both sides changed links"),
    );
    expect(set("links", "a", ["b"], ["c"])).toStrictEqual(
      conflict("A: both sides changed links"),
    );
  });
});

describe("record nodes", () => {
  const base = "symbols:\n  - id: A\n    v: 1\n";

  test("keeps our node when both sides made the same edit", () => {
    expect(
      mergeKbManifests(
        base,
        "symbols:\n  - id: A\n    v: 2 # ours\n",
        "symbols:\n  - id: A\n    v: 2 # theirs\n",
      ),
    ).toStrictEqual(merged("symbols:\n  - id: A\n    v: 2 # ours\n"));
  });

  test("keeps our node when only we edited it", () => {
    expect(
      mergeKbManifests(base, "symbols:\n  - id: A\n    v: 2 # ours\n", base),
    ).toStrictEqual(merged("symbols:\n  - id: A\n    v: 2 # ours\n"));
  });

  test("takes their node when only they edited it", () => {
    expect(
      mergeKbManifests(base, base, "symbols:\n  - id: A\n    v: 3 # theirs\n"),
    ).toStrictEqual(merged("symbols:\n  - id: A\n    v: 3 # theirs\n"));
  });
});
