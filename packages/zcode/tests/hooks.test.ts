// implements REQ-zcode-kibi-plugin-v1
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "bun:test";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const hooksJsonPath = path.join(packageRoot, "hooks", "hooks.json");

/**
 * ZCode supports exactly seven hook events; anything else is unsupported.
 * Matchers are case-sensitive regexes — a bare `*` is an invalid regex that
 * silently never matches, so omission is the only correct "match all".
 */
const SUPPORTED_EVENTS = new Set([
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PermissionRequest",
  "PostToolUse",
  "PostToolUseFailure",
  "Stop",
]);

const COMMAND_HOOK_KEYS = new Set([
  "type",
  "command",
  "shell",
  "timeout",
  "timeoutMs",
  "statusMessage",
  "enabled",
]);

type HookEntry = { type?: string; command?: string; timeoutMs?: number };
type MatcherEntry = { matcher?: string; hooks?: HookEntry[] };

describe("kibi-zcode hooks.json", () => {
  const config = JSON.parse(fs.readFileSync(hooksJsonPath, "utf8")) as {
    hooks?: Record<string, MatcherEntry[]>;
  };

  test("declares only supported ZCode hook events", () => {
    const events = Object.keys(config.hooks ?? {});
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(
        SUPPORTED_EVENTS.has(event),
        `unsupported hook event: ${event}`,
      ).toBe(true);
    }
  });

  test("uses the built hook runner through the plugin-root template", () => {
    for (const [event, entries] of Object.entries(config.hooks ?? {})) {
      expect(entries.length).toBeGreaterThan(0);
      for (const entry of entries) {
        for (const hook of entry.hooks ?? []) {
          expect(hook.type).toBe("command");
          expect(hook.command).toBe(
            'node "${ZCODE_PLUGIN_ROOT}/dist/hook-runner.js"',
          );
          expect(typeof hook.timeoutMs).toBe("number");
          expect(hook.timeoutMs).toBeGreaterThan(0);
          void event;
        }
      }
    }
  });

  test("matchers are valid regexes and never the bare-star trap", () => {
    for (const entries of Object.values(config.hooks ?? {})) {
      for (const entry of entries) {
        if (entry.matcher === undefined) continue;
        expect(entry.matcher).not.toBe("*");
        expect(() => new RegExp(entry.matcher as string)).not.toThrow();
      }
    }
  });

  test("hook entries mix only command-style fields", () => {
    for (const entries of Object.values(config.hooks ?? {})) {
      for (const entry of entries) {
        for (const hook of entry.hooks ?? []) {
          for (const key of Object.keys(hook)) {
            expect(
              COMMAND_HOOK_KEYS.has(key),
              `field ${key} is not valid for command hooks`,
            ).toBe(true);
          }
        }
      }
    }
  });

  test("PreToolUse targets only edit-like tools", () => {
    const preToolUse = config.hooks?.PreToolUse ?? [];
    expect(preToolUse).toHaveLength(1);
    const matcher = preToolUse[0]?.matcher;
    expect(matcher).toBe("Edit|MultiEdit|Write|apply_patch");
    for (const tool of ["Edit", "MultiEdit", "Write", "apply_patch"]) {
      expect(new RegExp(matcher as string).test(tool)).toBe(true);
    }
    for (const tool of ["Read", "Bash", "Agent", "edit"]) {
      expect(new RegExp(matcher as string).test(tool)).toBe(false);
    }
  });

  test("each declared event has exactly one hook entry", () => {
    for (const entries of Object.values(config.hooks ?? {})) {
      expect(entries).toHaveLength(1);
      expect(entries[0]?.hooks).toHaveLength(1);
    }
  });
});
