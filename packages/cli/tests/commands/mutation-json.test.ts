import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

import { createParityWorkspace } from "../parity/helpers.js";

describe("mutation JSON command adapters", () => {
  test("accepts a single upsert payload through --input stdin", async () => {
    // Given
    const workspace = await createParityWorkspace();
    const kibiBin = fileURLToPath(new URL("../../bin/kibi", import.meta.url));
    const input = {
      type: "req",
      id: "REQ-TEST",
      properties: { title: "test", status: "open" },
    };

    try {
      // When
      const child = Bun.spawn(
        ["bun", "run", kibiBin, "upsert", "--input", "-"],
        {
          cwd: workspace.root,
          env: { ...process.env, KIBI_WORKSPACE: workspace.root },
          stdin: new Blob([JSON.stringify(input)]),
          stdout: "pipe",
          stderr: "pipe",
        },
      );
      const [exitCode, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ]);

      // Then
      expect(exitCode, stderr).toBe(0);
      expect(JSON.parse(stdout)).toMatchObject({ created: 1, updated: 0 });
    } finally {
      await workspace.cleanup();
    }
  }, 30_000);
});
