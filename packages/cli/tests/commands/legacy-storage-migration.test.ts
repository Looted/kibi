import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  applyLegacyStorageMigration,
  missingCanonicalLanes,
  needsLegacyStorageMigration,
  planLegacyStorageMigration,
  rewritePendingSourceReceiptPaths,
} from "../../src/commands/legacy-storage-migration.js";

function writeReq(root: string, dir: string, id: string, body = "body"): void {
  mkdirSync(path.join(root, dir), { recursive: true });
  writeFileSync(
    path.join(root, dir, `${id}.md`),
    `---\nid: ${id}\ntype: req\ntitle: ${id}\nstatus: active\n---\n\n${body}\n`,
    "utf8",
  );
}

describe("legacy storage migration", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-storage-migration-"));
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("plans moves from the historical documentation/ layout", () => {
    writeReq(tmpDir, "documentation/requirements", "REQ-ONE");
    mkdirSync(path.join(tmpDir, "documentation"), { recursive: true });
    writeFileSync(
      path.join(tmpDir, "documentation", "symbols.yaml"),
      "symbols: []\n",
    );
    writeFileSync(
      path.join(tmpDir, "documentation", "symbol-coordinates.yaml"),
      "coordinates: {}\n",
    );

    const plan = planLegacyStorageMigration(tmpDir);
    expect(plan.legacyConfig).toBe("absent");
    expect(plan.moves.map((move) => `${move.from}->${move.to}`).sort()).toEqual(
      [
        "documentation/requirements/REQ-ONE.md->.kb/requirements/REQ-ONE.md",
        "documentation/symbol-coordinates.yaml->.kb/symbol-coordinates.yaml",
        "documentation/symbols.yaml->.kb/symbols.yaml",
      ],
    );
    expect(plan.blockers).toEqual([]);
  });

  test("plans moves from custom legacy config paths", () => {
    mkdirSync(path.join(tmpDir, ".kb"), { recursive: true });
    writeFileSync(
      path.join(tmpDir, ".kb", "config.json"),
      JSON.stringify({
        schemaVersion: 4,
        semanticAdvisorBackfill: "pending",
        paths: {
          requirements: "kb-docs/reqs",
          symbols: "kb-docs/symbols.yaml",
        },
      }),
    );
    writeReq(tmpDir, "kb-docs/reqs", "REQ-CUSTOM");
    writeFileSync(
      path.join(tmpDir, "kb-docs", "symbols.yaml"),
      "symbols: []\n",
    );

    const plan = planLegacyStorageMigration(tmpDir);
    expect(plan.legacyConfig).toBe("present");
    expect(plan.schemaVersion).toBe(4);
    expect(plan.semanticAdvisorBackfill).toBe("pending");
    expect(plan.moves).toEqual(
      expect.arrayContaining([
        {
          from: "kb-docs/reqs/REQ-CUSTOM.md",
          to: ".kb/requirements/REQ-CUSTOM.md",
          lane: "requirements",
        },
        {
          from: "kb-docs/symbols.yaml",
          to: ".kb/symbols.yaml",
          lane: "symbols",
        },
      ]),
    );
  });

  test("blocks destination conflicts instead of overwriting", () => {
    writeReq(tmpDir, "documentation/requirements", "REQ-ONE", "legacy");
    writeReq(tmpDir, ".kb/requirements", "REQ-ONE", "canonical");

    const plan = planLegacyStorageMigration(tmpDir);
    expect(plan.conflicts).toMatchObject([
      {
        from: "documentation/requirements/REQ-ONE.md",
        to: ".kb/requirements/REQ-ONE.md",
        kind: "conflict",
      },
    ]);
    expect(
      plan.blockers.some((blocker) => blocker.includes("already exists")),
    ).toBe(true);
    expect(() => applyLegacyStorageMigration(tmpDir, plan)).toThrow(/blocked/);
    expect(
      readFileSync(
        path.join(tmpDir, "documentation/requirements/REQ-ONE.md"),
        "utf8",
      ),
    ).toContain("legacy");
    expect(
      readFileSync(path.join(tmpDir, ".kb/requirements/REQ-ONE.md"), "utf8"),
    ).toContain("canonical");
  });

  test("applies a standard historical layout without data loss", () => {
    writeReq(tmpDir, "documentation/requirements", "REQ-ONE", "keep-me");
    mkdirSync(path.join(tmpDir, ".kb"), { recursive: true });
    writeFileSync(
      path.join(tmpDir, ".kb", "config.json"),
      JSON.stringify({
        schemaVersion: 4,
        semanticAdvisorBackfill: "completed",
      }),
    );

    const plan = planLegacyStorageMigration(tmpDir);
    const result = applyLegacyStorageMigration(tmpDir, plan);

    expect(result.movedFiles).toContain(".kb/requirements/REQ-ONE.md");
    expect(result.retiredLegacyConfig).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb", "config.json"))).toBe(false);
    expect(
      readFileSync(path.join(tmpDir, ".kb/requirements/REQ-ONE.md"), "utf8"),
    ).toContain("keep-me");
    const manifest = JSON.parse(
      readFileSync(path.join(tmpDir, ".kb/manifest.json"), "utf8"),
    );
    // The move records the legacy generation; kibi migrate raises it to the
    // latest only after the schema steps, so an interrupted run replays them.
    expect(manifest.schemaVersion).toBe(4);
    expect(manifest.semanticAdvisorBackfill).toBe("completed");
    expect(needsLegacyStorageMigration(tmpDir)).toBe(false);
  });

  test("is idempotent after a successful cutover", () => {
    writeReq(tmpDir, "documentation/requirements", "REQ-ONE");
    const first = applyLegacyStorageMigration(
      tmpDir,
      planLegacyStorageMigration(tmpDir),
    );
    expect(first.movedFiles.length).toBeGreaterThan(0);

    const secondPlan = planLegacyStorageMigration(tmpDir);
    expect(secondPlan.moves).toEqual([]);
    expect(secondPlan.legacyConfig).toBe("absent");
    const second = applyLegacyStorageMigration(tmpDir, secondPlan);
    expect(second.movedFiles).toEqual([]);
    expect(second.retiredLegacyConfig).toBe(false);
  });

  test("resumes a partial migration when destination is still empty", () => {
    writeReq(tmpDir, "documentation/requirements", "REQ-ONE");
    writeReq(tmpDir, "documentation/facts", "FACT-ONE");
    mkdirSync(path.join(tmpDir, ".kb/requirements"), { recursive: true });
    // Simulate an interrupted move of the requirement only.
    writeFileSync(
      path.join(tmpDir, ".kb/requirements/REQ-ONE.md"),
      readFileSync(
        path.join(tmpDir, "documentation/requirements/REQ-ONE.md"),
        "utf8",
      ),
    );
    rmSync(path.join(tmpDir, "documentation/requirements/REQ-ONE.md"));

    const plan = planLegacyStorageMigration(tmpDir);
    expect(plan.moves.map((move) => move.from)).toEqual([
      "documentation/facts/FACT-ONE.md",
    ]);
    applyLegacyStorageMigration(tmpDir, plan);
    expect(existsSync(path.join(tmpDir, ".kb/facts/FACT-ONE.md"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/requirements/REQ-ONE.md"))).toBe(
      true,
    );
  });

  test("treats malformed legacy config as a blocker and does not infer default paths", () => {
    mkdirSync(path.join(tmpDir, ".kb"), { recursive: true });
    writeFileSync(path.join(tmpDir, ".kb", "config.json"), "{", "utf8");
    writeReq(tmpDir, "documentation/requirements", "REQ-ONE");

    const plan = planLegacyStorageMigration(tmpDir);
    expect(plan.legacyConfig).toBe("malformed");
    expect(plan.legacyConfigError).toBeDefined();
    expect(plan.moves).toEqual([]);
    expect(plan.blockers.some((blocker) => blocker.includes("malformed"))).toBe(
      true,
    );
    expect(
      plan.blockers.some((blocker) => blocker.includes("will not infer")),
    ).toBe(true);
    expect(() => applyLegacyStorageMigration(tmpDir, plan)).toThrow(
      /malformed|will not infer/,
    );
    expect(
      existsSync(path.join(tmpDir, "documentation/requirements/REQ-ONE.md")),
    ).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/requirements/REQ-ONE.md"))).toBe(
      false,
    );
  });

  test("skips missing legacy lanes without discarding other files", () => {
    writeReq(tmpDir, "documentation/facts", "FACT-ONE");
    const plan = planLegacyStorageMigration(tmpDir);
    expect(plan.moves.map((move) => move.from)).toEqual([
      "documentation/facts/FACT-ONE.md",
    ]);
    applyLegacyStorageMigration(tmpDir, plan);
    expect(existsSync(path.join(tmpDir, ".kb/facts/FACT-ONE.md"))).toBe(true);
  });

  test("rewrites pending-source receipts and reports missing canonical lanes", () => {
    expect(rewritePendingSourceReceiptPaths(tmpDir, [])).toBe(0);
    expect(missingCanonicalLanes(tmpDir).length).toBeGreaterThan(0);

    mkdirSync(path.join(tmpDir, ".kb", "recovery", "pending-sources"), {
      recursive: true,
    });
    mkdirSync(path.join(tmpDir, ".kb", "requirements"), { recursive: true });
    writeFileSync(
      path.join(tmpDir, ".kb", "requirements", "REQ-ONE.md"),
      "body\n",
    );
    writeFileSync(
      path.join(tmpDir, ".kb", "recovery", "pending-sources", "skip.txt"),
      "ignore",
    );
    writeFileSync(
      path.join(tmpDir, ".kb", "recovery", "pending-sources", "bad.json"),
      "{not-json",
    );
    writeFileSync(
      path.join(tmpDir, ".kb", "recovery", "pending-sources", "nopath.json"),
      JSON.stringify({ afterHash: "a".repeat(64) }),
    );
    writeFileSync(
      path.join(tmpDir, ".kb", "recovery", "pending-sources", "same.json"),
      JSON.stringify({
        path: ".kb/requirements/REQ-ONE.md",
        afterHash: "b".repeat(64),
      }),
    );
    writeFileSync(
      path.join(tmpDir, ".kb", "recovery", "pending-sources", "legacy.json"),
      JSON.stringify({
        path: "documentation/requirements/REQ-ONE.md",
        afterHash: "not-a-hash",
      }),
    );
    writeFileSync(
      path.join(tmpDir, ".kb", "recovery", "pending-sources", "explicit.json"),
      JSON.stringify({
        path: "old/REQ-ONE.md",
        afterHash: "c".repeat(64),
      }),
    );

    const rewritten = rewritePendingSourceReceiptPaths(tmpDir, [
      {
        from: "old/REQ-ONE.md",
        to: ".kb/requirements/REQ-ONE.md",
        lane: "requirements",
      },
    ]);
    expect(rewritten).toBe(2);
    const legacy = JSON.parse(
      readFileSync(
        path.join(tmpDir, ".kb", "recovery", "pending-sources", "legacy.json"),
        "utf8",
      ),
    ) as { path: string; afterHash: string };
    expect(legacy.path).toBe(".kb/requirements/REQ-ONE.md");
    expect(legacy.afterHash).toHaveLength(64);
    const explicit = JSON.parse(
      readFileSync(
        path.join(
          tmpDir,
          ".kb",
          "recovery",
          "pending-sources",
          "explicit.json",
        ),
        "utf8",
      ),
    ) as { path: string };
    expect(explicit.path).toBe(".kb/requirements/REQ-ONE.md");
  });
});

describe("legacy copies beside a migrated .kb/", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-storage-duplicates-"));
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  const manifest = (...ids: string[]) =>
    `symbols:\n${ids.map((id) => `  - id: ${id}\n    title: ${id}\n`).join("")}`;
  const write = (relative: string, content: string) => {
    mkdirSync(path.dirname(path.join(tmpDir, relative)), { recursive: true });
    writeFileSync(path.join(tmpDir, relative), content, "utf8");
  };
  const lanesUnderKibiDocs = () =>
    write(
      ".kb/config.json",
      JSON.stringify({
        schemaVersion: 4,
        paths: { requirements: "kibi-docs/requirements" },
      }),
    );

  test("removes a legacy copy identical to its destination instead of blocking", () => {
    writeReq(tmpDir, "documentation/requirements", "REQ-ONE", "same");
    writeReq(tmpDir, ".kb/requirements", "REQ-ONE", "same");

    const plan = planLegacyStorageMigration(tmpDir);
    expect(plan.blockers).toEqual([]);
    expect(plan.moves).toEqual([]);
    expect(plan.removals).toEqual([
      {
        path: "documentation/requirements/REQ-ONE.md",
        duplicateOf: ".kb/requirements/REQ-ONE.md",
      },
    ]);
    expect(needsLegacyStorageMigration(tmpDir)).toBe(true);

    const result = applyLegacyStorageMigration(tmpDir, plan);
    expect(result.removedFiles).toEqual([
      "documentation/requirements/REQ-ONE.md",
    ]);
    expect(existsSync(path.join(tmpDir, "documentation"))).toBe(false);
    expect(
      readFileSync(path.join(tmpDir, ".kb/requirements/REQ-ONE.md"), "utf8"),
    ).toContain("same");
    expect(needsLegacyStorageMigration(tmpDir)).toBe(false);
  });

  test("names a stale symbols subset without deleting it", () => {
    write(".kb/symbols.yaml", manifest("SYM-a", "SYM-b"));
    write("documentation/symbols.yaml", manifest("SYM-a"));

    const plan = planLegacyStorageMigration(tmpDir);
    expect(plan.conflicts).toMatchObject([
      {
        from: "documentation/symbols.yaml",
        to: ".kb/symbols.yaml",
        kind: "stale_subset",
      },
    ]);
    expect(plan.blockers[0]).toContain("stale subset of .kb/symbols.yaml");
    expect(plan.blockers[0]).toContain("git rm documentation/symbols.yaml");
    expect(needsLegacyStorageMigration(tmpDir)).toBe(true);
    expect(() => applyLegacyStorageMigration(tmpDir, plan)).toThrow(/blocked/);
    expect(existsSync(path.join(tmpDir, "documentation/symbols.yaml"))).toBe(
      true,
    );
  });

  test("keeps a real symbols conflict and a generated coordinates copy apart", () => {
    write(".kb/symbols.yaml", manifest("SYM-a"));
    write("documentation/symbols.yaml", manifest("SYM-a", "SYM-new"));
    write(".kb/symbol-coordinates.yaml", "coordinates: {a: 1}\n");
    write("documentation/symbol-coordinates.yaml", "coordinates: {a: 2}\n");

    const plan = planLegacyStorageMigration(tmpDir);
    expect(
      plan.conflicts.map((conflict) => [conflict.from, conflict.kind]),
    ).toEqual([
      ["documentation/symbols.yaml", "conflict"],
      ["documentation/symbol-coordinates.yaml", "generated"],
    ]);
    expect(plan.removals).toEqual([]);
  });

  test("moves the symbols manifest that sits beside the configured lanes", () => {
    lanesUnderKibiDocs();
    writeReq(tmpDir, "kibi-docs/requirements", "REQ-ONE");
    write("kibi-docs/symbols.yaml", manifest("SYM-a"));

    const plan = planLegacyStorageMigration(tmpDir);
    expect(plan.blockers).toEqual([]);
    expect(plan.moves.map((move) => `${move.from}->${move.to}`).sort()).toEqual(
      [
        "kibi-docs/requirements/REQ-ONE.md->.kb/requirements/REQ-ONE.md",
        "kibi-docs/symbols.yaml->.kb/symbols.yaml",
      ],
    );
  });

  test("reports an ambiguous symbols manifest instead of using the documentation/ default", () => {
    lanesUnderKibiDocs();
    writeReq(tmpDir, "kibi-docs/requirements", "REQ-ONE");
    write("documentation/symbols.yaml", manifest("SYM-old"));

    const onlyDefault = planLegacyStorageMigration(tmpDir);
    expect(
      onlyDefault.moves.some((move) => move.to === ".kb/symbols.yaml"),
    ).toBe(false);
    expect(onlyDefault.conflicts).toMatchObject([
      { from: "documentation/symbols.yaml", kind: "ambiguous" },
    ]);

    write("kibi-docs/symbols.yaml", manifest("SYM-a"));
    const both = planLegacyStorageMigration(tmpDir);
    expect(both.moves.some((move) => move.to === ".kb/symbols.yaml")).toBe(
      false,
    );
    expect(both.conflicts).toMatchObject([
      {
        from: "kibi-docs/symbols.yaml, documentation/symbols.yaml",
        kind: "ambiguous",
      },
    ]);
    expect(both.blockers[0]).toContain("Set paths.symbols");
  });
});
