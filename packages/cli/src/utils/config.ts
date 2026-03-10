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

/**
 * Shared configuration for Kibi.
 * Stored in .kb/config.json
 */
export interface KbConfig {
  paths: KbConfigPaths;
  defaultBranch?: string;
}

/**
 * Default configuration values for new repositories.
 */
export const DEFAULT_CONFIG: KbConfig = {
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
  defaultBranch: undefined,
};

/**
 * Default paths used by sync command (backward compatible glob patterns).
 */
export const DEFAULT_SYNC_PATHS: KbConfigPaths = {
  requirements: "requirements/**/*.md",
  scenarios: "scenarios/**/*.md",
  tests: "tests/**/*.md",
  adr: "adr/**/*.md",
  flags: "flags/**/*.md",
  events: "events/**/*.md",
  facts: "facts/**/*.md",
  symbols: "symbols.yaml",
};

/**
 * Load and parse the Kibi configuration from .kb/config.json.
 * Falls back to DEFAULT_CONFIG if the file doesn't exist or is invalid.
 *
 * @param cwd - The working directory to look for .kb/config.json
 * @returns The merged configuration (defaults + user config)
 */
export function loadConfig(cwd: string = process.cwd()): KbConfig {
  const configPath = path.join(cwd, ".kb/config.json");

  let userConfig: Partial<KbConfig> = {};
  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, "utf8");
      userConfig = JSON.parse(content) as Partial<KbConfig>;
    } catch {
      // Invalid config, use defaults
      userConfig = {};
    }
  }

  return {
    paths: {
      ...DEFAULT_CONFIG.paths,
      ...userConfig.paths,
    },
    defaultBranch: userConfig.defaultBranch,
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
  const configPath = path.join(cwd, ".kb/config.json");

  let userConfig: Partial<KbConfig> = {};
  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, "utf8");
      userConfig = JSON.parse(content) as Partial<KbConfig>;
    } catch {
      // Invalid config, use defaults
      userConfig = {};
    }
  }

  return {
    paths: {
      ...DEFAULT_SYNC_PATHS,
      ...userConfig.paths,
    },
    defaultBranch: userConfig.defaultBranch,
  };
}
