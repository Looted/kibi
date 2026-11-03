import { afterEach, describe, expect, mock, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  parseMaybeDoubleEncodedJson,
  resolveCorePlPath,
  runJsonModuleQuery,
  toPrologList,
} from "../../src/tools/core-module.js";

const dirs: string[] = [];
const ENV_KEYS = ["KIBI_KB_PL_PATH", "KIBI_DISCOVERY_PL_PATH"];
const saved = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
);

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = saved[key];
    if (value === undefined) Reflect.deleteProperty(process.env, key);
    else process.env[key] = value;
  }
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

/** A discovery.pl under a directory whose name has a backslash and a quote. */
function moduleFixture(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "kibi-core-exact-"));
  dirs.push(root);
  const dir = path.join(root, "a\\b'c");
  mkdirSync(dir);
  const file = path.join(dir, "discovery.pl");
  writeFileSync(file, "% fixture\n");
  process.env.KIBI_DISCOVERY_PL_PATH = file;
  return file;
}

const atomPath = (file: string) => file.replace(/\\/g, "/").replace(/'/g, "''");

type Answer = {
  success: boolean;
  bindings: Record<string, string>;
  error?: string;
};

function engine(answers: Answer[], sessionEngine: boolean, oneShot = false) {
  const goals: string[] = [];
  const invalidateCache = mock(() => undefined);
  const prolog: Record<string, unknown> = {
    query: async (goal: string) => {
      goals.push(goal);
      return answers.shift() ?? { success: true, bindings: {} };
    },
  };
  if (sessionEngine) {
    prolog.invalidateCache = invalidateCache;
    prolog.useOneShotMode = oneShot;
  }
  return { prolog: prolog as never, goals, invalidateCache };
}

describe("parseMaybeDoubleEncodedJson", () => {
  test("parses once, or twice when the JSON holds a JSON string", () => {
    expect(parseMaybeDoubleEncodedJson('{"a":1}')).toStrictEqual({ a: 1 });
    expect(
      parseMaybeDoubleEncodedJson(JSON.stringify('{"a":1}')),
    ).toStrictEqual({ a: 1 });
    expect(parseMaybeDoubleEncodedJson("[1]")).toStrictEqual([1]);
  });
});

describe("toPrologList", () => {
  test("builds a quoted, escaped list", () => {
    expect(toPrologList()).toBe("[]");
    expect(toPrologList([])).toBe("[]");
    expect(toPrologList(["a", "it's"])).toBe("['a','it''s']");
  });
});

describe("resolveCorePlPath", () => {
  test("a sibling of the KIBI_KB_PL_PATH override", () => {
    Reflect.deleteProperty(process.env, "KIBI_DISCOVERY_PL_PATH");
    process.env.KIBI_KB_PL_PATH = "/fixtures/core/kb.pl";
    expect(resolveCorePlPath("discovery.pl")).toBe(
      "/fixtures/core/discovery.pl",
    );
  });
});

describe("runJsonModuleQuery", () => {
  test("a query-only engine gets one goal loading the module with a portable path", async () => {
    const file = moduleFixture();
    const { prolog, goals } = engine(
      [{ success: true, bindings: { JsonString: JSON.stringify('{"x":1}') } }],
      false,
    );
    expect(
      await runJsonModuleQuery(prolog, "discovery.pl", "g(J)", "L"),
    ).toStrictEqual({ x: 1 });
    expect(goals).toStrictEqual([`(use_module('${atomPath(file)}'), g(J))`]);
  });

  test("a query-only engine failure without detail says Unknown error", async () => {
    moduleFixture();
    await expect(
      runJsonModuleQuery(
        engine([{ success: false, bindings: {} }], false).prolog,
        "discovery.pl",
        "g(J)",
        "Lbl",
      ),
    ).rejects.toThrow(new Error("Lbl query failed: Unknown error"));
    await expect(
      runJsonModuleQuery(
        engine([{ success: false, bindings: {}, error: "bad" }], false).prolog,
        "discovery.pl",
        "g(J)",
        "Lbl",
      ),
    ).rejects.toThrow(new Error("Lbl query failed: bad"));
  });

  test("a one-shot session engine clears its cache and sends one goal", async () => {
    const file = moduleFixture();
    const { prolog, goals, invalidateCache } = engine(
      [{ success: true, bindings: { JsonString: '{"y":2}' } }],
      true,
      true,
    );
    expect(
      await runJsonModuleQuery(prolog, "discovery.pl", "g(J)", "L"),
    ).toStrictEqual({ y: 2 });
    expect(invalidateCache).toHaveBeenCalledTimes(1);
    expect(goals).toStrictEqual([`(use_module('${atomPath(file)}'), g(J))`]);
  });

  test("an interactive session engine loads the module first", async () => {
    const file = moduleFixture();
    const { prolog, goals, invalidateCache } = engine(
      [
        { success: true, bindings: {} },
        { success: true, bindings: { JsonString: '{"z":3}' } },
      ],
      true,
    );
    expect(
      await runJsonModuleQuery(prolog, "discovery.pl", "g(J)", "L"),
    ).toStrictEqual({ z: 3 });
    expect(invalidateCache).toHaveBeenCalledTimes(1);
    expect(goals).toStrictEqual([`use_module('${atomPath(file)}')`, "g(J)"]);
  });

  test("session engine failures without detail say Unknown error", async () => {
    moduleFixture();
    await expect(
      runJsonModuleQuery(
        engine([{ success: false, bindings: {} }], true).prolog,
        "discovery.pl",
        "g(J)",
        "Lbl",
      ),
    ).rejects.toThrow(new Error("Lbl module load failed: Unknown error"));
    await expect(
      runJsonModuleQuery(
        engine([{ success: false, bindings: {} }], true, true).prolog,
        "discovery.pl",
        "g(J)",
        "Lbl",
      ),
    ).rejects.toThrow(new Error("Lbl query failed: Unknown error"));
    await expect(
      runJsonModuleQuery(
        engine([{ success: false, bindings: {}, error: "e" }], true, true)
          .prolog,
        "discovery.pl",
        "g(J)",
        "Lbl",
      ),
    ).rejects.toThrow(new Error("Lbl query failed: e"));
    await expect(
      runJsonModuleQuery(
        engine([{ success: false, bindings: {}, error: "e2" }], true).prolog,
        "discovery.pl",
        "g(J)",
        "Lbl",
      ),
    ).rejects.toThrow(new Error("Lbl module load failed: e2"));
  });

  test("missing JSON is reported for both engine kinds", async () => {
    moduleFixture();
    for (const session of [false, true])
      await expect(
        runJsonModuleQuery(
          engine([{ success: true, bindings: {} }], session, true).prolog,
          "discovery.pl",
          "g(J)",
          "Lbl",
        ),
      ).rejects.toThrow(new Error("Lbl query returned no JsonString binding"));
  });
});
