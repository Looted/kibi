/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import {
  type ChecksConfig,
  DEFAULT_CHECKS_CONFIG,
  RULE_NAMES,
} from "kibi-cli/public/check-types";

// implements REQ-002
export async function loadChecksConfig(
  workspaceRoot: string,
): Promise<ChecksConfig> {
  const configPath = path.join(workspaceRoot, ".kb", "config.json");

  try {
    const content = await readFile(configPath, "utf8");
    const parsed = JSON.parse(content) as {
      checks?: Partial<ChecksConfig>;
    };

    const parsedRules = parsed.checks?.rules;
    const normalizedRules: Record<string, boolean> = {
      ...DEFAULT_CHECKS_CONFIG.rules,
    };
    if (parsedRules && typeof parsedRules === "object") {
      for (const [key, value] of Object.entries(parsedRules)) {
        if (typeof value === "boolean") {
          normalizedRules[key] = value;
        }
      }
    }

    const parsedSt = parsed.checks?.symbolTraceability;
    const normalizedSt = { ...DEFAULT_CHECKS_CONFIG.symbolTraceability };
    if (
      parsedSt &&
      typeof parsedSt === "object" &&
      typeof parsedSt.requireAdr === "boolean"
    ) {
      normalizedSt.requireAdr = parsedSt.requireAdr;
    }

    return {
      rules: normalizedRules,
      symbolTraceability: normalizedSt,
    };
  } catch {
    return DEFAULT_CHECKS_CONFIG;
  }
}

// implements REQ-002
export function getEffectiveRules(
  configRules: Readonly<Record<string, boolean>>,
  requestedRules?: readonly string[],
): Set<string> {
  if (requestedRules && requestedRules.length > 0) {
    return new Set(requestedRules.filter((rule) => RULE_NAMES.has(rule)));
  }

  const effective = new Set<string>();

  for (const rule of RULE_NAMES) {
    const enabled = configRules[rule] ?? true;
    if (enabled) {
      effective.add(rule);
    }
  }

  return effective;
}
