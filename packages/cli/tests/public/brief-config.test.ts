import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { loadBriefConfig } from "../../src/public/brief-config.js";

describe("brief-config", () => {
  let tmpDir: string;
  const originalCwd = process.cwd();

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-brief-config-"));
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("legacy config without briefs returns all-true defaults", () => {
    const kbDir = path.join(tmpDir, ".kb");
    mkdirSync(kbDir, { recursive: true });
    writeFileSync(
      path.join(kbDir, "config.json"),
      JSON.stringify({ paths: { requirements: "custom/req" } }),
      "utf8",
    );

    expect(loadBriefConfig(tmpDir)).toEqual({
      enabled: true,
      retention: {
        maxPerBranch: 200,
        maxAgeDays: 14,
        keepUnread: true,
      },
      channels: {
        vscode: true,
        tui: true,
      },
      tui: {
        toast: true,
        appendPrompt: true,
        idleDelayMs: 1500,
      },
    });
  });

  test("partial override preserves unspecified defaults", () => {
    const kbDir = path.join(tmpDir, ".kb");
    mkdirSync(kbDir, { recursive: true });
    writeFileSync(
      path.join(kbDir, "config.json"),
      JSON.stringify({
        briefs: {
          enabled: false,
          channels: {
            tui: false,
          },
          tui: {
            toast: false,
          },
        },
      }),
      "utf8",
    );

    expect(loadBriefConfig(tmpDir)).toEqual({
      enabled: false,
      retention: {
        maxPerBranch: 200,
        maxAgeDays: 14,
        keepUnread: true,
      },
      channels: {
        vscode: true,
        tui: false,
      },
      tui: {
        toast: false,
        appendPrompt: true,
        idleDelayMs: 1500,
      },
    });
  });

  test("full override returns overridden values", () => {
    const kbDir = path.join(tmpDir, ".kb");
    mkdirSync(kbDir, { recursive: true });
    writeFileSync(
      path.join(kbDir, "config.json"),
      JSON.stringify({
        briefs: {
          enabled: false,
          channels: {
            vscode: false,
            tui: false,
          },
          tui: {
            toast: false,
            appendPrompt: false,
          },
        },
      }),
      "utf8",
    );

    expect(loadBriefConfig(tmpDir)).toEqual({
      enabled: false,
      retention: {
        maxPerBranch: 200,
        maxAgeDays: 14,
        keepUnread: true,
      },
      channels: {
        vscode: false,
        tui: false,
      },
      tui: {
        toast: false,
        appendPrompt: false,
        idleDelayMs: 1500,
      },
    });
  });
});
