import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import kibiOpencodePlugin from "../src/index";
import type { PluginInput } from "../src/index";
import { registerIndexCoverageTests } from "./index.coverage.shared";

describe("index kibiOpencodePlugin", () => {
  test("session.idle does not call briefing tools or create brief artifacts", async () => {
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "kibi-opencode-idle-"),
    );
    const toolCalls: string[] = [];
    try {
      const input: PluginInput = {
        directory: tmpDir,
        worktree: tmpDir,
        client: {
          tui: { showToast: async () => {} },
          app: { log: async () => {} },
        },
      };
      const hooks = await kibiOpencodePlugin(input);
      await hooks.event?.({ event: { type: "session.idle", properties: {} } });

      expect(toolCalls).not.toContain("kb_briefing_generate");
      expect(fs.existsSync(path.join(tmpDir, ".kb", "briefs"))).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("system transform does not inject brief guidance", async () => {
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "kibi-opencode-transform-"),
    );
    try {
      const hooks = await kibiOpencodePlugin({
        directory: tmpDir,
        worktree: tmpDir,
        client: { app: { log: async () => {} } },
      } as PluginInput);
      const output = { system: [] as string[] };
      await hooks["experimental.chat.system.transform"]?.(
        { focusFilePath: "src/app.ts" },
        output,
      );
      const rendered = output.system.join("\n");
      expect(rendered).not.toContain("/brief-kibi");
      expect(rendered).not.toContain("kb_briefing_generate");
      expect(rendered).not.toContain("Kibi briefing available");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

registerIndexCoverageTests(kibiOpencodePlugin);
