import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import kibiOpencodePlugin from "../src/index";

describe("hook contract", () => {
  test("system.transform remains text-only and does not fetch live briefings", async () => {
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "kibi-hook-contract-"),
    );
    try {
      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: tmpDir,
        client: { app: { log: async () => {} } },
      });
      const output = { system: [] as string[] };
      await hooks["experimental.chat.system.transform"]?.({}, output);
      const injected = output.system.join("\n");

      expect(injected).toContain("MCP tools are visible");
      expect(injected).toContain("trusted local Kibi CLI");
      expect(injected).toContain("--input");
      expect(injected).toContain("neither interface is available");
      expect(injected).toContain("Do not read or edit `.kb/` files directly");
      expect(injected).toContain("Query before mutate");
      expect(injected).toContain("sequentially");
      expect(injected).toContain("`kb_check` before completion");
      expect(injected).not.toContain("/brief-kibi");
      expect(injected).not.toContain("kb_briefing_generate");
      expect(injected).not.toContain("briefingState");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
