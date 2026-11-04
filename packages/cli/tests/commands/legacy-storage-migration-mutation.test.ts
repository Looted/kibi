import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";
import fg from "fast-glob";
import {
  type StorageMigrationPlan,
  applyLegacyStorageMigration,
  missingCanonicalLanes,
  needsLegacyStorageMigration,
  planLegacyStorageMigration,
  rewritePendingSourceReceiptPaths,
  writeMovedSourceReceipts,
} from "../../src/commands/legacy-storage-migration.js";
import { LATEST_KB_SCHEMA_VERSION } from "../../src/utils/schema-version.js";
import {
  createGitWorkspace,
  createTempDir,
  git,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

// The legacy-layout migration against temporary workspaces: planning,
// destination classification, application, receipts and pruning.

let root: string;
let restores: Array<() => void>;

beforeEach(() => {
  root = createTempDir("kibi-legacy-mig-");
  restores = [];
  const log = spyOn(console, "log").mockImplementation(() => {});
  restores.push(() => log.mockRestore());
});

afterEach(() => {
  for (const restore of restores.reverse()) restore();
  removeTempDir(root);
});

function put(relative: string, content = "content\n"): void {
  const file = path.join(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function config(value: unknown): void {
  put(".kb/config.json", JSON.stringify(value));
}

const read = (relative: string) =>
  readFileSync(path.join(root, relative)).toString();
const exists = (relative: string) => existsSync(path.join(root, relative));
const sha = (content: string) =>
  createHash("sha256").update(content).digest("hex");

function emptyPlan(overrides: Partial<StorageMigrationPlan> = {}) {
  return {
    moves: [],
    legacyConfig: "absent",
    schemaVersion: null,
    semanticAdvisorBackfill: null,
    removals: [],
    conflicts: [],
    blockers: [],
    ...overrides,
  } satisfies StorageMigrationPlan;
}

describe("planning", () => {
  test("reports a malformed config without guessing paths", () => {
    put(".kb/config.json", "{broken");
    put("documentation/requirements/REQ-1.md");
    const plan = planLegacyStorageMigration(root);
    expect(plan).toEqual({
      moves: [],
      legacyConfig: "malformed",
      legacyConfigError: expect.any(String),
      schemaVersion: null,
      semanticAdvisorBackfill: null,
      removals: [],
      conflicts: [],
      blockers: [
        `Legacy .kb/config.json is malformed (${plan.legacyConfigError}). Repair the JSON or provide an explicit recovery/migration override; Kibi will not infer default legacy paths.`,
      ],
    });
  });

  test("plans nothing for an empty workspace", () => {
    expect(planLegacyStorageMigration(root)).toEqual(emptyPlan());
  });

  test("moves default lanes, skipping READMEs, e2e and benchmark trees", () => {
    put("documentation/requirements/b.md");
    put("documentation/requirements/a.md");
    put("documentation/requirements/nested/c.md");
    put("documentation/requirements/README.md");
    put("documentation/requirements/e2e/skip.md");
    put("documentation/requirements/benchmarks/skip.md");
    put("documentation/requirements/notes.txt");
    put("documentation/adr/ADR-1.md");
    const plan = planLegacyStorageMigration(root);
    expect(plan.moves).toEqual([
      {
        from: "documentation/requirements/a.md",
        to: ".kb/requirements/a.md",
        lane: "requirements",
      },
      {
        from: "documentation/requirements/b.md",
        to: ".kb/requirements/b.md",
        lane: "requirements",
      },
      {
        from: "documentation/requirements/nested/c.md",
        to: ".kb/requirements/nested/c.md",
        lane: "requirements",
      },
      {
        from: "documentation/adr/ADR-1.md",
        to: ".kb/adr/ADR-1.md",
        lane: "adr",
      },
    ]);
    expect(plan.legacyConfig).toBe("absent");
  });

  test("sorts globbed files and keeps only files", () => {
    put("docs/req/one.md");
    mkdirSync(path.join(root, "docs/req/dir.md"));
    config({ paths: { requirements: "docs\\req\\*.md" } });
    const sync = spyOn(fg, "sync");
    restores.push(() => sync.mockRestore());
    const plan = planLegacyStorageMigration(root);
    expect(plan.moves.map((move) => move.from)).toEqual(["docs/req/one.md"]);
    expect(sync.mock.calls[0]?.[0]).toEqual(["docs/req/*.md"]);
    sync.mockReturnValueOnce([
      path.join(root, "docs/req/z.md"),
      path.join(root, "docs/req/a.md"),
    ]);
    expect(
      planLegacyStorageMigration(root).moves.map((move) => move.to),
    ).toEqual([".kb/requirements/a.md", ".kb/requirements/z.md"]);
  });

  test("uses the text before a wildcard as the lane root", () => {
    put("docs/req/sub/one.md");
    config({ paths: { requirements: "docs/req//**/*.md" } });
    expect(planLegacyStorageMigration(root).moves).toEqual([
      {
        from: "docs/req/sub/one.md",
        to: ".kb/requirements/sub/one.md",
        lane: "requirements",
      },
    ]);
  });

  test("skips lanes already in the canonical location or missing", () => {
    put(".kb/requirements/REQ-1.md");
    config({ paths: { requirements: ".kb/requirements", tests: "missing" } });
    const plan = planLegacyStorageMigration(root);
    expect(plan.moves).toEqual([]);
    expect(plan.removals).toEqual([]);
  });

  test("carries the legacy lifecycle metadata", () => {
    config({ schemaVersion: 3, semanticAdvisorBackfill: "completed" });
    const plan = planLegacyStorageMigration(root);
    expect(plan.legacyConfig).toBe("present");
    expect(plan.schemaVersion).toBe(3);
    expect(plan.semanticAdvisorBackfill).toBe("completed");
    config({ schemaVersion: "3" });
    expect(planLegacyStorageMigration(root).schemaVersion).toBeNull();
  });

  test("moves the symbols manifest and its coordinates", () => {
    put("documentation/symbols.yaml", "symbols: []\n");
    put("documentation/symbol-coordinates.yaml", "coordinates: {}\n");
    expect(planLegacyStorageMigration(root).moves).toEqual([
      {
        from: "documentation/symbols.yaml",
        to: ".kb/symbols.yaml",
        lane: "symbols",
      },
      {
        from: "documentation/symbol-coordinates.yaml",
        to: ".kb/symbol-coordinates.yaml",
        lane: "symbols",
      },
    ]);
  });

  test("derives the coordinates name from a .yml manifest", () => {
    put("x.yml.d/symbols.yml", "symbols: []\n");
    put("x.yml.d/symbol-coordinates.yaml", "coordinates: {}\n");
    config({ paths: { symbols: "x.yml.d/symbols.yml" } });
    expect(
      planLegacyStorageMigration(root).moves.map((move) => move.from),
    ).toEqual(["x.yml.d/symbols.yml", "x.yml.d/symbol-coordinates.yaml"]);
  });

  test("anchors the coordinates name at the end of the path", () => {
    put("symbols.yaml.d/symbols.yaml", "symbols: []\n");
    put("symbols.yaml.d/symbol-coordinates.yaml", "coordinates: {}\n");
    config({ symbolsManifest: "symbols.yaml.d/symbols.yaml" });
    expect(
      planLegacyStorageMigration(root).moves.map((move) => move.from),
    ).toEqual([
      "symbols.yaml.d/symbols.yaml",
      "symbols.yaml.d/symbol-coordinates.yaml",
    ]);
  });

  test("does not move a manifest that is already canonical", () => {
    put(".kb/symbols.yaml", "symbols: [{id: A}]\n");
    put(".kb/symbol-coordinates.yaml", "coordinates: {}\n");
    config({ paths: { symbols: ".kb/symbols.yaml" } });
    const plan = planLegacyStorageMigration(root);
    expect(plan.moves).toEqual([]);
    expect(plan.removals).toEqual([]);
    expect(plan.conflicts).toEqual([]);
  });

  test("ignores a same-file duplicate and blocks two sources for one target", () => {
    put("docs/req/a.md");
    config({ paths: { requirements: "docs/req/*.md" } });
    const sync = spyOn(fg, "sync").mockReturnValue([
      path.join(root, "docs/req/a.md"),
      path.join(root, "docs/req/x/../a.md"),
    ] as never);
    restores.push(() => sync.mockRestore());
    expect(planLegacyStorageMigration(root).blockers).toEqual([]);

    put("docs/symbols.yaml", "symbols: []\n");
    put("custom.yaml", "symbols: []\n");
    config({
      paths: { requirements: "docs/req/*.md", symbols: "custom.yaml" },
    });
    sync.mockReturnValue([path.join(root, "docs/symbols.yaml")] as never);
    const plan = planLegacyStorageMigration(root);
    expect(plan.moves.map((move) => move.from)).toEqual([
      "docs/symbols.yaml",
      "custom.yaml",
    ]);
    expect(plan.blockers).toEqual([
      "Both docs/symbols.yaml and custom.yaml would migrate to .kb/symbols.yaml.",
    ]);
  });
});

describe("destination classification", () => {
  test("removes an identical copy and replaces an empty seeded manifest", () => {
    put("documentation/requirements/REQ-1.md", "same\n");
    put(".kb/requirements/REQ-1.md", "same\n");
    put("documentation/symbols.yaml", "symbols:\n  - id: A\n");
    put(".kb/symbols.yaml", "# seeded\n\n  symbols: [ ]  \r\n");
    const plan = planLegacyStorageMigration(root);
    expect(plan.removals).toEqual([
      {
        path: "documentation/requirements/REQ-1.md",
        duplicateOf: ".kb/requirements/REQ-1.md",
      },
    ]);
    expect(plan.moves).toEqual([
      {
        from: "documentation/symbols.yaml",
        to: ".kb/symbols.yaml",
        lane: "symbols",
      },
    ]);
    expect(plan.blockers).toEqual([]);
  });

  test.each([
    ["symbols: []\nother: 1\n"],
    ["xsymbols: []\n"],
    ["symbols: [] x\n"],
    ["symbols: [ a ]\n"],
    ["symbols:[]\n"],
  ])("treats %p as a real manifest", (content) => {
    put("documentation/symbols.yaml", "symbols:\n  - id: A\n");
    put(".kb/symbols.yaml", content);
    const plan = planLegacyStorageMigration(root);
    if (content === "symbols:[]\n") {
      expect(plan.conflicts).toEqual([]);
      return;
    }
    expect(plan.conflicts.map((conflict) => conflict.kind)).toEqual([
      "conflict",
    ]);
  });

  test("never treats a lane document as a seeded manifest", () => {
    put("documentation/requirements/REQ-1.md", "real\n");
    put(".kb/requirements/REQ-1.md", "symbols: []\n");
    const plan = planLegacyStorageMigration(root);
    expect(plan.moves).toEqual([
      {
        from: "documentation/requirements/REQ-1.md",
        to: ".kb/requirements/REQ-1.md",
        lane: "requirements",
      },
    ]);
    expect(plan.conflicts).toEqual([
      {
        from: "documentation/requirements/REQ-1.md",
        to: ".kb/requirements/REQ-1.md",
        kind: "conflict",
        resolution:
          "Destination .kb/requirements/REQ-1.md already exists with different content than documentation/requirements/REQ-1.md. Compare them and keep the current one: replace .kb/requirements/REQ-1.md when the legacy copy is newer, or remove (git rm) documentation/requirements/REQ-1.md when it is a stale duplicate.",
      },
    ]);
    expect(plan.blockers).toEqual([plan.conflicts[0]?.resolution]);
  });

  test("names a stale subset of the symbols manifest", () => {
    put(
      "documentation/symbols.yaml",
      "symbols:\n  - id: A\n  - null\n  - 7\n  - {id: 3}\n",
    );
    put(".kb/symbols.yaml", "symbols:\n  - id: A\n  - id: B\n");
    expect(planLegacyStorageMigration(root).conflicts).toEqual([
      {
        from: "documentation/symbols.yaml",
        to: ".kb/symbols.yaml",
        kind: "stale_subset",
        resolution:
          "The legacy copy documentation/symbols.yaml is a stale subset of .kb/symbols.yaml: every symbol it declares (1) is already there. Remove it (git rm documentation/symbols.yaml); Kibi removes only a copy identical to its destination.",
      },
    ]);
  });

  test.each([
    ["symbols:\n  - id: C\n", "symbols:\n  - id: A\n"],
    ["{unclosed\n", "symbols:\n  - id: A\n"],
    ["", "symbols:\n  - id: A\n"],
    ["symbols: {}\n", "symbols:\n  - id: A\n"],
    ["symbols:\n  - id: A\n", "symbols: 5\n"],
  ])("reports %p over %p as a conflict", (legacy, current) => {
    put("documentation/symbols.yaml", legacy);
    put(".kb/symbols.yaml", current);
    expect(
      planLegacyStorageMigration(root).conflicts.map(
        (conflict) => conflict.kind,
      ),
    ).toEqual(["conflict"]);
  });

  test("reports unreadable copies as a conflict", () => {
    mkdirSync(path.join(root, "docs/symdir"), { recursive: true });
    mkdirSync(path.join(root, ".kb/symbols.yaml"), { recursive: true });
    config({ paths: { symbols: "docs/symdir" } });
    expect(
      planLegacyStorageMigration(root).conflicts.map(
        (conflict) => conflict.kind,
      ),
    ).toEqual(["conflict"]);
  });

  test("names a generated coordinates copy", () => {
    put("documentation/symbol-coordinates.yaml", "symbols:\n  - id: A\n");
    put(".kb/symbol-coordinates.yaml", "symbols:\n  - id: A\n  - id: B\n");
    expect(planLegacyStorageMigration(root).conflicts).toEqual([
      {
        from: "documentation/symbol-coordinates.yaml",
        to: ".kb/symbol-coordinates.yaml",
        kind: "generated",
        resolution:
          "documentation/symbol-coordinates.yaml is a generated coordinates file and .kb/symbol-coordinates.yaml already exists. Keep .kb/symbol-coordinates.yaml and remove the legacy copy (git rm documentation/symbol-coordinates.yaml); kibi sync --refresh-symbol-coordinates regenerates coordinates.",
      },
    ]);
  });
});

describe("symbols manifest source", () => {
  test("a configured manifest wins", () => {
    put("lanes/symbols.yaml", "symbols: []\n");
    put("documentation/symbols.yaml", "symbols: []\n");
    put("custom.yaml", "symbols: []\n");
    config({
      paths: { requirements: "lanes/req", symbols: "custom.yaml" },
      symbolsManifest: "ignored.yaml",
    });
    expect(planLegacyStorageMigration(root).moves).toEqual([
      { from: "custom.yaml", to: ".kb/symbols.yaml", lane: "symbols" },
    ]);
  });

  test("a blank configured manifest counts as unset", () => {
    put("lanes/symbols.yaml", "symbols: []\n");
    config({ paths: { requirements: "lanes/req", symbols: "  " } });
    expect(planLegacyStorageMigration(root).moves).toEqual([
      { from: "lanes/symbols.yaml", to: ".kb/symbols.yaml", lane: "symbols" },
    ]);
  });

  test("lanes under documentation keep the default manifest", () => {
    put("documentation/symbols.yaml", "symbols: []\n");
    config({
      paths: { requirements: "./documentation/requirements", tests: "tests" },
    });
    expect(planLegacyStorageMigration(root).moves).toEqual([
      {
        from: "documentation/symbols.yaml",
        to: ".kb/symbols.yaml",
        lane: "symbols",
      },
    ]);
  });

  test("moves nothing when no manifest exists", () => {
    config({ paths: { requirements: "lanes/req" } });
    expect(planLegacyStorageMigration(root)).toEqual(
      emptyPlan({ legacyConfig: "present" }),
    );
  });

  test("reports a manifest outside the lane folder as ambiguous", () => {
    put("documentation/symbols.yaml", "symbols: []\n");
    config({ paths: { requirements: "  ./lanes./sub/req  " } });
    expect(planLegacyStorageMigration(root).conflicts).toEqual([
      {
        from: "documentation/symbols.yaml",
        to: ".kb/symbols.yaml",
        kind: "ambiguous",
        resolution:
          "The legacy .kb/config.json places its lanes under lanes./sub but names no symbols manifest, and documentation/symbols.yaml exists outside that folder; Kibi will not guess which one is current. Set paths.symbols in .kb/config.json to the current manifest, or remove (git rm) the stale one, then run kibi migrate --yes.",
      },
    ]);
  });

  test("reports several candidate manifests as ambiguous", () => {
    put("b/symbols.yaml", "symbols: []\n");
    put("a/symbols.yaml", "symbols: []\n");
    config({
      paths: { requirements: "b/req", scenarios: "a/sc", tests: 5, adr: "" },
    });
    const [conflict] = planLegacyStorageMigration(root).conflicts;
    expect(conflict?.from).toBe("a/symbols.yaml, b/symbols.yaml");
    expect(conflict?.resolution).toContain(
      "places its lanes under a, b but names no symbols manifest, and a/symbols.yaml and b/symbols.yaml all exist;",
    );
  });

  test("reports a candidate beside a default manifest as ambiguous", () => {
    put("a/symbols.yaml", "symbols: []\n");
    put("documentation/symbols.yaml", "symbols: []\n");
    config({ paths: { requirements: "a/req" } });
    expect(planLegacyStorageMigration(root).conflicts[0]?.from).toBe(
      "a/symbols.yaml, documentation/symbols.yaml",
    );
  });

  test("uses a single candidate beside its lanes", () => {
    put("a/symbols.yaml", "symbols: []\n");
    config({ paths: { requirements: "a/req", scenarios: "req" } });
    expect(planLegacyStorageMigration(root).moves).toEqual([
      { from: "a/symbols.yaml", to: ".kb/symbols.yaml", lane: "symbols" },
    ]);
  });

  test("normalizes a dotted lane root before taking its parent", () => {
    put("a/symbols.yaml", "symbols: []\n");
    config({ paths: { requirements: "./a/./req" } });
    expect(planLegacyStorageMigration(root).moves).toEqual([
      { from: "a/symbols.yaml", to: ".kb/symbols.yaml", lane: "symbols" },
    ]);
  });
});

describe("applying", () => {
  test("refuses a blocked plan", () => {
    expect(() =>
      applyLegacyStorageMigration(root, emptyPlan({ blockers: ["a.", "b."] })),
    ).toThrow("Legacy storage migration is blocked: a. b.");
  });

  test("moves files, writes the manifest, retires the config and prunes", () => {
    put("documentation/requirements/nested/deep/REQ-1.md", "req\n");
    put("documentation/adr/ADR-1.md", "same\n");
    put(".kb/adr/ADR-1.md", "same\n");
    put("documentation/facts/FACT-1.md", "fact\n");
    put("documentation/facts/keep.txt", "keep\n");
    config({ schemaVersion: 2 });
    put(
      ".kb/recovery/pending-sources/fact.json",
      JSON.stringify({ path: "documentation/facts/FACT-1.md" }),
    );
    const plan = planLegacyStorageMigration(root);
    const result = applyLegacyStorageMigration(root, plan);
    expect(
      JSON.parse(read(".kb/recovery/pending-sources/fact.json")).path,
    ).toBe(".kb/facts/FACT-1.md");
    expect(result).toEqual({
      movedFiles: [
        ".kb/requirements/nested/deep/REQ-1.md",
        ".kb/facts/FACT-1.md",
      ],
      removedFiles: ["documentation/adr/ADR-1.md"],
      untrackedMovedFiles: [],
      retiredLegacyConfig: true,
      manifestPath: ".kb/manifest.json",
      schemaVersion: 2,
      semanticAdvisorBackfill: "pending",
    });
    expect(JSON.parse(read(".kb/manifest.json"))).toMatchObject({
      manifestVersion: expect.any(Number),
      schemaVersion: 2,
      semanticAdvisorBackfill: "pending",
    });
    expect(exists(".kb/config.json")).toBe(false);
    expect(exists("documentation/requirements")).toBe(false);
    expect(exists("documentation/adr")).toBe(false);
    expect(read("documentation/facts/keep.txt")).toBe("keep\n");
    expect(read(".gitignore")).toContain(".kb/branches/");
  });

  test("prunes the deepest directories first", () => {
    put("documentation/requirements/a.md", "a\n");
    put("documentation/requirements/sub/b.md", "b\n");
    applyLegacyStorageMigration(root, planLegacyStorageMigration(root));
    expect(read(".kb/requirements/sub/b.md")).toBe("b\n");
    expect(exists("documentation")).toBe(false);
  });

  test("keeps directories under .kb that a legacy lane used", () => {
    put(".kb/old-req/REQ-1.md", "req\n");
    config({ paths: { requirements: ".kb/old-req" } });
    applyLegacyStorageMigration(root, planLegacyStorageMigration(root));
    expect(read(".kb/requirements/REQ-1.md")).toBe("req\n");
    expect(exists(".kb/old-req")).toBe(true);
  });

  test("tolerates files already moved or removed", () => {
    put("documentation/requirements/REQ-1.md", "req\n");
    put("documentation/adr/ADR-1.md", "same\n");
    put(".kb/adr/ADR-1.md", "same\n");
    const plan = planLegacyStorageMigration(root);
    rmSync(path.join(root, "documentation/requirements/REQ-1.md"));
    rmSync(path.join(root, "documentation/adr/ADR-1.md"));
    const result = applyLegacyStorageMigration(root, plan);
    expect(result.movedFiles).toEqual([]);
    expect(result.removedFiles).toEqual([]);
    expect(result.retiredLegacyConfig).toBe(false);
  });

  test("refuses a removal whose copy changed after planning", () => {
    put("documentation/adr/ADR-1.md", "same\n");
    put(".kb/adr/ADR-1.md", "same\n");
    const plan = planLegacyStorageMigration(root);
    put("documentation/adr/ADR-1.md", "edited\n");
    expect(() => applyLegacyStorageMigration(root, plan)).toThrow(
      "Legacy storage migration is blocked: documentation/adr/ADR-1.md changed since planning and no longer matches .kb/adr/ADR-1.md.",
    );
  });

  test.each([
    [3, 5, 3],
    [5, 3, 3],
    [null, 4, 4],
    [0, null, LATEST_KB_SCHEMA_VERSION],
    [2.5, null, LATEST_KB_SCHEMA_VERSION],
    [null, null, LATEST_KB_SCHEMA_VERSION],
  ])(
    "legacy %p and existing %p record schema %p",
    (legacy, current, expected) => {
      if (current !== null) {
        put(
          ".kb/manifest.json",
          JSON.stringify({
            manifestVersion: 1,
            schemaVersion: current,
            semanticAdvisorBackfill: "completed",
            contextAcknowledged: ["REQ-1"],
          }),
        );
      }
      const result = applyLegacyStorageMigration(
        root,
        emptyPlan({ schemaVersion: legacy }),
      );
      expect(result.schemaVersion).toBe(expected);
      if (current !== null) {
        expect(result.semanticAdvisorBackfill).toBe("completed");
        expect(
          JSON.parse(read(".kb/manifest.json")).contextAcknowledged,
        ).toEqual(["REQ-1"]);
      }
    },
  );

  test("prefers the planned backfill state", () => {
    const result = applyLegacyStorageMigration(
      root,
      emptyPlan({ semanticAdvisorBackfill: "not_applicable" }),
    );
    expect(result.semanticAdvisorBackfill).toBe("not_applicable");
  });
});

describe("pending source receipts", () => {
  const pendingRoot = () => path.join(root, ".kb/recovery/pending-sources");

  function receipt(name: string, body: unknown): string {
    const file = path.join(pendingRoot(), name);
    mkdirSync(pendingRoot(), { recursive: true });
    writeFileSync(file, typeof body === "string" ? body : JSON.stringify(body));
    return file;
  }

  test("does nothing without a pending-sources directory", () => {
    expect(rewritePendingSourceReceiptPaths(root, [])).toBe(0);
  });

  test("rebinds receipts to moved files", () => {
    put(".kb/requirements/REQ-1.md", "req\n");
    put(".kb/tests/TEST-1.md", "test\n");
    put("custom/x.md", "x\n");
    put("subdir/.kb/tests/TEST-1.md", "nested\n");
    const goodHash = "A".repeat(64);
    const mapped = receipt("a.json", {
      path: "lanes\\req\\REQ-1.md",
      afterHash: goodHash,
      extra: 1,
    });
    const fallback = receipt("b.json", {
      path: "documentation/tests/TEST-1.md",
      afterHash: `${"a".repeat(64)}x`,
    });
    const noHash = receipt("c.json", {
      path: "documentation/tests/TEST-1.md",
    });
    const prefixed = receipt("d.json", {
      path: "documentation/tests/TEST-1.md",
      afterHash: `x${"a".repeat(64)}`,
    });
    const short = receipt("e.json", {
      path: "documentation/tests/TEST-1.md",
      afterHash: "a",
    });
    const listed = receipt("l.json", {
      path: "documentation/tests/TEST-1.md",
      afterHash: ["a".repeat(64)],
    });
    const untouched = [
      receipt("f.json", { path: "elsewhere/doc.md" }),
      receipt("g.json", { path: 5 }),
      receipt("h.json", "{broken"),
      receipt("i.json", {
        path: "documentation/missing.md",
        afterHash: goodHash,
      }),
      receipt("j.json", { path: "custom/x.md" }),
      receipt("k.json", { path: "subdir/documentation/tests/TEST-1.md" }),
      receipt(
        "notes.txt",
        JSON.stringify({ path: "documentation/tests/TEST-1.md" }),
      ),
    ];
    const before = untouched.map((file) => readFileSync(file).toString());
    expect(
      rewritePendingSourceReceiptPaths(root, [
        {
          from: "lanes/req/REQ-1.md",
          to: ".kb/requirements/REQ-1.md",
          lane: "requirements",
        },
        { from: "custom/x.md", to: "custom/x.md", lane: "facts" },
      ]),
    ).toBe(6);
    expect(readFileSync(mapped).toString()).toBe(
      `${JSON.stringify(
        { path: ".kb/requirements/REQ-1.md", afterHash: goodHash, extra: 1 },
        null,
        2,
      )}\n`,
    );
    for (const file of [fallback, noHash, prefixed, short, listed]) {
      expect(JSON.parse(readFileSync(file).toString())).toMatchObject({
        path: ".kb/tests/TEST-1.md",
        afterHash: sha("test\n"),
      });
    }
    expect(untouched.map((file) => readFileSync(file).toString())).toEqual(
      before,
    );
  });
});

describe("moved source receipts", () => {
  test("returns nothing outside Git", () => {
    put(".kb/requirements/REQ-1.md");
    expect(
      writeMovedSourceReceipts(root, [
        { from: "a.md", to: ".kb/requirements/REQ-1.md", lane: "requirements" },
      ]),
    ).toEqual([]);
  });

  test("receipts only untracked, readable destinations", () => {
    const repo = createGitWorkspace();
    restores.push(() => removeTempDir(repo));
    const write = (relative: string, content: string) => {
      const file = path.join(repo, relative);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, content);
    };
    for (let index = 0; index < 8; index++) {
      write(`tracked/long-file-name-${index}.md`, "x\n");
    }
    write(".kb/requirements/TRACKED.md", "tracked\n");
    git(repo, "add -A");
    git(repo, "commit -q --no-verify -m tracked");
    write(".kb/requirements/NEW.md", "new\n");
    const moves = [
      { from: "a.md", to: ".kb/requirements/TRACKED.md", lane: "requirements" },
      { from: "b.md", to: ".kb/requirements/NEW.md", lane: "requirements" },
      { from: "c.md", to: ".kb/requirements/GONE.md", lane: "requirements" },
    ] as const;
    expect(writeMovedSourceReceipts(repo, moves)).toEqual([
      ".kb/requirements/NEW.md",
    ]);
    const pendingRoot = path.join(repo, ".kb/recovery/pending-sources");
    const receipts = readdirSync(pendingRoot).map((name) =>
      JSON.parse(readFileSync(path.join(pendingRoot, name)).toString()),
    );
    expect(receipts).toEqual([
      expect.objectContaining({
        path: ".kb/requirements/NEW.md",
        afterHash: sha("new\n"),
      }),
    ]);
  });
});

describe("tracked file listing", () => {
  test("reads an index larger than the default output buffer", () => {
    const repo = createGitWorkspace();
    restores.push(() => removeTempDir(repo));
    const blob = git(repo, "hash-object -w --stdin").trim();
    const entries = Array.from(
      { length: 30_000 },
      (_, index) =>
        `100644 ${blob}\ttracked/a-rather-long-directory-name/entry-${index}.md`,
    );
    entries.push(`100644 ${blob}\t.kb/requirements/TRACKED.md`);
    execFileSync("git", ["-C", repo, "update-index", "--index-info"], {
      input: `${entries.join("\n")}\n`,
    });
    mkdirSync(path.join(repo, ".kb/requirements"), { recursive: true });
    writeFileSync(path.join(repo, ".kb/requirements/TRACKED.md"), "");
    writeFileSync(path.join(repo, ".kb/requirements/NEW.md"), "new\n");
    expect(
      writeMovedSourceReceipts(repo, [
        {
          from: "a.md",
          to: ".kb/requirements/TRACKED.md",
          lane: "requirements",
        },
        { from: "b.md", to: ".kb/requirements/NEW.md", lane: "requirements" },
      ]),
    ).toEqual([".kb/requirements/NEW.md"]);
  });
});

describe("workspace checks", () => {
  test("needs a migration for each kind of legacy state", () => {
    expect(needsLegacyStorageMigration(root)).toBe(false);
    config({});
    expect(needsLegacyStorageMigration(root)).toBe(true);
    put(".kb/config.json", "[");
    expect(needsLegacyStorageMigration(root)).toBe(true);
    rmSync(path.join(root, ".kb/config.json"));
    put("documentation/requirements/REQ-1.md", "same\n");
    expect(needsLegacyStorageMigration(root)).toBe(true);
    put(".kb/requirements/REQ-1.md", "same\n");
    expect(needsLegacyStorageMigration(root)).toBe(true);
    put(".kb/requirements/REQ-1.md", "other\n");
    expect(needsLegacyStorageMigration(root)).toBe(true);
  });

  test("lists missing canonical lanes", () => {
    mkdirSync(path.join(root, ".kb/requirements"), { recursive: true });
    mkdirSync(path.join(root, ".kb/adr"), { recursive: true });
    expect(missingCanonicalLanes(root)).toEqual([
      "scenarios",
      "tests",
      "facts",
      "flags",
      "events",
    ]);
  });
});
