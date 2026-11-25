/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 */

// Kibi reads the level from kibi.level in the root package.json, else from
// .kb/setup.json; it is remember or test, and test when unset. Only kibi
// init writes it: no MCP tool and no CLI JSON route does.
import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { readKibiLevel } from "kibi-agent-core/kibi-level";
import { OPERATION_CATALOG } from "../../src/public/operations/catalog.js";
import { invalidLevelDiagnostic } from "../../src/public/operations/check-executor.js";
import { levelWorkspace } from "./workspace.js";

const SRC = path.join(import.meta.dir, "../../src");

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return sources(file);
    return entry.name.endsWith(".ts") ? [file] : [];
  });
}

describe("the Kibi level setting", () => {
  test("only kibi init writes the level", () => {
    const writers = sources(SRC)
      .filter((file) => readFileSync(file, "utf8").includes("writeKibiLevel("))
      .map((file) => path.relative(SRC, file))
      .sort();
    expect(writers).toEqual(["commands/init-level.ts"]);
    const callers = sources(SRC)
      .filter((file) => readFileSync(file, "utf8").includes("settleKibiLevel("))
      .map((file) => path.relative(SRC, file))
      .sort();
    expect(callers).toEqual(["commands/init-level.ts", "commands/init.ts"]);
    // kibi init is a command: no operation (MCP tool or CLI JSON route) is.
    const operations = OPERATION_CATALOG.map((spec) => spec.name);
    expect(operations.some((name) => name.includes("init"))).toBe(false);
  });

  test("a level kibi does not know is reported, and the check runs at test", () => {
    const root = levelWorkspace({
      "package.json": JSON.stringify({ kibi: { level: "prove" } }),
    });
    const resolved = readKibiLevel(root);
    expect(resolved.level).toBe("test");
    expect(invalidLevelDiagnostic(root, resolved)).toEqual({
      category: "CONFIG_WARNING",
      severity: "warning",
      message:
        'kibi.level in package.json is "prove", which is not a Kibi level (remember or test), so Kibi runs at test.',
      file: "package.json",
      suggestion:
        'Ask the person which level the project uses and set kibi.level in package.json to "remember" or "test".',
    });
    const setup = levelWorkspace({ ".kb/setup.json": '{"level":1}' });
    expect(invalidLevelDiagnostic(setup, readKibiLevel(setup)).file).toBe(
      ".kb/setup.json",
    );
  });
});
