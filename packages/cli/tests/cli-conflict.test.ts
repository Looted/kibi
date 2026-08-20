import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "./helpers/isolated-env.js";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const cliEntry = path.resolve(import.meta.dir, "../src/cli.ts");
const temporaryDirectories: string[] = [];

function runCli(args: readonly string[], cwd: string) {
  return spawnSync("bun", [cliEntry, ...args], { cwd, encoding: "utf8" });
}

function createInput(): { cwd: string; input: string } {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "kibi-cli-conflict-"));
  temporaryDirectories.push(cwd);
  const input = "input.json";
  writeFileSync(path.join(cwd, input), "{}\n", "utf8");
  return { cwd, input };
}

describe("CLI JSON input conflicts", () => {
  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("rejects explicitly supplied --format before reading --input", () => {
    const result = runCli(
      ["kb-query", "--input", "{}", "--format", "json"],
      process.cwd(),
    );

    expect(result.status).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("--format");
  });

  test("rejects a legacy positional together with --input", () => {
    const fixture = createInput();
    const result = runCli(
      ["query", "req", "--input", fixture.input],
      fixture.cwd,
    );

    expect(result.status).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("type");
  });

  test("rejects a legacy business flag together with --input", () => {
    const fixture = createInput();
    const result = runCli(
      ["query", "--input", fixture.input, "--tag", "security"],
      fixture.cwd,
    );

    expect(result.status).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("--tag");
  });
});
