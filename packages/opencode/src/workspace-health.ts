import fs from "node:fs";
// implements REQ-opencode-kibi-plugin-v1
import path from "node:path";
import { getKbExistenceTargets } from "./file-filter.js";
import { detectPosture } from "./repo-posture.js";

export interface WorkspaceHealth {
  needsBootstrap: boolean;
  missingConfig: boolean;
  missingDocDirs: string[];
  hasKbEvidence: boolean;
}

const KB_CONFIG_FILE = ".kb/config.json";
// Fallback defaults used when .kb/config.json does not exist
const KIBI_DOC_DIRS = [
  "documentation/requirements",
  "documentation/scenarios",
  "documentation/tests",
  "documentation/adr",
  "documentation/flags",
  "documentation/events",
  "documentation/facts",
  "documentation/symbols.yaml",
];

// implements REQ-opencode-kibi-plugin-v1
/**
 * Analyze workspace health for Kibi bootstrap and initialization.
 * Uses detectPosture() for root-scoped classification and delegates
 * bootstrap-needs to the posture result.
 */
export function checkWorkspaceHealth(cwd: string): WorkspaceHealth {
  // Use posture detection for root-scoped classification
  const posture = detectPosture(cwd);

  const configPath = path.join(cwd, KB_CONFIG_FILE);
  const missingConfig = !fs.existsSync(configPath);

  const missingDocDirs: string[] = [];
  if (missingConfig) {
    // No config file: fall back to hardcoded defaults
    for (const docDir of KIBI_DOC_DIRS) {
      const fullPath = path.join(cwd, docDir);
      if (!fs.existsSync(fullPath)) {
        missingDocDirs.push(docDir);
      }
    }
  } else {
    // Config exists: check if user specified custom paths
    let hasUserPaths = false;
    try {
      const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
      hasUserPaths = Boolean(raw && raw.paths);
    } catch {
      hasUserPaths = false;
    }
    if (hasUserPaths) {
      // User has custom paths: resolve targets dynamically
      const targets = getKbExistenceTargets(cwd);
      for (const target of targets) {
        const fullPath = path.join(cwd, target.relativePath);
        if (!fs.existsSync(fullPath)) {
          missingDocDirs.push(target.relativePath);
        }
      }
    } else {
      // Config exists but no custom paths: use hardcoded defaults
      for (const docDir of KIBI_DOC_DIRS) {
        const fullPath = path.join(cwd, docDir);
        if (!fs.existsSync(fullPath)) {
          missingDocDirs.push(docDir);
        }
      }
    }
  }

  // Check for any evidence of Kibi usage
  const kbDir = path.join(cwd, ".kb");
  const hasKbEvidence =
    fs.existsSync(kbDir) && fs.readdirSync(kbDir).length > 0;

  // Delegate needsBootstrap entirely to posture detection:
  // - root_uninitialized → true
  // - root_partial → true
  // - vendored_only → false (nested tree handles its own KB)
  // - root_active / hybrid_root_plus_vendored → false
  const needsBootstrap = posture.needsBootstrap;

  return {
    needsBootstrap,
    missingConfig,
    missingDocDirs,
    hasKbEvidence,
  };
}
