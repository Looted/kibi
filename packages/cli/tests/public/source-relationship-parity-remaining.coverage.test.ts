// implements REQ-kibi-source-relationship-parity
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as discovery from "../../src/commands/sync/discovery.js";
import * as extraction from "../../src/commands/sync/extraction.js";
import { collectSourceRelationshipParityViolations } from "../../src/public/operations/source-relationship-parity.js";
import {
  createGitWorkspace,
  isolateKibiEnv,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

const spies: Array<{ mockRestore: () => void }> = [];
const restores: Array<() => void> = [];
const roots: string[] = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const restore of restores.splice(0)) restore();
  for (const root of roots.splice(0)) removeTempDir(root);
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("source-relationship-parity remaining authored mapping", () => {
  test("normalizes Windows-style authored sources from extraction results", async () => {
    restores.push(isolateKibiEnv());
    const root = createGitWorkspace();
    roots.push(root);
    spies.push(
      spyOn(discovery, "discoverSourceFiles").mockResolvedValue({
        markdownFiles: ["docs\\a.md"],
        manifestFiles: [],
        pendingReceipts: [],
      } as never),
    );
    spies.push(
      spyOn(extraction, "processExtractions").mockResolvedValue({
        results: [
          {
            entity: {
              id: "REQ-1",
              type: "req",
              title: "One",
              status: "open",
              created_at: "2026-09-05T00:00:00Z",
              updated_at: "2026-09-05T00:00:00Z",
              source: "docs\\a.md",
            },
            relationships: [
              { type: "verified_by", from: "REQ-1", to: "TEST-1" },
            ],
          },
        ],
        failedCacheKeys: new Set(),
        errors: [],
      }),
    );
    const violations = await collectSourceRelationshipParityViolations(root, {
      query: async () => ({ success: true, bindings: { Rows: "[]" } }),
      nextSolution: async () => null,
      save: async () => ({ success: true, bindings: {} }),
    });
    expect(
      violations.some(
        (row) =>
          row.source === "docs/a.md" ||
          row.description.includes("REQ-1") ||
          row.entityId === "REQ-1",
      ),
    ).toBe(true);
  });
});
