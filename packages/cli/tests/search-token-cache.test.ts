/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
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
  title: ["search"],
  metadata: ["req", "search"],
  bodyTokens: ["answer"],
  document: ["search", "answer"],
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
  runtime = mkdtempSync(path.join(tmpdir(), "kibi-token-cache-"));
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

function cacheFiles(): string[] {
  return readdirSync(runtime).filter((name) =>
    name.startsWith("search-tokens-"),
  );
}

describe("search token cache", () => {
  test("keeps tokens for a later search of the same workspace", () => {
    const hash = tokenSourceHash(["Search", "body"]);
    const first = openSearchTokenCache("/work/a", "tokenizer-1");
    expect(first.get("req::REQ-1", hash)).toBeUndefined();
    first.set("req::REQ-1", hash, TOKENS);
    first.save();

    const later = openSearchTokenCache("/work/a", "tokenizer-1");
    expect(later.get("req::REQ-1", hash)).toMatchObject(TOKENS);
    expect(
      openSearchTokenCache("/work/b", "tokenizer-1").get("req::REQ-1", hash),
    ).toBeUndefined();
  });

  test("an edited entity or a changed tokenizer misses", () => {
    const hash = tokenSourceHash(["Search", "body"]);
    const cache = openSearchTokenCache("/work/a", "tokenizer-1");
    cache.set("req::REQ-1", hash, TOKENS);
    cache.save();

    const reopened = openSearchTokenCache("/work/a", "tokenizer-1");
    expect(
      reopened.get("req::REQ-1", tokenSourceHash(["Search", "edited body"])),
    ).toBeUndefined();
    expect(
      openSearchTokenCache("/work/a", "tokenizer-2").get("req::REQ-1", hash),
    ).toBeUndefined();
  });

  test("an unchanged cache is not written again", () => {
    const cache = openSearchTokenCache("/work/a", "tokenizer-1");
    cache.save();
    expect(cacheFiles()).toEqual([]);
  });

  test("a corrupt cache file starts empty and is replaced", () => {
    const hash = tokenSourceHash(["Search"]);
    const cache = openSearchTokenCache("/work/a", "tokenizer-1");
    cache.set("req::REQ-1", hash, TOKENS);
    cache.save();
    const [file] = cacheFiles();
    writeFileSync(path.join(runtime, file as string), "{not json");

    const reopened = openSearchTokenCache("/work/a", "tokenizer-1");
    expect(reopened.get("req::REQ-1", hash)).toBeUndefined();
    reopened.set("req::REQ-2", hash, TOKENS);
    reopened.save();
    expect(
      openSearchTokenCache("/work/a", "tokenizer-1").get("req::REQ-2", hash),
    ).toMatchObject(TOKENS);
  });

  test("a cache that cannot be written only costs speed", () => {
    const hash = tokenSourceHash(["Search"]);
    const cache = openSearchTokenCache("/work/a", "tokenizer-1");
    cache.set("req::REQ-1", hash, TOKENS);
    cache.save();
    const [file] = cacheFiles();
    const target = path.join(runtime, file as string);
    rmSync(target);
    mkdirSync(target);

    const blocked = openSearchTokenCache("/work/a", "tokenizer-1");
    blocked.set("req::REQ-2", hash, TOKENS);
    expect(() => blocked.save()).not.toThrow();
    expect(
      readdirSync(runtime).filter((name) => name.endsWith(".tmp")),
    ).toEqual([]);
  });

  test("setting the environment switch to 0 disables it", () => {
    process.env[KIBI_SEARCH_TOKEN_CACHE_ENV] = "0";
    const hash = tokenSourceHash(["Search"]);
    const cache = openSearchTokenCache("/work/a", "tokenizer-1");
    cache.set("req::REQ-1", hash, TOKENS);
    cache.save();
    expect(cache.get("req::REQ-1", hash)).toBeUndefined();
    expect(cacheFiles()).toEqual([]);
  });
});
