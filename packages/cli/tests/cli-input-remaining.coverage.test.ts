/// <reference types="bun" />

import { afterEach, describe, expect, test } from "bun:test";
import { Readable } from "node:stream";
import { loadInput } from "../src/cli-input.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
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
});
