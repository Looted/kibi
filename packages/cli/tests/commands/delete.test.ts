import { describe, expect, test } from "bun:test";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { createParityWorkspace } from "../parity/helpers.js";
import { runCliJsonRoute } from "../parity/runner.js";

describe("delete JSON command", () => {
  test("processes multiple ids from --input", async () => {
    // Given
    const workspace = await createParityWorkspace();

    try {
      const seeded = await runCliJsonRoute(workspace.root, "upsert", {
        type: "req",
        id: "REQ-DELETE-CLI",
        properties: { title: "Delete through CLI", status: "open" },
        document: { path: "requirements/REQ-DELETE-CLI.md" },
      });
      expect(seeded.exitCode, seeded.stderr).toBe(0);

      // When
      const result = await runCliJsonRoute(workspace.root, "delete", {
        ids: ["REQ-DELETE-CLI", "REQ-MISSING"],
      });

      // Then
      expect(result.exitCode, result.stderr).toBe(0);
      const data = JSON.parse(result.stdout).data;
      expect(data.deleted).toBe(0);
      expect(data.deletionPlan.version).toBe("kibi.entity-deletion-plan.v1");
      expect(data.deletionPlan.entityIds).toEqual(["REQ-DELETE-CLI"]);
      expect(data.deletionPlan.sourceWrites[0].mode).toBe("delete");
      expect(data.errors[0]).toContain("supersession");
    } finally {
      await workspace.cleanup();
    }
  }, 30_000);

  test("composes two authored symbol deletions into one plan write", async () => {
    const workspace = await createParityWorkspace();

    try {
      const symbolsPath = path.join(workspace.root, "symbols.yaml");
      await writeFile(symbolsPath, "symbols: []\n", "utf8");
      const upsertSymbol = async (id: string, title: string) => {
        const result = await runCliJsonRoute(workspace.root, "upsert", {
          type: "symbol",
          id,
          properties: {
            title,
            status: "active",
            source: "symbols.yaml",
            sourceFile: "src/launcher.ts",
            symbol_role: "behavioral",
            granularity_reason: "legacy-link",
          },
          document: { path: "symbols.yaml" },
        });
        expect(result.exitCode, result.stderr).toBe(0);
      };

      await upsertSymbol("SYM-DELETE-FIRST", "first");
      await upsertSymbol("SYM-DELETE-SECOND", "second");

      const deletion = await runCliJsonRoute(workspace.root, "delete", {
        ids: ["SYM-DELETE-FIRST", "SYM-DELETE-SECOND"],
      });
      expect(deletion.exitCode, deletion.stderr).toBe(0);
      const deletionData = JSON.parse(deletion.stdout).data;
      expect(deletionData.deletionPlan.entityIds).toEqual([
        "SYM-DELETE-FIRST",
        "SYM-DELETE-SECOND",
      ]);
      expect(deletionData.deletionPlan.sourceWrites).toHaveLength(1);
      expect(deletionData.deletionPlan.sourceWrites[0].path).toBe(
        "symbols.yaml",
      );

      const applied = await runCliJsonRoute(workspace.root, "apply-plan", {
        plan: deletionData.deletionPlan,
        approvedPlanHash: deletionData.deletionPlan.planHash,
      });
      expect(applied.exitCode, applied.stderr).toBe(0);
      expect(JSON.parse(applied.stdout).data.deleted).toBe(2);

      const remaining = await readFile(symbolsPath, "utf8");
      expect(remaining).toBe("symbols: []\n");
    } finally {
      await workspace.cleanup();
    }
  }, 60_000);
});
