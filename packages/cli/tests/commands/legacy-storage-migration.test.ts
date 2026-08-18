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
  needsLegacyStorageMigration,
  planLegacyStorageMigration,
} from "../../src/commands/legacy-storage-migration.js";
import { LATEST_KB_SCHEMA_VERSION } from "../../src/utils/schema-version.js";

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
    expect(manifest.schemaVersion).toBe(LATEST_KB_SCHEMA_VERSION);
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
});
