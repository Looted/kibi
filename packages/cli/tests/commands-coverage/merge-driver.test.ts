import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import * as childProcess from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  mergeDriverCommand,
  mergeKbManifests,
} from "../../src/commands/merge-driver.js";
import {
  createTempDir,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];

afterEach(() => {
  mock.restore();
  for (const root of roots.splice(0)) removeTempDir(root);
});

const sym = (...ids: string[]) =>
  `symbols:\n${ids.map((id) => `  - id: ${id}\n`).join("")}`;

describe("mergeKbManifests manifest validation", () => {
  test("reports invalid YAML", () => {
    const result = mergeKbManifests("a: [", sym("A"), sym("A"));
    expect(result.status).toBe("conflict");
    expect(
      (result as { conflicts: readonly string[] }).conflicts[0],
    ).toStartWith("base: not valid YAML (");
  });

  test("reports a top level that is not a mapping", () => {
    expect(mergeKbManifests(sym("A"), "- a\n", sym("A"))).toStrictEqual({
      status: "conflict",
      conflicts: ["ours: top level is not a mapping"],
    });
  });

  test("reports a manifest holding two id-keyed lists", () => {
    expect(
      mergeKbManifests(sym("A"), sym("A"), "symbols: []\nrelationships: []\n"),
    ).toStrictEqual({
      status: "conflict",
      conflicts: ["theirs: holds both symbols and relationships"],
    });
  });

  test("reports a list key that is not a list", () => {
    expect(
      mergeKbManifests(sym("A"), "symbols: nope\n", sym("A")),
    ).toStrictEqual({
      status: "conflict",
      conflicts: ["ours: symbols is not a list"],
    });
  });

  test("reports entries without a string id", () => {
    expect(
      mergeKbManifests(sym("A"), "symbols:\n  - title: x\n", sym("A")),
    ).toStrictEqual({
      status: "conflict",
      conflicts: ["ours: symbols entry without a string id"],
    });
  });

  test("reports sides holding different lists", () => {
    expect(
      mergeKbManifests(sym("A"), sym("A"), "relationships:\n  - id: R1\n"),
    ).toStrictEqual({
      status: "conflict",
      conflicts: ["sides hold different lists: symbols, relationships"],
    });
  });
});

describe("mergeKbManifests top-level fields", () => {
  test("takes the other side's top-level change", () => {
    const result = mergeKbManifests(
      "version: 1\nold: x\n",
      "version: 1\nold: x\n",
      "version: 2\nfresh: y\n",
    );
    expect(result).toStrictEqual({
      status: "merged",
      content: "version: 2\nfresh: y\n",
    });
  });

  test("conflicts when both sides changed top-level fields", () => {
    expect(
      mergeKbManifests("version: 1\n", "version: 2\n", "version: 3\n"),
    ).toStrictEqual({
      status: "conflict",
      conflicts: ["both sides changed top-level manifest fields"],
    });
  });
});

describe("mergeDriverCommand", () => {
  function files(base: string | null, ours: string, theirs: string) {
    const root = createTempDir("kibi-merge-driver-");
    roots.push(root);
    const basePath = path.join(root, "base.yaml");
    const oursPath = path.join(root, "ours.yaml");
    const theirsPath = path.join(root, "theirs.yaml");
    if (base !== null) writeFileSync(basePath, base);
    writeFileSync(oursPath, ours);
    writeFileSync(theirsPath, theirs);
    return { basePath, oursPath, theirsPath };
  }

  test("writes the merge to the current file, treating a missing base as empty", async () => {
    const paths = files(null, sym("A"), sym("B"));
    expect(
      await mergeDriverCommand(
        paths.basePath,
        paths.oursPath,
        paths.theirsPath,
      ),
    ).toStrictEqual({ exitCode: 0 });
    expect(readFileSync(paths.oursPath, "utf8")).toBe(sym("A", "B"));
  });

  test("rethrows base read errors other than a missing file", async () => {
    const paths = files(null, sym("A"), sym("B"));
    await expect(
      mergeDriverCommand(
        path.dirname(paths.oursPath),
        paths.oursPath,
        paths.theirsPath,
      ),
    ).rejects.toMatchObject({ code: "EISDIR" });
  });

  test("prints conflicts and falls back to git merge-file", async () => {
    const paths = files("version: 1\n", "version: 2\n", "version: 3\n");
    const errors: string[] = [];
    spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      errors.push(args.join(" "));
    });
    const calls: unknown[][] = [];
    spyOn(childProcess, "spawnSync").mockImplementation(((
      ...args: unknown[]
    ) => {
      calls.push(args);
      return { status: 1 };
    }) as never);
    expect(
      await mergeDriverCommand(
        paths.basePath,
        paths.oursPath,
        paths.theirsPath,
      ),
    ).toStrictEqual({ exitCode: 1 });
    expect(errors).toStrictEqual([
      "kibi merge-driver: both sides changed top-level manifest fields",
    ]);
    expect(calls).toStrictEqual([
      [
        "git",
        [
          "merge-file",
          "-L",
          "ours",
          "-L",
          "base",
          "-L",
          "theirs",
          paths.oursPath,
          paths.basePath,
          paths.theirsPath,
        ],
        { stdio: "inherit" },
      ],
    ]);
  });
});
