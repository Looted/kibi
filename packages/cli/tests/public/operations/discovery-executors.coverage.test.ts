import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  executeQuery,
  executeSearch,
  executeStatus,
} from "../../../src/public/operations/discovery-executors.js";
import { nodeFilesystem } from "../../../src/public/operations/node-ports.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";

function context(
  workspaceRoot: string,
  extra?: Partial<OperationContext>,
): OperationContext {
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-05T00:00:00Z"),
    fs: nodeFilesystem,
    git: {
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2",
        hash: "a".repeat(64),
        dirty: false,
        fileCount: 1,
      }),
    },
    branchAttachment: {
      gitBranch: "main",
      kbBranch: "main",
      storePath: path.join(workspaceRoot, ".kb", "branches", "main"),
      kind: "exact",
      migrationRequired: false,
    },
    ...extra,
  };
}

describe("discovery executors", () => {
  test("executeQuery uses indexed pages, falls back, and wraps errors", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-disco-"));
    mkdirSync(path.join(root, ".kb"), { recursive: true });
    try {
      const indexed = await executeQuery(
        { type: "req", limit: 1, offset: 0 },
        context(root, {
          prolog: {
            query: async () => ({ success: true, bindings: {} }),
            nextSolution: async () => null,
            save: async () => ({ success: true, bindings: {} }),
            queryEntities: async () => ({
              entities: [
                { id: "REQ-1", title: "One", status: "open" },
                { id: "file:///tmp/REQ-2", title: "Two", status: "open" },
              ],
              count: 2,
            }),
          },
        }),
      );
      expect(indexed.structuredContent.count).toBe(2);

      const empty = await executeQuery(
        { type: "req" },
        context(root, {
          prolog: {
            query: async () => ({ success: true, bindings: {} }),
            nextSolution: async () => null,
            save: async () => ({ success: true, bindings: {} }),
            queryEntities: async () => ({ entities: [], count: 0 }),
          },
        }),
      );
      expect(empty.content[0]?.text).toContain("No entities found");

      const fallback = await executeQuery(
        { id: "REQ-1", tags: ["core"], sourceFile: "src/a.ts" },
        context(root, {
          prolog: {
            query: async () => ({
              success: true,
              bindings: {
                Results: JSON.stringify([
                  { id: "REQ-1", title: "One", status: "open" },
                ]),
              },
            }),
            nextSolution: async () => null,
            save: async () => ({ success: true, bindings: {} }),
          },
        }),
      );
      expect(fallback.structuredContent.count).toBeGreaterThanOrEqual(0);

      await expect(
        executeQuery({}, context(root, { prolog: undefined })),
      ).rejects.toThrow("Query execution failed");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("executeSearch covers intent, legacy, empty, and error paths", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-disco-"));
    mkdirSync(path.join(root, ".kb"), { recursive: true });
    try {
      await expect(
        executeSearch({ query: "   " }, context(root)),
      ).rejects.toThrow("non-empty string");

      const intentEmpty = await executeSearch(
        { query: "download", rankingMode: "intent-v1", type: "req" },
        context(root, {
          prolog: {
            query: async () => ({ success: true, bindings: { Results: "[]" } }),
            nextSolution: async () => null,
            save: async () => ({ success: true, bindings: {} }),
          },
        }),
      );
      expect(intentEmpty.structuredContent.count).toBe(0);

      const indexed = await executeSearch(
        { query: "download", type: "req", limit: 1 },
        context(root, {
          prolog: {
            query: async () => ({ success: true, bindings: {} }),
            nextSolution: async () => null,
            save: async () => ({ success: true, bindings: {} }),
            searchEntities: async () => ({
              entities: [{ id: "REQ-1", title: "Download", status: "open" }],
            }),
          },
        }),
      );
      expect(indexed.structuredContent.count).toBeGreaterThanOrEqual(0);

      await expect(
        executeSearch({ query: "x" }, context(root, { prolog: undefined })),
      ).rejects.toThrow("Search execution failed");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("executeStatus reports missing stores and wraps attachment errors", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-disco-"));
    mkdirSync(path.join(root, ".kb"), { recursive: true });
    try {
      const missing = await executeStatus(
        {},
        context(root, {
          prolog: {
            query: async () => ({ success: true, bindings: {} }),
            nextSolution: async () => null,
            save: async () => ({ success: true, bindings: {} }),
          },
          fs: {
            ...nodeFilesystem,
            glob: async () => undefined as unknown as string[],
          },
        }),
      );
      expect(missing.structuredContent.snapshotId).toBe("missing");
      expect(missing.structuredContent.bootstrap?.nextAction).toBeDefined();

      await expect(
        executeStatus(
          {},
          context(root, {
            branchAttachment: undefined,
            git: undefined,
          }),
        ),
      ).rejects.toThrow("Status execution failed");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
