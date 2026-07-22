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
      });
      expect(seeded.exitCode, seeded.stderr).toBe(0);

      // When
      const result = await runCliJsonRoute(workspace.root, "delete", {
        ids: ["REQ-DELETE-CLI", "REQ-MISSING"],
      });

      // Then
      expect(result.exitCode, result.stderr).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({
        deleted: 1,
        skipped: 1,
        errors: ["Entity REQ-MISSING does not exist"],
      });
    } finally {
      await workspace.cleanup();
    }
  }, 30_000);
});
