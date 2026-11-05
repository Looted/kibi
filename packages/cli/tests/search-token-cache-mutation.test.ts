import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  KIBI_SEARCH_TOKEN_CACHE_ENV,
  openSearchTokenCache,
  tokenSourceHash,
} from "../src/search-token-cache.js";

const TOKENS = {
  title: ["t"],
  metadata: ["m"],
  bodyTokens: ["b"],
  document: ["d"],
};

let runtime: string;
const previous = {
  runtime: process.env.KIBI_RUNTIME_DIR,
  xdg: process.env.XDG_RUNTIME_DIR,
  cache: process.env[KIBI_SEARCH_TOKEN_CACHE_ENV],
};

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) Reflect.deleteProperty(process.env, name);
  else process.env[name] = value;
}

beforeEach(() => {
  runtime = realpathSync(mkdtempSync(path.join(tmpdir(), "kibi-token-mut-")));
  process.env.KIBI_RUNTIME_DIR = runtime;
  Reflect.deleteProperty(process.env, "XDG_RUNTIME_DIR");
  Reflect.deleteProperty(process.env, KIBI_SEARCH_TOKEN_CACHE_ENV);
});

afterEach(() => {
  restoreEnv("KIBI_RUNTIME_DIR", previous.runtime);
  restoreEnv("XDG_RUNTIME_DIR", previous.xdg);
  restoreEnv(KIBI_SEARCH_TOKEN_CACHE_ENV, previous.cache);
  rmSync(runtime, { recursive: true, force: true });
});

const hashOf = (entry: unknown): string | undefined =>
  (entry as { hash?: string } | undefined)?.hash;

function expectedFile(workspace: string): string {
  const key = createHash("sha256")
    .update(path.resolve(workspace))
    .digest("hex")
    .slice(0, 24);
  return path.join(runtime, `search-tokens-${key}.json`);
}

describe("search token cache file", () => {
  test("tokenSourceHash is the base64 sha1 of the JSON parts", () => {
    expect(tokenSourceHash(["a", "b"])).toBe(
      createHash("sha1").update('["a","b"]').digest("base64"),
    );
  });

  test("is named by the resolved workspace and written private", () => {
    const cache = openSearchTokenCache("/work/./a", "tok");
    cache.set("k", "h", TOKENS);
    cache.save();
    const file = expectedFile("/work/a");
    expect(JSON.parse(readFileSync(file, "utf8"))).toStrictEqual({
      version: 1,
      tokenizer: "tok",
      entries: { k: { hash: "h", ...TOKENS } },
    });
    expect(statSync(file).mode & 0o777).toBe(0o600);
    expect(
      openSearchTokenCache("/work/a", "tok").get("k", "h") as unknown,
    ).toStrictEqual({
      hash: "h",
      ...TOKENS,
    });
  });

  test("a file of another version starts empty", () => {
    writeFileSync(
      expectedFile("/work/a"),
      JSON.stringify({
        version: 2,
        tokenizer: "tok",
        entries: { k: { hash: "h", ...TOKENS } },
      }),
    );
    expect(
      openSearchTokenCache("/work/a", "tok").get("k", "h"),
    ).toBeUndefined();
  });

  test("a second save without changes writes nothing", () => {
    const cache = openSearchTokenCache("/work/a", "tok");
    cache.set("k", "h", TOKENS);
    cache.save();
    rmSync(expectedFile("/work/a"));
    cache.save();
    expect(existsSync(expectedFile("/work/a"))).toBe(false);
  });

  test("a runtime directory that disappeared only costs speed", () => {
    const cache = openSearchTokenCache("/work/a", "tok");
    cache.set("k", "h", TOKENS);
    rmSync(runtime, { recursive: true, force: true });
    expect(() => cache.save()).not.toThrow();
  });

  test("an unusable runtime directory disables the cache", () => {
    const blocker = path.join(runtime, "not-a-directory");
    writeFileSync(blocker, "");
    const key = createHash("sha256").update(blocker).digest("hex").slice(0, 32);
    const fallback = path.join("/tmp", `kb-${process.geteuid?.()}-${key}`);
    writeFileSync(fallback, "");
    process.env.KIBI_RUNTIME_DIR = blocker;
    const stderr = spyOn(process.stderr, "write").mockImplementation(
      () => true,
    );
    try {
      const cache = openSearchTokenCache("/work/a", "tok");
      cache.set("k", "h", TOKENS);
      expect(cache.get("k", "h")).toBeUndefined();
      cache.save();
    } finally {
      stderr.mockRestore();
      rmSync(fallback, { force: true });
    }
  });

  test("keeps the most recently set entries when it is full", () => {
    const cache = openSearchTokenCache("/work/a", "tok");
    cache.set("first", "h", TOKENS);
    for (let index = 0; index < 49_999; index += 1)
      cache.set(`e${index}`, "h", TOKENS);
    cache.set("first", "h2", TOKENS);
    cache.set("last", "h", TOKENS);
    cache.save();
    const reopened = openSearchTokenCache("/work/a", "tok");
    expect(hashOf(reopened.get("first", "h2"))).toBe("h2");
    expect(reopened.get("first", "h")).toBeUndefined();
    expect(reopened.get("e0", "h")).toBeUndefined();
    expect(hashOf(reopened.get("e1", "h"))).toBe("h");
    expect(hashOf(reopened.get("last", "h"))).toBe("h");
    const saved = JSON.parse(readFileSync(expectedFile("/work/a"), "utf8"));
    expect(Object.keys(saved.entries).length).toBe(50_000);
  });
});
