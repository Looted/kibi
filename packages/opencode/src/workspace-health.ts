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

const KB_MANIFEST_FILE = ".kb/manifest.json";

// implements REQ-opencode-kibi-plugin-v1
/**
 * Analyze workspace health for Kibi bootstrap and initialization.
 * Uses detectPosture() for root-scoped classification and delegates
 * bootstrap-needs to the posture result.
 */
export function checkWorkspaceHealth(cwd: string): WorkspaceHealth {
  const posture = detectPosture(cwd);

  const manifestPath = path.join(cwd, KB_MANIFEST_FILE);
  const missingConfig = !fs.existsSync(manifestPath);

  const missingDocDirs: string[] = [];
  const targets = getKbExistenceTargets(cwd);
  for (const target of targets) {
    const fullPath = path.resolve(cwd, target.relativePath);
    if (!fs.existsSync(fullPath)) {
      missingDocDirs.push(target.relativePath);
    }
  }

  const kbDir = path.join(cwd, ".kb");
  const hasKbEvidence =
    fs.existsSync(kbDir) && fs.readdirSync(kbDir).length > 0;

  const needsBootstrap =
    posture.state === "root_uninitialized" ||
    (posture.state === "root_partial" && missingDocDirs.length > 2);

  return {
    needsBootstrap,
    missingConfig,
    missingDocDirs,
    hasKbEvidence,
  };
}
