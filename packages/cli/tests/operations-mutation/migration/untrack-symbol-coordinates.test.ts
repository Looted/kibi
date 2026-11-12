import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  DERIVED_COORDINATES_SCHEMA_VERSION,
  type GitRunner,
  isCoordinateArtifactTracked,
  untrackCoordinateArtifact,
} from "../../../src/operations/migration/untrack-symbol-coordinates.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-untrack-coords-"));
  roots.push(root);
  return root;
}

function git(cwd: string, ...args: string[]) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout;
}

function repoWithCoordinates(track: boolean): string {
  const root = workspace();
  git(root, "init", "-q");
  mkdirSync(path.join(root, ".kb"));
  writeFileSync(
    path.join(root, ".kb/symbol-coordinates.yaml"),
    "symbols: []\n",
  );
  writeFileSync(path.join(root, "README.md"), "x\n");
  git(root, "add", track ? "." : "README.md");
  return root;
}

type Call = { cwd: string; args: string[] };
function fake(...results: ReturnType<GitRunner>[]): {
  run: GitRunner;
  calls: Call[];
} {
  const calls: Call[] = [];
  return {
    calls,
    run: (cwd, args) => {
      calls.push({ cwd, args });
      const next = results.shift();
      if (!next) throw new Error("unexpected git call");
      return next;
    },
  };
}

const ok = { error: undefined, status: 0, stderr: "" };

describe("symbol coordinate untracking", () => {
  test("schema version is 13", () => {
    expect(DERIVED_COORDINATES_SCHEMA_VERSION).toBe(13);
  });

  test("reads tracking state from a real repository", () => {
    expect(isCoordinateArtifactTracked(repoWithCoordinates(true))).toBe(true);
    expect(isCoordinateArtifactTracked(repoWithCoordinates(false))).toBe(false);
    expect(isCoordinateArtifactTracked(workspace())).toBeNull();
  });

  test("untracks the artifact from the index and keeps the file", () => {
    const root = repoWithCoordinates(true);
    expect(untrackCoordinateArtifact(root)).toStrictEqual({
      outcome: "untracked",
    });
    expect(existsSync(path.join(root, ".kb/symbol-coordinates.yaml"))).toBe(
      true,
    );
    expect(isCoordinateArtifactTracked(root)).toBe(false);
    expect(untrackCoordinateArtifact(root)).toStrictEqual({
      outcome: "not_tracked",
    });
    expect(untrackCoordinateArtifact(workspace())).toStrictEqual({
      outcome: "not_a_repository",
    });
  });

  test("reports a real git failure as text", () => {
    const root = repoWithCoordinates(true);
    writeFileSync(path.join(root, ".git/index.lock"), "");
    const result = untrackCoordinateArtifact(root);
    expect(result.outcome).toBe("failed");
    expect(result).toStrictEqual({
      outcome: "failed",
      reason: expect.stringMatching(
        /^fatal: Unable to create '.*index\.lock': File exists\.[\s\S]*\S$/,
      ),
    });
  });

  test("asks git for exactly the coordinate artifact", () => {
    const runner = fake(ok, ok);
    expect(untrackCoordinateArtifact("/ws", runner.run)).toStrictEqual({
      outcome: "untracked",
    });
    expect(runner.calls).toStrictEqual([
      {
        cwd: "/ws",
        args: [
          "ls-files",
          "--error-unmatch",
          "--",
          ".kb/symbol-coordinates.yaml",
        ],
      },
      {
        cwd: "/ws",
        args: [
          "rm",
          "--cached",
          "--quiet",
          "--",
          ".kb/symbol-coordinates.yaml",
        ],
      },
    ]);
  });

  test("a spawn error or an unknown failure means no repository", () => {
    expect(
      isCoordinateArtifactTracked(
        "/ws",
        fake({ error: new Error("spawn"), status: 0, stderr: "" }).run,
      ),
    ).toBeNull();
    expect(
      isCoordinateArtifactTracked(
        "/ws",
        fake({
          error: undefined,
          status: 1,
          stderr: "error: pathspec did not match any file(s)",
        }).run,
      ),
    ).toBe(false);
    expect(
      isCoordinateArtifactTracked(
        "/ws",
        fake({ error: undefined, status: 1, stderr: "did not match" }).run,
      ),
    ).toBeNull();
  });

  test("reports why git rm failed", () => {
    expect(
      untrackCoordinateArtifact(
        "/ws",
        fake(ok, {
          error: undefined,
          status: 128,
          stderr: " fatal: index.lock exists \n",
        }).run,
      ),
    ).toStrictEqual({ outcome: "failed", reason: "fatal: index.lock exists" });
    expect(
      untrackCoordinateArtifact(
        "/ws",
        fake(ok, {
          error: new Error(" spawn git ENOENT "),
          status: 0,
          stderr: "ignored",
        }).run,
      ),
    ).toStrictEqual({ outcome: "failed", reason: "spawn git ENOENT" });
  });
});
