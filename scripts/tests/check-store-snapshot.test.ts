import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "..", "..");
const script = path.join(repoRoot, "scripts", "check-store-snapshot.pl");
const base = mkdtempSync(path.join(os.tmpdir(), "kibi-store-snapshot-"));
afterAll(() => rmSync(base, { recursive: true, force: true }));

function swipl(goal: string): void {
  const run = spawnSync("swipl", ["-q", "-g", goal, "-t", "halt"], {
    encoding: "utf8",
  });
  expect(run.stderr).toBe("");
  expect(run.status).toBe(0);
}

/**
 * A branches directory holding one persisted store with three triples,
 * written to a snapshot. `doubled` saves that snapshot with every triple
 * twice, the way a snapshot written over unreclaimed reindexed triples did.
 */
function branches(name: string, doubled: boolean): string {
  const root = path.join(base, name);
  const rdf = path.join(root, "store", "rdf");
  mkdirSync(rdf, { recursive: true });
  const dir = JSON.stringify(rdf);
  const graph = "'urn:kibi-test:graph'";
  const triples = [1, 2, 3]
    .map(
      (n) =>
        `rdf_assert('urn:kibi-test:s${n}','urn:kibi-test:p',literal(${n}),${graph})`,
    )
    .join(",");
  swipl(
    [
      "use_module(library(semweb/rdf_db))",
      "use_module(library(semweb/rdf_persistency))",
      `rdf_attach_db(${dir},[silent(true)])`,
      triples,
      "rdf_flush_journals([])",
      `(rdf_snapshot_file(${graph},Snapshot)->true;throw(no_snapshot))`,
      "rdf_detach_db",
      ...(doubled
        ? [
            `rdf_unload_graph(${graph})`,
            "rdf_load_db(Snapshot)",
            "rdf_load_db(Snapshot)",
            `rdf_save_db(Snapshot,${graph})`,
          ]
        : []),
    ].join(","),
  );
  return root;
}

function check(root: string): { status: number | null; out: string } {
  const run = spawnSync("swipl", [script, root], { encoding: "utf8" });
  return { status: run.status, out: `${run.stdout}${run.stderr}` };
}

describe("check-store-snapshot", () => {
  test("passes a store whose fresh load holds every triple once", () => {
    const result = check(branches("clean", false));
    expect(result.out).toContain("3 triples, none held twice");
    expect(result.status).toBe(0);
  });

  test("fails a store whose snapshot holds a triple twice", () => {
    const result = check(branches("doubled", true));
    expect(result.out).toContain(
      "a fresh load holds 6 triples but only 3 distinct ones (3 duplicate copies)",
    );
    expect(result.status).toBe(1);
  });

  test("fails a store an engine had to repair", () => {
    const root = branches("repaired", false);
    writeFileSync(
      path.join(root, "store", ".kibi-store-repair.json"),
      '{"at":"2026-11-17T00:00:00Z","removedCopies":3}\n',
    );
    const result = check(root);
    expect(result.out).toContain(
      "an engine repaired duplicate triples in this store",
    );
    expect(result.status).toBe(1);
  });

  test("fails when there is no store to check", () => {
    const root = path.join(base, "empty");
    mkdirSync(root, { recursive: true });
    const result = check(root);
    expect(result.out).toContain("no branch store under");
    expect(result.status).toBe(1);
  });
});
