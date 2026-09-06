// implements REQ-kibi-proof-evidence-protocol
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { Command } from "commander";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { registerProofCommand } from "../src/cli-register-proof.js";
import * as prove from "../src/commands/prove.js";
import { inspectProofEnvironment } from "../src/proof/inspect.js";

const dirs: string[] = [];

afterEach(() => {
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function tempDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kibi-proof-inspect-"));
  dirs.push(dir);
  return dir;
}

describe("registerProofCommand actions", () => {
  test("rejects conflicting prove selectors and missing except-only usage", async () => {
    const proveSpy = spyOn(prove, "proveCommand").mockResolvedValue({
      exitCode: 0,
    });
    const parseProve = async (...args: string[]) => {
      const program = new Command();
      program.exitOverride();
      registerProofCommand(program);
      return program.parseAsync(["prove", ...args], { from: "user" });
    };
    await expect(parseProve("--all", "--test", "TEST-1")).rejects.toThrow(
      /exactly one selector/,
    );
    await expect(parseProve("--integration-except", "web")).rejects.toThrow(
      /requires a selector/,
    );
    await parseProve("--all", "--integration-except", "web");
    expect(proveSpy).toHaveBeenCalled();
    proveSpy.mockRestore();
  });

  test("inspect prints JSON and human text including empty and populated runners", async () => {
    const empty = tempDir();
    const populated = tempDir();
    writeFileSync(
      path.join(populated, "package.json"),
      JSON.stringify({
        scripts: { test: "bun test" },
        devDependencies: { bun: "1.0.0" },
      }),
    );
    writeFileSync(path.join(populated, "playwright.config.ts"), "export {};\n");
    writeFileSync(path.join(populated, "bun.lock"), "");
    writeFileSync(path.join(populated, "Cargo.toml"), "[package]\n");
    writeFileSync(path.join(populated, "go.mod"), "module x\n");
    writeFileSync(path.join(populated, "pom.xml"), "<project/>\n");
    writeFileSync(path.join(populated, "Makefile"), "test:\n");
    writeFileSync(path.join(populated, "App.csproj"), "<Project/>\n");
    mkdirSync(path.join(populated, ".github", "workflows"), { recursive: true });
    writeFileSync(
      path.join(populated, ".github", "workflows", "ci.yml"),
      "name: ci\n",
    );
    writeFileSync(path.join(populated, "package.json.bad"), "{");

    expect(inspectProofEnvironment(empty).detectedRunners).toEqual([]);
    const inspection = inspectProofEnvironment(populated);
    expect(inspection.detectedRunners).toContain("playwright");
    expect(inspection.buildSystems).toEqual(
      expect.arrayContaining(["bun", "cargo", "go", "maven", "make"]),
    );
    expect(inspection.ciWorkflows).toContain("ci.yml");

    const program = new Command();
    program.exitOverride();
    registerProofCommand(program);
    const chunks: string[] = [];
    const write = spyOn(process.stdout, "write").mockImplementation(((
      chunk: string | Uint8Array,
    ) => {
      chunks.push(String(chunk));
      return true;
    }) as typeof process.stdout.write);
    const cwd = process.cwd();
    try {
      process.chdir(empty);
      await program.parseAsync(["proof", "inspect"], { from: "user" });
      await program.parseAsync(["proof", "inspect", "--json"], { from: "user" });
    } finally {
      process.chdir(cwd);
      write.mockRestore();
    }
    expect(chunks.some((chunk) => chunk.includes("Proof environment"))).toBe(
      true,
    );
    expect(chunks.some((chunk) => chunk.includes("none detected"))).toBe(true);
    expect(chunks.some((chunk) => chunk.includes("{"))).toBe(true);
  });
});
