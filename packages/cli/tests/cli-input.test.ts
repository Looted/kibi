import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadInput } from "../src/cli-input.js";

const temporaryDirectories: string[] = [];

function createFixture(contents: string): { cwd: string; input: string } {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "kibi-cli-input-"));
  temporaryDirectories.push(cwd);
  const input = "input.json";
  writeFileSync(path.join(cwd, input), contents, "utf8");
  return { cwd, input };
}

describe("loadInput", () => {
  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("rejects malformed JSON when a file contains invalid syntax", async () => {
    const fixture = createFixture('{"query":');

    expect(loadInput(fixture)).rejects.toMatchObject({
      code: "INVALID_JSON",
      exitCode: 2,
    });
  });

  test("rejects an array when the JSON root is not an object", async () => {
    const fixture = createFixture("[]");

    expect(loadInput(fixture)).rejects.toMatchObject({
      code: "INVALID_INPUT_ROOT",
      exitCode: 2,
    });
  });

  test("rejects trailing JSON content after the first value", async () => {
    const fixture = createFixture("{} {}\n");

    expect(loadInput(fixture)).rejects.toMatchObject({
      code: "INVALID_JSON",
      exitCode: 2,
    });
  });

  test("rejects an empty input file", async () => {
    const fixture = createFixture("  \n");

    expect(loadInput(fixture)).rejects.toMatchObject({
      code: "EMPTY_INPUT",
      exitCode: 2,
    });
  });

  test("rejects a missing CWD-relative input file", async () => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), "kibi-cli-input-"));
    temporaryDirectories.push(cwd);

    expect(loadInput({ input: "missing.json", cwd })).rejects.toMatchObject({
      code: "INPUT_READ_FAILED",
      exitCode: 2,
    });
  });

  test("loads an empty object from a CWD-relative file", async () => {
    const fixture = createFixture("{}\n");

    expect(loadInput(fixture)).resolves.toEqual({});
  });

  test("preserves nested JSON input", async () => {
    const fixture = createFixture(
      JSON.stringify({ filters: { tags: ["security", "billing"] } }),
    );

    expect(loadInput(fixture)).resolves.toEqual({
      filters: { tags: ["security", "billing"] },
    });
  });

  test("rejects stdin that closes before yielding a JSON value", () => {
    const script = [
      'import { loadInput } from "./packages/cli/src/cli-input.ts";',
      'try { await loadInput({ input: "-", cwd: process.cwd() }); }',
      "catch (error) { console.error(JSON.stringify({ code: error.code, exitCode: error.exitCode })); process.exit(error.exitCode); }",
    ].join("\n");

    const result = spawnSync("bun", ["--eval", script], {
      cwd: path.resolve(import.meta.dir, "../../.."),
      input: "",
      encoding: "utf8",
    });

    expect(result.status).toBe(2);
    expect(JSON.parse(result.stderr)).toEqual({
      code: "EMPTY_INPUT",
      exitCode: 2,
    });
  });

  test("reads one valid object from stdin", () => {
    const script = [
      'import { loadInput } from "./packages/cli/src/cli-input.ts";',
      'const input = await loadInput({ input: "-", cwd: process.cwd() });',
      "console.log(JSON.stringify(input));",
    ].join("\n");

    const result = spawnSync("bun", ["--eval", script], {
      cwd: path.resolve(import.meta.dir, "../../.."),
      input: '{"nested":{"value":1}}\n',
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ nested: { value: 1 } });
  });
});
