import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface AutopilotWorkspaceFixture {
  root: string;
  cleanup: () => void;
}

// implements REQ-mcp-init-kibi-autopilot-v1
export function setupWorkspace(): AutopilotWorkspaceFixture {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-autopilot-"));
  const root = path.join(tmp, "repo");
  fs.mkdirSync(root, { recursive: true });

  const cleanup = () => {
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {}
  };

  return { root, cleanup };
}

// implements REQ-mcp-init-kibi-autopilot-v1
export function writeRootConfig(root: string, obj: unknown) {
  const kbDir = path.join(root, ".kb");
  fs.mkdirSync(kbDir, { recursive: true });
  fs.writeFileSync(path.join(kbDir, "config.json"), JSON.stringify(obj, null, 2));
}

// implements REQ-mcp-init-kibi-autopilot-v1
export function createVendoredTree(root: string) {
  const vend = path.join(root, "kibi");
  fs.mkdirSync(path.join(vend, "documentation", "requirements"), { recursive: true });
  fs.mkdirSync(path.join(vend, "packages", "mcp"), { recursive: true });
  fs.writeFileSync(path.join(vend, "opencode.json"), JSON.stringify({ plugin: ["kibi-opencode"] }));
}

// implements REQ-mcp-init-kibi-autopilot-v1
export function ensureDocs(root: string) {
  const doc = path.join(root, "documentation");
  fs.mkdirSync(path.join(doc, "requirements"), { recursive: true });
  fs.mkdirSync(path.join(doc, "scenarios"), { recursive: true });
  fs.mkdirSync(path.join(doc, "tests"), { recursive: true });
  fs.mkdirSync(path.join(doc, "adr"), { recursive: true });
  fs.mkdirSync(path.join(doc, "flags"), { recursive: true });
  fs.mkdirSync(path.join(doc, "events"), { recursive: true });
  fs.mkdirSync(path.join(doc, "facts"), { recursive: true });
  fs.writeFileSync(path.join(doc, "symbols.yaml"), "symbols: []\n");
  // add some sample md files
  fs.writeFileSync(path.join(doc, "requirements", "REQ-001.md"), "# REQ-001\n");
  fs.writeFileSync(path.join(doc, "requirements", "REQ-002.md"), "# REQ-002\n");
  fs.writeFileSync(path.join(doc, "tests", "TEST-001.md"), "# TEST-001\n");
  fs.writeFileSync(path.join(doc, "scenarios", "SCEN-001.md"), "# SCEN-001\n");
}
