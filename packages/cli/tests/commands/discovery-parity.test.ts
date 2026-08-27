import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "../helpers/isolated-env.js";

describe("human and JSON discovery command parity", () => {
  let workspaceRoot: string;
  const kibiBin = path.resolve(import.meta.dir, "../../bin/kibi");
  const run = (args: readonly string[], input?: string): string =>
    execFileSync("bun", [kibiBin, ...args], {
      cwd: workspaceRoot,
      encoding: "utf8",
      ...(input === undefined ? {} : { input }),
    });

  beforeAll(() => {
    workspaceRoot = mkdtempSync(
      path.join(os.tmpdir(), "kibi-discovery-parity-"),
    );
    execFileSync("git", ["init", "-b", "main"], {
      cwd: workspaceRoot,
      stdio: "pipe",
    });
    run(["init"]);
    mkdirSync(path.join(workspaceRoot, ".kb", "requirements"), {
      recursive: true,
    });
    writeFileSync(
      path.join(workspaceRoot, ".kb", "requirements", "REQ-1.md"),
      "---\nid: REQ-1\ntitle: OAuth discovery parity\nstatus: open\ntags: [auth]\n---\n\nOAuth discovery body.\n",
    );
    execFileSync("git", ["add", ".kb"], {
      cwd: workspaceRoot,
      stdio: "pipe",
    });
    run(["sync"]);
  }, 30_000);

  afterAll(() => {
    if (workspaceRoot && existsSync(workspaceRoot)) {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test("query returns matching entities through flags and --input", () => {
    // Given
    const human = JSON.parse(run(["query", "req", "--format", "json"]));

    // When
    const protocol = JSON.parse(
      run(["query", "--input", "-"], JSON.stringify({ type: "req" })),
    );

    // Then
    expect(protocol.data.entities).toEqual(human);
    expect(protocol.data.count).toBe(human.length);
  }, 15_000);

  test("search returns matching ranking through flags and --input", () => {
    // Given
    const human = JSON.parse(
      run(["search", "OAuth discovery", "--format", "json"]),
    );

    // When
    const protocol = JSON.parse(
      run(
        ["search", "--input", "-"],
        JSON.stringify({ query: "OAuth discovery" }),
      ),
    );

    // Then
    expect(protocol.data).toEqual(human);
  }, 15_000);

  test("status returns matching freshness through flags and --input", () => {
    // Given
    const human = JSON.parse(run(["status", "--format", "json"]));

    // When
    const protocol = JSON.parse(run(["status", "--input", "-"], "{}"));

    // Then
    expect(protocol.data).toEqual(human);
  }, 15_000);
});
