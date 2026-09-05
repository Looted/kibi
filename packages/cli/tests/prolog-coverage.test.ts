import { afterEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { PrologProcess, resolveKbPlPath } from "../src/prolog.js";

describe("resolveKbPlPath", () => {
  const original = process.env.KIBI_KB_PL_PATH;

  afterEach(() => {
    if (original === undefined) {
      Reflect.deleteProperty(process.env, "KIBI_KB_PL_PATH");
    } else {
      process.env.KIBI_KB_PL_PATH = original;
    }
  });

  test("returns the KIBI_KB_PL_PATH override when set", () => {
    process.env.KIBI_KB_PL_PATH = "/tmp/custom-kb.pl";
    expect(resolveKbPlPath()).toBe("/tmp/custom-kb.pl");
  });

  test("resolves kb.pl from the monorepo checkout without an override", () => {
    Reflect.deleteProperty(process.env, "KIBI_KB_PL_PATH");
    const resolved = resolveKbPlPath();
    expect(resolved).toContain("kb.pl");
    expect(existsSync(resolved)).toBe(true);
  });
});

describe("PrologProcess error and overflow branches", () => {
  test("start fails when swiplPath does not exist", async () => {
    const prolog = new PrologProcess({
      swiplPath: "/definitely/missing/swipl-bin",
      oneShot: true,
    });
    await expect(prolog.start()).rejects.toThrow(/SWI-Prolog not found/);
  });

  test("appendOutputChunk and appendErrorChunk honor the bounded buffer", () => {
    const prolog = new PrologProcess({ oneShot: true });
    const proto = Object.getPrototypeOf(prolog) as {
      appendOutputChunk(chunk: Buffer): void;
      appendErrorChunk(chunk: Buffer): void;
      outputOverflowed: boolean;
    };
    const overflow = Buffer.alloc(8 * 1024 * 1024 + 32, 0x61);
    proto.appendOutputChunk.call(prolog, overflow);
    proto.appendOutputChunk.call(prolog, Buffer.from("ignored"));
    proto.appendErrorChunk.call(prolog, overflow);
    expect(prolog).toBeInstanceOf(PrologProcess);
  });
});
