import fs from "node:fs";
// implements REQ-opencode-kibi-plugin-v1
import path from "node:path";

export interface WorkspaceHealth {
  needsBootstrap: boolean;
  missingConfig: boolean;
  missingDocDirs: string[];
  hasKbEvidence: boolean;
}

const KB_CONFIG_FILE = ".kb/config.json";
const KIBI_DOC_DIRS = [
  "documentation/requirements",
  "documentation/scenarios",
  "documentation/tests",
  "documentation/adr",
  "documentation/flags",
  "documentation/events",
  "documentation/facts",
  "symbols.yaml",
];

/**
 * Analyze workspace health for Kibi bootstrap and initialization.
 */
export function checkWorkspaceHealth(cwd: string): WorkspaceHealth {
  const configPath = path.join(cwd, KB_CONFIG_FILE);
  const missingConfig = !fs.existsSync(configPath);

  const missingDocDirs: string[] = [];
  for (const docDir of KIBI_DOC_DIRS) {
    const fullPath = path.join(cwd, docDir);
    if (!fs.existsSync(fullPath)) {
      missingDocDirs.push(docDir);
    }
  }

  // Check for any evidence of Kibi usage
  const kbDir = path.join(cwd, ".kb");
  const hasKbEvidence =
    fs.existsSync(kbDir) && fs.readdirSync(kbDir).length > 0;

  // If missing config or more than 2 doc dirs are missing, suggest bootstrap
  const needsBootstrap = missingConfig || missingDocDirs.length > 2;

  return {
    needsBootstrap,
    missingConfig,
    missingDocDirs,
    hasKbEvidence,
  };
}
