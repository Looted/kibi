import * as fsPromises from "node:fs/promises";
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { Readable } from "node:stream";
import { loadInput } from "../src/cli-input.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  process.exitCode = 0;
});

describe("loadInput leftover stdin and read-error branches", () => {
  test("reads one object from process.stdin and rejects a second stdin consume", async () => {
    const previous = process.stdin;
    const stream = Readable.from(['{"ok":true}']);
    Object.defineProperty(process, "stdin", {
      configurable: true,
      value: stream,
    });
    restores.push(() => {
      Object.defineProperty(process, "stdin", {
        configurable: true,
        value: previous,
      });
    });
    await expect(loadInput({ input: "-", cwd: process.cwd() })).resolves.toEqual(
      { ok: true },
    );
    await expect(loadInput({ input: "-", cwd: process.cwd() })).rejects.toMatchObject(
      { code: "STDIN_ALREADY_READ" },
    );
  });

  test("requires --input when the option is omitted", async () => {
    await expect(loadInput({ cwd: process.cwd() })).rejects.toMatchObject({
      code: "MISSING_INPUT",
    });
  });

  test("rethrows a non-Error file-read failure", async () => {
    const previous = process.cwd;
    // Force path.resolve + readFile by pointing at a directory we cannot treat as JSON.
    await expect(
      loadInput({ input: "/", cwd: "/" }),
    ).rejects.toMatchObject({ code: "INPUT_READ_FAILED" });
    void previous;
  });

  test("rethrows non-Error file-read and JSON parse failures", async () => {
    const read = spyOn(fsPromises, "readFile").mockRejectedValue("eio");
    restores.push(() => read.mockRestore());
    await expect(
      loadInput({ input: "missing.json", cwd: process.cwd() }),
    ).rejects.toBe("eio");
    read.mockRestore();
    const parse = spyOn(JSON, "parse").mockImplementation(() => {
      throw "not-syntax";
    });
    restores.push(() => parse.mockRestore());
    const root = await import("node:fs/promises");
    void root;
    const os = await import("node:os");
    const path = await import("node:path");
    const { writeFileSync, mkdirSync } = await import("node:fs");
    const dir = path.join(os.tmpdir(), `kibi-input-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "bad.json"), "{}\n");
    await expect(
      loadInput({ input: "bad.json", cwd: dir }),
    ).rejects.toBe("not-syntax");
  });
});
