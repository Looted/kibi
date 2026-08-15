import { describe, expect, test } from "bun:test";

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
});
