import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Plugin, PluginInput } from "../src/index";

export function registerIndexCoverageTests(plugin: Plugin): void {
  describe("kibi opencode plugin surface", () => {
    test("returns hooks without registering brief-specific behavior", async () => {
      const tmpDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "kibi-opencode-index-"),
      );
      try {
        const input: PluginInput = {
          directory: tmpDir,
          worktree: tmpDir,
          project: undefined,
          $: undefined,
          client: undefined,
        };

        const hooks = await plugin(input);
        expect(typeof hooks).toBe("object");
        expect(JSON.stringify(hooks)).not.toContain("brief");
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });
}
