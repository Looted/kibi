/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

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
import {
  DEFAULT_CONFIG,
  DEFAULT_SYNC_PATHS,
  loadConfig,
  loadSyncConfig,
} from "../../src/utils/config.js"; // implements TEST-001

describe("config", () => {
  let tmpDir: string;
  const originalCwd = process.cwd();

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-config-"));
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe("loadConfig", () => {
    test("returns default config when .kb/config.json does not exist", () => {
      const config = loadConfig(tmpDir);

      expect(config.paths).toEqual(DEFAULT_CONFIG.paths);
      expect(config.briefs).toEqual(DEFAULT_CONFIG.briefs);
      expect(config.checks).toBeDefined();
      expect(config.checks?.rules).toBeDefined();
      expect(config.checks?.symbolTraceability).toBeDefined();
    });

    test("returns default config when .kb directory does not exist", () => {
      // Ensure .kb doesn't exist
      const kbDir = path.join(tmpDir, ".kb");
      if (existsSync(kbDir)) {
        rmSync(kbDir, { recursive: true });
      }

      const config = loadConfig(tmpDir);

      expect(config.paths).toEqual(DEFAULT_CONFIG.paths);
      expect(config.checks).toBeDefined();
    });

    test("handles invalid JSON in config file gracefully", () => {
      const kbDir = path.join(tmpDir, ".kb");
      mkdirSync(kbDir, { recursive: true });
      const configPath = path.join(kbDir, "config.json");
      writeFileSync(configPath, "invalid json {{{", "utf8");

      const config = loadConfig(tmpDir);

      // Should fall back to defaults
      expect(config.paths).toEqual(DEFAULT_CONFIG.paths);
      expect(config.checks).toBeDefined();
    });

    test("handles empty config file", () => {
      const kbDir = path.join(tmpDir, ".kb");
      mkdirSync(kbDir, { recursive: true });
      const configPath = path.join(kbDir, "config.json");
      writeFileSync(configPath, "", "utf8");

      const config = loadConfig(tmpDir);

      // Should fall back to defaults
      expect(config.paths).toEqual(DEFAULT_CONFIG.paths);
      expect(config.checks).toBeDefined();
    });

    test("merges user paths with defaults - partial override", () => {
      const kbDir = path.join(tmpDir, ".kb");
      mkdirSync(kbDir, { recursive: true });
      const configPath = path.join(kbDir, "config.json");
      writeFileSync(
        configPath,
        JSON.stringify({
          paths: {
            requirements: "custom/req",
          },
        }),
        "utf8",
      );

      const config = loadConfig(tmpDir);

      expect(config.paths.requirements).toBe("custom/req");
      expect(config.paths.scenarios).toBe(DEFAULT_CONFIG.paths.scenarios);
      expect(config.paths.tests).toBe(DEFAULT_CONFIG.paths.tests);
      expect(config.paths.adr).toBe(DEFAULT_CONFIG.paths.adr);
    });

    test("merges briefs config - legacy config gets defaults", () => {
      const kbDir = path.join(tmpDir, ".kb");
      mkdirSync(kbDir, { recursive: true });
      const configPath = path.join(kbDir, "config.json");
      writeFileSync(
        configPath,
        JSON.stringify({
          paths: {
            requirements: "custom/req",
          },
        }),
        "utf8",
      );

      const config = loadConfig(tmpDir);

      expect(config.briefs).toEqual(DEFAULT_CONFIG.briefs);
    });

    test("merges briefs config - partial override preserves defaults", () => {
      const kbDir = path.join(tmpDir, ".kb");
      mkdirSync(kbDir, { recursive: true });
      const configPath = path.join(kbDir, "config.json");
      writeFileSync(
        configPath,
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

      const config = loadConfig(tmpDir);

      expect(config.briefs).toEqual({
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

    test("merges all user paths with defaults", () => {
      const kbDir = path.join(tmpDir, ".kb");
      mkdirSync(kbDir, { recursive: true });
      const configPath = path.join(kbDir, "config.json");
      writeFileSync(
        configPath,
        JSON.stringify({
          paths: {
            requirements: "custom/req",
            scenarios: "custom/scen",
            tests: "custom/tests",
            adr: "custom/adr",
            flags: "custom/flags",
            events: "custom/events",
            facts: "custom/facts",
            symbols: "custom/symbols.yaml",
          },
        }),
        "utf8",
      );

      const config = loadConfig(tmpDir);

      expect(config.paths.requirements).toBe("custom/req");
      expect(config.paths.scenarios).toBe("custom/scen");
      expect(config.paths.tests).toBe("custom/tests");
      expect(config.paths.adr).toBe("custom/adr");
      expect(config.paths.flags).toBe("custom/flags");
      expect(config.paths.events).toBe("custom/events");
      expect(config.paths.facts).toBe("custom/facts");
      expect(config.paths.symbols).toBe("custom/symbols.yaml");
    });

    test("preserves defaultBranch from user config", () => {
      const kbDir = path.join(tmpDir, ".kb");
      mkdirSync(kbDir, { recursive: true });
      const configPath = path.join(kbDir, "config.json");
      writeFileSync(
        configPath,
        JSON.stringify({
          defaultBranch: "trunk",
        }),
        "utf8",
      );

      const config = loadConfig(tmpDir);

      expect(config.defaultBranch).toBe("trunk");
    });

    test("preserves defaultBranch with special characters", () => {
      const kbDir = path.join(tmpDir, ".kb");
      mkdirSync(kbDir, { recursive: true });
      const configPath = path.join(kbDir, "config.json");
      writeFileSync(
        configPath,
        JSON.stringify({
          defaultBranch: "feature/nested-branch",
        }),
        "utf8",
      );

      const config = loadConfig(tmpDir);

      expect(config.defaultBranch).toBe("feature/nested-branch");
    });

    test("defaultBranch is undefined when not set in config", () => {
      const kbDir = path.join(tmpDir, ".kb");
      mkdirSync(kbDir, { recursive: true });
      const configPath = path.join(kbDir, "config.json");
      writeFileSync(
        configPath,
        JSON.stringify({
          paths: {
            requirements: "custom/req",
          },
        }),
        "utf8",
      );

      const config = loadConfig(tmpDir);

      expect(config.defaultBranch).toBeUndefined();
    });

    test("merges checks config - partial rules override", () => {
      const kbDir = path.join(tmpDir, ".kb");
      mkdirSync(kbDir, { recursive: true });
      const configPath = path.join(kbDir, "config.json");
      writeFileSync(
        configPath,
        JSON.stringify({
          checks: {
            rules: {
              "must-priority-coverage": false,
            },
          },
        }),
        "utf8",
      );

      const config = loadConfig(tmpDir);

      expect(config.checks).toBeDefined();
      expect(config.checks?.rules["must-priority-coverage"]).toBe(false);
      expect(config.checks?.rules["symbol-coverage"]).toBe(true);
      expect(config.checks?.rules["no-dangling-refs"]).toBe(true);
    });

    test("merges checks config - partial symbolTraceability override", () => {
      const kbDir = path.join(tmpDir, ".kb");
      mkdirSync(kbDir, { recursive: true });
      const configPath = path.join(kbDir, "config.json");
      writeFileSync(
        configPath,
        JSON.stringify({
          checks: {
            symbolTraceability: {
              requireAdr: true,
            },
          },
        }),
        "utf8",
      );

      const config = loadConfig(tmpDir);

      expect(config.checks).toBeDefined();
      expect(config.checks?.symbolTraceability.requireAdr).toBe(true);
    });

    test("merges checks config - full override", () => {
      const kbDir = path.join(tmpDir, ".kb");
      mkdirSync(kbDir, { recursive: true });
      const configPath = path.join(kbDir, "config.json");
      writeFileSync(
        configPath,
        JSON.stringify({
          checks: {
            rules: {
              "must-priority-coverage": false,
              "symbol-coverage": false,
            },
            symbolTraceability: {
              requireAdr: true,
            },
          },
        }),
        "utf8",
      );

      const config = loadConfig(tmpDir);

      expect(config.checks).toBeDefined();
      expect(config.checks?.rules["must-priority-coverage"]).toBe(false);
      expect(config.checks?.rules["symbol-coverage"]).toBe(false);
      expect(config.checks?.rules["no-dangling-refs"]).toBe(true);
      expect(config.checks?.symbolTraceability.requireAdr).toBe(true);
    });

    test("uses default checks when no checks in config", () => {
      const kbDir = path.join(tmpDir, ".kb");
      mkdirSync(kbDir, { recursive: true });
      const configPath = path.join(kbDir, "config.json");
      writeFileSync(
        configPath,
        JSON.stringify({
          paths: {
            requirements: "custom/req",
          },
        }),
        "utf8",
      );

      const config = loadConfig(tmpDir);

      expect(config.checks).toBeDefined();
      expect(config.checks?.rules["must-priority-coverage"]).toBe(true);
      expect(config.checks?.symbolTraceability.requireAdr).toBe(false);
    });

    test("handles complex config with all fields", () => {
      const kbDir = path.join(tmpDir, ".kb");
      mkdirSync(kbDir, { recursive: true });
      const configPath = path.join(kbDir, "config.json");
      writeFileSync(
        configPath,
        JSON.stringify({
          paths: {
            requirements: "docs/requirements",
            scenarios: "docs/scenarios",
          },
          defaultBranch: "develop",
          checks: {
            rules: {
              "must-priority-coverage": false,
            },
            symbolTraceability: {
              requireAdr: true,
            },
          },
        }),
        "utf8",
      );

      const config = loadConfig(tmpDir);

      expect(config.paths.requirements).toBe("docs/requirements");
      expect(config.paths.scenarios).toBe("docs/scenarios");
      expect(config.paths.tests).toBe(DEFAULT_CONFIG.paths.tests);
      expect(config.defaultBranch).toBe("develop");
      expect(config.checks?.rules["must-priority-coverage"]).toBe(false);
      expect(config.checks?.symbolTraceability.requireAdr).toBe(true);
    });
  });

  describe("loadSyncConfig", () => {
    test("returns default sync config when .kb/config.json does not exist", () => {
      const config = loadSyncConfig(tmpDir);

      expect(config.paths).toEqual(DEFAULT_SYNC_PATHS);
      expect(config.briefs).toEqual(DEFAULT_CONFIG.briefs);
      expect(config.checks).toBeDefined();
      expect(config.checks?.rules).toBeDefined();
      expect(config.checks?.symbolTraceability).toBeDefined();
    });

    test("returns default sync config when .kb directory does not exist", () => {
      const kbDir = path.join(tmpDir, ".kb");
      if (existsSync(kbDir)) {
        rmSync(kbDir, { recursive: true });
      }

      const config = loadSyncConfig(tmpDir);

      expect(config.paths).toEqual(DEFAULT_SYNC_PATHS);
      expect(config.checks).toBeDefined();
    });

    test("handles invalid JSON in config file gracefully", () => {
      const kbDir = path.join(tmpDir, ".kb");
      mkdirSync(kbDir, { recursive: true });
      const configPath = path.join(kbDir, "config.json");
      writeFileSync(configPath, "invalid json {{{", "utf8");

      const config = loadSyncConfig(tmpDir);

      // Should fall back to defaults
      expect(config.paths).toEqual(DEFAULT_SYNC_PATHS);
      expect(config.checks).toBeDefined();
    });

    test("handles empty config file", () => {
      const kbDir = path.join(tmpDir, ".kb");
      mkdirSync(kbDir, { recursive: true });
      const configPath = path.join(kbDir, "config.json");
      writeFileSync(configPath, "", "utf8");

      const config = loadSyncConfig(tmpDir);

      // Should fall back to defaults
      expect(config.paths).toEqual(DEFAULT_SYNC_PATHS);
      expect(config.checks).toBeDefined();
    });

    test("merges user paths with DEFAULT_SYNC_PATHS", () => {
      const kbDir = path.join(tmpDir, ".kb");
      mkdirSync(kbDir, { recursive: true });
      const configPath = path.join(kbDir, "config.json");
      writeFileSync(
        configPath,
        JSON.stringify({
          paths: {
            requirements: "custom/requirements/**/*.md",
          },
        }),
        "utf8",
      );

      const config = loadSyncConfig(tmpDir);

      expect(config.paths.requirements).toBe("custom/requirements/**/*.md");
      expect(config.paths.scenarios).toBe(DEFAULT_SYNC_PATHS.scenarios);
      expect(config.paths.tests).toBe(DEFAULT_SYNC_PATHS.tests);
      expect(config.paths.adr).toBe(DEFAULT_SYNC_PATHS.adr);
    });

    test("merges briefs config - legacy config gets defaults", () => {
      const kbDir = path.join(tmpDir, ".kb");
      mkdirSync(kbDir, { recursive: true });
      const configPath = path.join(kbDir, "config.json");
      writeFileSync(
        configPath,
        JSON.stringify({
          paths: {
            requirements: "custom/**/*.md",
          },
        }),
        "utf8",
      );

      const config = loadSyncConfig(tmpDir);

      expect(config.briefs).toEqual(DEFAULT_CONFIG.briefs);
    });

    test("merges briefs config - partial override preserves defaults", () => {
      const kbDir = path.join(tmpDir, ".kb");
      mkdirSync(kbDir, { recursive: true });
      const configPath = path.join(kbDir, "config.json");
      writeFileSync(
        configPath,
        JSON.stringify({
          briefs: {
            enabled: false,
            channels: {
              vscode: false,
            },
            tui: {
              appendPrompt: false,
            },
          },
        }),
        "utf8",
      );

      const config = loadSyncConfig(tmpDir);

      expect(config.briefs).toEqual({
        enabled: false,
        retention: {
          maxPerBranch: 200,
          maxAgeDays: 14,
          keepUnread: true,
        },
        channels: {
          vscode: false,
          tui: true,
        },
        tui: {
          toast: true,
          appendPrompt: false,
          idleDelayMs: 1500,
        },
      });
    });

    test("merges all user paths with DEFAULT_SYNC_PATHS", () => {
      const kbDir = path.join(tmpDir, ".kb");
      mkdirSync(kbDir, { recursive: true });
      const configPath = path.join(kbDir, "config.json");
      writeFileSync(
        configPath,
        JSON.stringify({
          paths: {
            requirements: "docs/**/*.md",
            scenarios: "docs/scenarios/**/*.md",
            tests: "docs/tests/**/*.md",
            adr: "docs/adr/**/*.md",
            flags: "docs/flags/**/*.md",
            events: "docs/events/**/*.md",
            facts: "docs/facts/**/*.md",
            symbols: "docs/symbols.yaml",
          },
        }),
        "utf8",
      );

      const config = loadSyncConfig(tmpDir);

      expect(config.paths.requirements).toBe("docs/**/*.md");
      expect(config.paths.scenarios).toBe("docs/scenarios/**/*.md");
      expect(config.paths.tests).toBe("docs/tests/**/*.md");
      expect(config.paths.adr).toBe("docs/adr/**/*.md");
      expect(config.paths.flags).toBe("docs/flags/**/*.md");
      expect(config.paths.events).toBe("docs/events/**/*.md");
      expect(config.paths.facts).toBe("docs/facts/**/*.md");
      expect(config.paths.symbols).toBe("docs/symbols.yaml");
    });

    test("preserves defaultBranch from user config", () => {
      const kbDir = path.join(tmpDir, ".kb");
      mkdirSync(kbDir, { recursive: true });
      const configPath = path.join(kbDir, "config.json");
      writeFileSync(
        configPath,
        JSON.stringify({
          defaultBranch: "trunk",
        }),
        "utf8",
      );

      const config = loadSyncConfig(tmpDir);

      expect(config.defaultBranch).toBe("trunk");
    });

    test("preserves defaultBranch with special characters", () => {
      const kbDir = path.join(tmpDir, ".kb");
      mkdirSync(kbDir, { recursive: true });
      const configPath = path.join(kbDir, "config.json");
      writeFileSync(
        configPath,
        JSON.stringify({
          defaultBranch: "release/v1.0.0",
        }),
        "utf8",
      );

      const config = loadSyncConfig(tmpDir);

      expect(config.defaultBranch).toBe("release/v1.0.0");
    });

    test("defaultBranch is undefined when not set in config", () => {
      const kbDir = path.join(tmpDir, ".kb");
      mkdirSync(kbDir, { recursive: true });
      const configPath = path.join(kbDir, "config.json");
      writeFileSync(
        configPath,
        JSON.stringify({
          paths: {
            requirements: "custom/**/*.md",
          },
        }),
        "utf8",
      );

      const config = loadSyncConfig(tmpDir);

      expect(config.defaultBranch).toBeUndefined();
    });

    test("merges checks config - partial rules override", () => {
      const kbDir = path.join(tmpDir, ".kb");
      mkdirSync(kbDir, { recursive: true });
      const configPath = path.join(kbDir, "config.json");
      writeFileSync(
        configPath,
        JSON.stringify({
          checks: {
            rules: {
              "symbol-coverage": false,
            },
          },
        }),
        "utf8",
      );

      const config = loadSyncConfig(tmpDir);

      expect(config.checks).toBeDefined();
      expect(config.checks?.rules["symbol-coverage"]).toBe(false);
      expect(config.checks?.rules["must-priority-coverage"]).toBe(true);
      expect(config.checks?.rules["no-cycles"]).toBe(true);
    });

    test("merges checks config - partial symbolTraceability override", () => {
      const kbDir = path.join(tmpDir, ".kb");
      mkdirSync(kbDir, { recursive: true });
      const configPath = path.join(kbDir, "config.json");
      writeFileSync(
        configPath,
        JSON.stringify({
          checks: {
            symbolTraceability: {
              requireAdr: true,
            },
          },
        }),
        "utf8",
      );

      const config = loadSyncConfig(tmpDir);

      expect(config.checks).toBeDefined();
      expect(config.checks?.symbolTraceability.requireAdr).toBe(true);
    });

    test("merges checks config - full override", () => {
      const kbDir = path.join(tmpDir, ".kb");
      mkdirSync(kbDir, { recursive: true });
      const configPath = path.join(kbDir, "config.json");
      writeFileSync(
        configPath,
        JSON.stringify({
          checks: {
            rules: {
              "no-dangling-refs": false,
              "no-cycles": false,
            },
            symbolTraceability: {
              requireAdr: true,
            },
          },
        }),
        "utf8",
      );

      const config = loadSyncConfig(tmpDir);

      expect(config.checks).toBeDefined();
      expect(config.checks?.rules["no-dangling-refs"]).toBe(false);
      expect(config.checks?.rules["no-cycles"]).toBe(false);
      expect(config.checks?.rules["must-priority-coverage"]).toBe(true);
      expect(config.checks?.symbolTraceability.requireAdr).toBe(true);
    });

    test("uses default checks when no checks in config", () => {
      const kbDir = path.join(tmpDir, ".kb");
      mkdirSync(kbDir, { recursive: true });
      const configPath = path.join(kbDir, "config.json");
      writeFileSync(
        configPath,
        JSON.stringify({
          paths: {
            requirements: "custom/**/*.md",
          },
        }),
        "utf8",
      );

      const config = loadSyncConfig(tmpDir);

      expect(config.checks).toBeDefined();
      expect(config.checks?.rules["must-priority-coverage"]).toBe(true);
      expect(config.checks?.symbolTraceability.requireAdr).toBe(false);
    });

    test("handles complex config with all fields", () => {
      const kbDir = path.join(tmpDir, ".kb");
      mkdirSync(kbDir, { recursive: true });
      const configPath = path.join(kbDir, "config.json");
      writeFileSync(
        configPath,
        JSON.stringify({
          paths: {
            requirements: "docs/requirements/**/*.md",
            scenarios: "docs/scenarios/**/*.md",
          },
          defaultBranch: "develop",
          checks: {
            rules: {
              "no-dangling-refs": false,
            },
            symbolTraceability: {
              requireAdr: true,
            },
          },
        }),
        "utf8",
      );

      const config = loadSyncConfig(tmpDir);

      expect(config.paths.requirements).toBe("docs/requirements/**/*.md");
      expect(config.paths.scenarios).toBe("docs/scenarios/**/*.md");
      expect(config.paths.tests).toBe(DEFAULT_SYNC_PATHS.tests);
      expect(config.defaultBranch).toBe("develop");
      expect(config.checks?.rules["no-dangling-refs"]).toBe(false);
      expect(config.checks?.symbolTraceability.requireAdr).toBe(true);
    });
  });

  describe("config constants", () => {
    test("DEFAULT_CONFIG has all required paths", () => {
      expect(DEFAULT_CONFIG.paths).toBeDefined();
      expect(DEFAULT_CONFIG.paths.requirements).toBeDefined();
      expect(DEFAULT_CONFIG.paths.scenarios).toBeDefined();
      expect(DEFAULT_CONFIG.paths.tests).toBeDefined();
      expect(DEFAULT_CONFIG.paths.adr).toBeDefined();
      expect(DEFAULT_CONFIG.paths.flags).toBeDefined();
      expect(DEFAULT_CONFIG.paths.events).toBeDefined();
      expect(DEFAULT_CONFIG.paths.facts).toBeDefined();
      expect(DEFAULT_CONFIG.paths.symbols).toBeDefined();
    });

    test("DEFAULT_CONFIG has briefs config", () => {
      expect(DEFAULT_CONFIG.briefs).toEqual({
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

    test("DEFAULT_CONFIG has checks config", () => {
      expect(DEFAULT_CONFIG.checks).toBeDefined();
      expect(DEFAULT_CONFIG.checks?.rules).toBeDefined();
      expect(DEFAULT_CONFIG.checks?.symbolTraceability).toBeDefined();
    });

    test("DEFAULT_SYNC_PATHS uses glob patterns", () => {
      expect(DEFAULT_SYNC_PATHS.requirements).toMatch("**/*.md");
      expect(DEFAULT_SYNC_PATHS.scenarios).toMatch("**/*.md");
      expect(DEFAULT_SYNC_PATHS.tests).toMatch("**/*.md");
      expect(DEFAULT_SYNC_PATHS.adr).toMatch("**/*.md");
      expect(DEFAULT_SYNC_PATHS.flags).toMatch("**/*.md");
      expect(DEFAULT_SYNC_PATHS.events).toMatch("**/*.md");
      expect(DEFAULT_SYNC_PATHS.facts).toMatch("**/*.md");
      expect(DEFAULT_SYNC_PATHS.symbols).toBe("symbols.yaml");
    });

    test("DEFAULT_SYNC_PATHS differs from DEFAULT_CONFIG paths", () => {
      // loadConfig uses plain paths, loadSyncConfig uses glob patterns
      expect(DEFAULT_SYNC_PATHS.requirements).not.toBe(
        DEFAULT_CONFIG.paths.requirements,
      );
      expect(DEFAULT_SYNC_PATHS.scenarios).not.toBe(
        DEFAULT_CONFIG.paths.scenarios,
      );
      expect(DEFAULT_SYNC_PATHS.tests).not.toBe(DEFAULT_CONFIG.paths.tests);
    });
  });
});
