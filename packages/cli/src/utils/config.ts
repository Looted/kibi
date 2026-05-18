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

import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import {
  type ChecksConfig,
  DEFAULT_CHECKS_CONFIG,
  type SymbolTraceabilityOptions,
} from "./rule-registry.js";
import { LATEST_KB_SCHEMA_VERSION } from "./schema-version.js";

/**
 * Configuration paths for entity documentation directories.
 */
export interface KbConfigPaths {
  requirements?: string;
  scenarios?: string;
  tests?: string;
  adr?: string;
  flags?: string;
  events?: string;
  facts?: string;
  symbols?: string;
}

export interface BriefsConfig {
  enabled: boolean;
  retention?: {
    maxPerBranch?: number;
    maxAgeDays?: number;
    keepUnread?: boolean;
  };
  channels: {
    vscode: boolean;
    tui: boolean;
  };
  tui: {
    toast: boolean;
    appendPrompt: boolean;
    idleDelayMs?: number;
  };
}

/**
 * Shared configuration for Kibi.
 * Stored in .kb/config.json
 */
export interface KbConfig {
  paths: KbConfigPaths;
  schemaVersion?: number | string;
  briefs?: BriefsConfig;
  /**
   * @deprecated defaultBranch is deprecated. Branch lifecycle now follows git naturally
   * without requiring a configured default. This field is ignored but kept for compatibility.
   */
  defaultBranch?: string;
  checks?: ChecksConfig;
}

export type { ChecksConfig, SymbolTraceabilityOptions };

/**
 * Default configuration values for new repositories.
 */
const DEFAULT_BRIEFS_CONFIG: BriefsConfig = {
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
};

// implements REQ-003
export const DEFAULT_CONFIG: KbConfig & { $schema: string } = { // implements REQ-003
  $schema:
    "https://raw.githubusercontent.com/Looted/kibi/master/packages/cli/schema/config.json",
  schemaVersion: LATEST_KB_SCHEMA_VERSION,
  paths: {
    requirements: "documentation/requirements",
    scenarios: "documentation/scenarios",
    tests: "documentation/tests",
    adr: "documentation/adr",
    flags: "documentation/flags",
    events: "documentation/events",
    facts: "documentation/facts",
    symbols: "documentation/symbols.yaml",
  },
  briefs: DEFAULT_BRIEFS_CONFIG,
  checks: DEFAULT_CHECKS_CONFIG,
};

/**
 * Default paths used by sync command (backward compatible glob patterns).
 */
export const DEFAULT_SYNC_PATHS: KbConfigPaths = { // implements REQ-003
  requirements: "requirements/**/*.md",
  scenarios: "scenarios/**/*.md",
  tests: "tests/**/*.md",
  adr: "adr/**/*.md",
  flags: "flags/**/*.md",
  events: "events/**/*.md",
  facts: "facts/**/*.md",
  symbols: "symbols.yaml",
};

function mergeBriefsConfig(userBriefs?: Partial<BriefsConfig>): BriefsConfig {
  return {
    ...DEFAULT_BRIEFS_CONFIG,
    ...userBriefs,
    channels: {
      ...DEFAULT_BRIEFS_CONFIG.channels,
      ...userBriefs?.channels,
    },
    tui: {
      ...DEFAULT_BRIEFS_CONFIG.tui,
      ...userBriefs?.tui,
    },
    retention: {
      ...DEFAULT_BRIEFS_CONFIG.retention,
      ...userBriefs?.retention,
    },
  };
}

function readUserConfig(
  configPath: string,
): { userConfig: Partial<KbConfig>; useDefaultSchemaVersion: boolean } {
  if (!existsSync(configPath)) {
    return {
      userConfig: {},
      useDefaultSchemaVersion: true,
    };
  }

  try {
    const content = readFileSync(configPath, "utf8");

    return {
      userConfig: JSON.parse(content) as Partial<KbConfig>,
      useDefaultSchemaVersion: false,
    };
  } catch {
    return {
      userConfig: {},
      useDefaultSchemaVersion: true,
    };
  }
}

/**
 * Load and parse the Kibi configuration from .kb/config.json.
 * Falls back to DEFAULT_CONFIG if the file doesn't exist or is invalid.
 *
 * @param cwd - The working directory to look for .kb/config.json
 * @returns The merged configuration (defaults + user config)
 */
export function loadConfig(cwd: string = process.cwd()): KbConfig {
  // implements REQ-003
  const configPath = path.join(cwd, ".kb/config.json");
  const { userConfig, useDefaultSchemaVersion } = readUserConfig(configPath);

  return {
    paths: {
      ...DEFAULT_CONFIG.paths,
      ...userConfig.paths,
    },
    ...((userConfig.schemaVersion !== undefined || useDefaultSchemaVersion)
      ? {
          schemaVersion:
            userConfig.schemaVersion ?? DEFAULT_CONFIG.schemaVersion,
        }
      : {}),
    briefs: mergeBriefsConfig(userConfig.briefs),
    ...(userConfig.defaultBranch !== undefined
      ? { defaultBranch: userConfig.defaultBranch }
      : {}),
    checks: userConfig.checks
      ? {
          rules: {
            ...DEFAULT_CHECKS_CONFIG.rules,
            ...userConfig.checks.rules,
          },
          symbolTraceability: {
            ...DEFAULT_CHECKS_CONFIG.symbolTraceability,
            ...userConfig.checks.symbolTraceability,
          },
        }
      : DEFAULT_CHECKS_CONFIG,
  };
}

/**
 * Load sync configuration with fallback to glob patterns.
 * This is used by sync.ts to maintain backward compatibility with
 * older config files that may use glob patterns.
 *
 * @param cwd - The working directory to look for .kb/config.json
 * @returns The merged configuration with sync-compatible paths
 */
export function loadSyncConfig(cwd: string = process.cwd()): KbConfig {
  // implements REQ-003
  const configPath = path.join(cwd, ".kb/config.json");
  const { userConfig, useDefaultSchemaVersion } = readUserConfig(configPath);

  return {
    paths: {
      ...DEFAULT_SYNC_PATHS,
      ...userConfig.paths,
    },
    ...((userConfig.schemaVersion !== undefined || useDefaultSchemaVersion)
      ? {
          schemaVersion:
            userConfig.schemaVersion ?? DEFAULT_CONFIG.schemaVersion,
        }
      : {}),
    briefs: mergeBriefsConfig(userConfig.briefs),
    ...(userConfig.defaultBranch !== undefined
      ? { defaultBranch: userConfig.defaultBranch }
      : {}),
    checks: userConfig.checks
      ? {
          rules: {
            ...DEFAULT_CHECKS_CONFIG.rules,
            ...userConfig.checks.rules,
          },
          symbolTraceability: {
            ...DEFAULT_CHECKS_CONFIG.symbolTraceability,
            ...userConfig.checks.symbolTraceability,
          },
        }
      : DEFAULT_CHECKS_CONFIG,
  };
}
