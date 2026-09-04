import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "./helpers/isolated-env.js";

const cliEntry = path.resolve(import.meta.dir, "../src/cli.ts");
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function runCli(args: readonly string[]) {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "kibi-cli-flags-"));
  temporaryDirectories.push(cwd);
  return spawnSync("bun", [cliEntry, ...args], { cwd, encoding: "utf8" });
}

describe("CLI unknown flags exit non-zero", () => {
  test("rejects an unknown subcommand option with a non-zero exit code", () => {
    const result = runCli(["status", "--json"]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("unknown option '--json'");
  });

  test("rejects an unknown global option with a non-zero exit code", () => {
    const result = runCli(["--bogus-global"]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("unknown option '--bogus-global'");
  });

  test("rejects an unknown prove option with a non-zero exit code", () => {
    const result = runCli(["prove", "--retries", "0"]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("unknown option '--retries'");
  });
});
