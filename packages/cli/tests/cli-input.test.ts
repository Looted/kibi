import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import * as fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { loadInput } from "../src/cli-input.js";

const temporaryDirectories: string[] = [];
const restores: Array<() => void> = [];

function createFixture(contents: string): { cwd: string; input: string } {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "kibi-cli-input-"));
  temporaryDirectories.push(cwd);
  const input = "input.json";
  writeFileSync(path.join(cwd, input), contents, "utf8");
  return { cwd, input };
}

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("loadInput", () => {
  test("rejects malformed JSON with the parser's reason", async () => {
    const fixture = createFixture('{"query":');

    const error = await loadInput(fixture).catch((caught) => caught);
    expect(error).toMatchObject({ code: "INVALID_JSON", exitCode: 2 });
    expect(error.message).toStartWith("Invalid JSON input: ");
    expect(error.message.length).toBeGreaterThan("Invalid JSON input: ".length);
  });

  test("rejects trailing JSON content after the first value", async () => {
    const fixture = createFixture("{} {}\n");

    await expect(loadInput(fixture)).rejects.toMatchObject({
      code: "INVALID_JSON",
      exitCode: 2,
    });
  });

  test("rejects every JSON root that is not an object", async () => {
    for (const root of ["[]", "null", "42", '"text"', "true"]) {
      await expect(loadInput(createFixture(root))).rejects.toMatchObject({
        code: "INVALID_INPUT_ROOT",
        message: "JSON input must be an object.",
        exitCode: 2,
      });
    }
  });

  test("rejects an empty input file", async () => {
    const fixture = createFixture("  \n");

    await expect(loadInput(fixture)).rejects.toMatchObject({
      code: "EMPTY_INPUT",
      message: "JSON input is empty.",
      exitCode: 2,
    });
  });

  test("rejects a missing CWD-relative input file and names it", async () => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), "kibi-cli-input-"));
    temporaryDirectories.push(cwd);

    const error = await loadInput({ input: "missing.json", cwd }).catch(
      (caught) => caught,
    );
    expect(error).toMatchObject({ code: "INPUT_READ_FAILED", exitCode: 2 });
    expect(error.message).toStartWith(
      "Unable to read JSON input 'missing.json': ENOENT",
    );
  });

  test("requires --input when the option is omitted", async () => {
    await expect(loadInput({ cwd: process.cwd() })).rejects.toMatchObject({
      code: "MISSING_INPUT",
      message: "The --input option is required.",
      exitCode: 2,
    });
  });

  test("passes through a file-read failure that is not an Error", async () => {
    const read = spyOn(fsPromises, "readFile").mockRejectedValue("eio");
    restores.push(() => read.mockRestore());

    await expect(
      loadInput({ input: "missing.json", cwd: process.cwd() }),
    ).rejects.toBe("eio");
  });

  test("passes through a parse failure that is not a SyntaxError", async () => {
    const fixture = createFixture("{}\n");
    const parse = spyOn(JSON, "parse").mockImplementation(() => {
      throw "not-syntax";
    });
    restores.push(() => parse.mockRestore());

    await expect(loadInput(fixture)).rejects.toBe("not-syntax");
  });

  test("loads an empty object from a CWD-relative file", async () => {
    await expect(loadInput(createFixture("{}\n"))).resolves.toEqual({});
  });

  test("preserves nested JSON input", async () => {
    const fixture = createFixture(
      JSON.stringify({ filters: { tags: ["security", "billing"] } }),
    );

    await expect(loadInput(fixture)).resolves.toEqual({
      filters: { tags: ["security", "billing"] },
    });
  });

  test("reads standard input once and refuses a second read", async () => {
    const previous = process.stdin;
    Object.defineProperty(process, "stdin", {
      configurable: true,
      value: Readable.from([Buffer.from('{"ok":'), "true}"]),
    });
    restores.push(() => {
      Object.defineProperty(process, "stdin", {
        configurable: true,
        value: previous,
      });
    });

    await expect(
      loadInput({ input: "-", cwd: process.cwd() }),
    ).resolves.toEqual({ ok: true });
    await expect(
      loadInput({ input: "-", cwd: process.cwd() }),
    ).rejects.toMatchObject({
      code: "STDIN_ALREADY_READ",
      message: "Standard input can only be consumed once.",
      exitCode: 2,
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

  test("reads one valid object from stdin in a child process", () => {
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
