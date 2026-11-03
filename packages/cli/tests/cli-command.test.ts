import { afterEach, describe, expect, test } from "bun:test";
import {
  errorWasReported,
  markErrorReported,
  withExitCode,
} from "../src/cli-command.js";

const savedExitCode = process.exitCode ?? 0;

afterEach(() => {
  process.exitCode = savedExitCode;
});

describe("withExitCode", () => {
  test("passes every argument through and sets the returned exit code", async () => {
    process.exitCode = 0;
    const seen: unknown[][] = [];
    const wrapped = withExitCode(async (a: number, b: string) => {
      seen.push([a, b]);
      return { exitCode: 3 };
    });
    expect(await wrapped(1, "x")).toBeUndefined();
    expect(seen).toStrictEqual([[1, "x"]]);
    expect(process.exitCode).toBe(3);
  });

  test("an exit code of 0 is still applied", async () => {
    process.exitCode = 5;
    await withExitCode(async () => ({ exitCode: 0 }))();
    expect(process.exitCode).toBe(0);
  });

  test("leaves the exit code alone without a result or without a code", async () => {
    process.exitCode = 4;
    await withExitCode(async () => undefined)();
    expect(process.exitCode).toBe(4);
    await withExitCode(async () => ({}))();
    expect(process.exitCode).toBe(4);
  });
});

describe("reported errors", () => {
  test("remembers marked objects only", () => {
    const marked = new Error("printed");
    const other = new Error("not printed");
    expect(errorWasReported(marked)).toBe(false);
    markErrorReported(marked);
    expect(errorWasReported(marked)).toBe(true);
    expect(errorWasReported(other)).toBe(false);
  });

  test("ignores primitives and null", () => {
    markErrorReported(null);
    markErrorReported("text");
    markErrorReported(42);
    expect(errorWasReported(null)).toBe(false);
    expect(errorWasReported("text")).toBe(false);
    expect(errorWasReported(42)).toBe(false);
    expect(errorWasReported(undefined)).toBe(false);
  });
});
