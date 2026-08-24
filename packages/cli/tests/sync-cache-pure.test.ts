/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync as readFile,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  hashManifestWithCoordinates,
  toCacheKey,
} from "../src/commands/sync/cache.js";

const workspaces: string[] = [];

afterEach(() => {
  for (const workspace of workspaces.splice(0)) {
    rmSync(workspace, { recursive: true, force: true });
  }
});

describe("toCacheKey", () => {
  const workspaceRoot = "/workspace";

  test("generates consistent key for same path", () => {
    const key1 = toCacheKey(workspaceRoot, "/workspace/path/to/file.md");
    const key2 = toCacheKey(workspaceRoot, "/workspace/path/to/file.md");
    expect(key1).toBe(key2);
  });

  test("generates different keys for different paths", () => {
    const key1 = toCacheKey(workspaceRoot, "/workspace/path/a.md");
    const key2 = toCacheKey(workspaceRoot, "/workspace/path/b.md");
    expect(key1).not.toBe(key2);
  });

  test("returns string key", () => {
    const key = toCacheKey(workspaceRoot, "test.md");
    expect(typeof key).toBe("string");
    expect(key.length).toBeGreaterThan(0);
  });

  test("handles relative paths", () => {
    const key = toCacheKey(workspaceRoot, "./relative/path.md");
    expect(typeof key).toBe("string");
    expect(key.length).toBeGreaterThan(0);
  });

  test("handles paths with special characters", () => {
    const key = toCacheKey(workspaceRoot, "/workspace/with spaces/file.md");
    expect(typeof key).toBe("string");
  });
});

describe("hashManifestWithCoordinates", () => {
  test("changes when source bytes referenced by the manifest change", () => {
    const workspace = mkdtempSync(join(tmpdir(), "kibi-cache-source-"));
    workspaces.push(workspace);
    mkdirSync(join(workspace, ".kb"), { recursive: true });
    mkdirSync(join(workspace, "src"), { recursive: true });
    const manifest = join(workspace, ".kb", "symbols.yaml");
    const coordinates = join(workspace, ".kb", "symbol-coordinates.yaml");
    const source = join(workspace, "src", "example.ts");
    writeFileSync(
      manifest,
      "symbols:\n  - id: SYM-EXAMPLE\n    title: example\n    sourceFile: src/example.ts\n",
      "utf8",
    );
    writeFileSync(coordinates, "version: 2\ncoordinates: {}\n", "utf8");
    writeFileSync(source, "export function example() {}\n", "utf8");
    const before = hashManifestWithCoordinates(
      workspace,
      manifest,
      coordinates,
    );

    writeFileSync(source, "// moved\nexport function example() {}\n", "utf8");
    const after = hashManifestWithCoordinates(workspace, manifest, coordinates);

    expect(after).not.toBe(before);
  });

  test("continues hashing later sources after an unreadable source", () => {
    const workspace = mkdtempSync(join(tmpdir(), "kibi-cache-unreadable-"));
    workspaces.push(workspace);
    mkdirSync(join(workspace, ".kb"), { recursive: true });
    mkdirSync(join(workspace, "src"), { recursive: true });
    const manifest = join(workspace, ".kb", "symbols.yaml");
    const coordinates = join(workspace, ".kb", "symbol-coordinates.yaml");
    const unreadable = join(workspace, "src", "a-unreadable.ts");
    const later = join(workspace, "src", "z-later.ts");
    writeFileSync(
      manifest,
      "symbols:\n  - id: SYM-A\n    sourceFile: src/a-unreadable.ts\n  - id: SYM-B\n    sourceFile: src/z-later.ts\n",
      "utf8",
    );
    writeFileSync(coordinates, "version: 2\ncoordinates: {}\n", "utf8");
    writeFileSync(unreadable, "export const unreadable = true;\n", "utf8");
    writeFileSync(later, "export const later = 1;\n", "utf8");

    const before = hashManifestWithCoordinates(
      workspace,
      manifest,
      coordinates,
      {
        readFileSync: ((filePath: unknown, options?: unknown) => {
          if (String(filePath) === unreadable) {
            throw new Error("source unavailable");
          }
          return readFile(filePath as never, options as never);
        }) as typeof readFile,
      },
    );

    writeFileSync(later, "export const later = 2;\n", "utf8");
    const after = hashManifestWithCoordinates(
      workspace,
      manifest,
      coordinates,
      {
        readFileSync: ((filePath: unknown, options?: unknown) => {
          if (String(filePath) === unreadable) {
            throw new Error("source unavailable");
          }
          return readFile(filePath as never, options as never);
        }) as typeof readFile,
      },
    );

    expect(after).not.toBe(before);
  });

  test("does not let malformed manifest YAML block cache fingerprinting", () => {
    const workspace = mkdtempSync(join(tmpdir(), "kibi-cache-parse-error-"));
    workspaces.push(workspace);
    mkdirSync(join(workspace, ".kb"), { recursive: true });
    const manifest = join(workspace, ".kb", "symbols.yaml");
    writeFileSync(manifest, "symbols: [", "utf8");

    expect(hashManifestWithCoordinates(workspace, manifest, null)).toMatch(
      /^[a-f0-9]{64}$/,
    );
  });
});
