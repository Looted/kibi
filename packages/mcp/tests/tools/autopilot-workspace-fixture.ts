import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT_DOC_PATHS = {
  requirements: "documentation/requirements/**/*.md",
  scenarios: "documentation/scenarios/**/*.md",
  tests: "documentation/tests/**/*.md",
  adr: "documentation/adr/**/*.md",
  flags: "documentation/flags/**/*.md",
  events: "documentation/events/**/*.md",
  facts: "documentation/facts/**/*.md",
  symbols: "documentation/symbols.yaml",
};

const MULTI_ROOT_DOC_PATHS = {
  requirements: "packages/*/documentation/requirements/**/*.md",
  scenarios: "packages/*/documentation/scenarios/**/*.md",
  tests: "packages/*/documentation/tests/**/*.md",
  adr: "packages/*/documentation/adr/**/*.md",
  flags: "packages/*/documentation/flags/**/*.md",
  events: "packages/*/documentation/events/**/*.md",
  facts: "packages/*/documentation/facts/**/*.md",
  symbols: "documentation/symbols.yaml",
};

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeEntityDoc(filePath: string, id: string, title: string, status: string) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(
    filePath,
    [
      "---",
      `id: ${id}`,
      `title: ${title}`,
      `status: ${status}`,
      "---",
      `# ${title}`,
      "",
    ].join("\n"),
  );
}

function ensureDocsAt(docRoot: string, prefix = "ROOT") {
  ensureDir(docRoot);
  ensureDir(path.join(docRoot, "requirements"));
  ensureDir(path.join(docRoot, "scenarios"));
  ensureDir(path.join(docRoot, "tests"));
  ensureDir(path.join(docRoot, "adr"));
  ensureDir(path.join(docRoot, "flags"));
  ensureDir(path.join(docRoot, "events"));
  ensureDir(path.join(docRoot, "facts"));
  fs.writeFileSync(path.join(docRoot, "symbols.yaml"), "symbols: []\n");

  writeEntityDoc(
    path.join(docRoot, "requirements", `REQ-${prefix}-001.md`),
    `REQ-${prefix}-001`,
    `${prefix} requirement`,
    "open",
  );
  writeEntityDoc(
    path.join(docRoot, "scenarios", `SCEN-${prefix}-001.md`),
    `SCEN-${prefix}-001`,
    `${prefix} scenario`,
    "active",
  );
  writeEntityDoc(
    path.join(docRoot, "tests", `TEST-${prefix}-001.md`),
    `TEST-${prefix}-001`,
    `${prefix} test`,
    "passing",
  );
  writeEntityDoc(
    path.join(docRoot, "adr", `ADR-${prefix}-001.md`),
    `ADR-${prefix}-001`,
    `${prefix} ADR`,
    "proposed",
  );
  writeEntityDoc(
    path.join(docRoot, "flags", `FLAG-${prefix}-001.md`),
    `FLAG-${prefix}-001`,
    `${prefix} flag`,
    "active",
  );
  writeEntityDoc(
    path.join(docRoot, "events", `EVT-${prefix}-001.md`),
    `EVT-${prefix}-001`,
    `${prefix} event`,
    "active",
  );
  writeEntityDoc(
    path.join(docRoot, "facts", `FACT-${prefix}-001.md`),
    `FACT-${prefix}-001`,
    `${prefix} fact`,
    "active",
  );
}

function createNoise(root: string) {
  const noisyFiles = [
    ".git/notes.md",
    ".kb/notes.md",
    "node_modules/kibi/readme.md",
    "vendor/README.md",
    "vendors/internal.md",
    "third_party/guide.md",
    "dist/output.md",
    "coverage/report.md",
    "build/plan.md",
    "target/log.md",
    ".venv/site.md",
    "venv/site.md",
    "packages/app/dist/generated.md",
  ];

  for (const relativePath of noisyFiles) {
    const absolutePath = path.join(root, relativePath);
    ensureDir(path.dirname(absolutePath));
    fs.writeFileSync(absolutePath, `# Ignored ${relativePath}\n`);
  }
}

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
  ensureDocsAt(path.join(root, "documentation"));
}

// implements REQ-mcp-init-kibi-autopilot-v1
export function createColdStartRepo(root: string) {
  ensureDir(root);
  ensureDir(path.join(root, "src", "routes"));
  ensureDir(path.join(root, "tests"));

  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify(
      {
        name: "cold-start-app",
        private: true,
        packageManager: "bun@1.3.10",
        bin: {
          "cold-start-app": "./src/cli.ts",
        },
        scripts: {
          dev: "bun run src/server.ts",
          test: "bun test",
        },
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(path.join(root, "bun.lock"), "# bun lockfile\n");
  fs.writeFileSync(
    path.join(root, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
        },
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(
    path.join(root, "src", "cli.ts"),
    [
      "export function main() {",
      "  return \"cli\";",
      "}",
      "",
    ].join("\n"),
  );
  fs.writeFileSync(
    path.join(root, "src", "server.ts"),
    [
      "export function serve() {",
      "  return \"server\";",
      "}",
      "",
    ].join("\n"),
  );
  fs.writeFileSync(
    path.join(root, "src", "routes", "health.ts"),
    ["export const healthRoute = \"/health\";", ""].join("\n"),
  );
  fs.writeFileSync(
    path.join(root, "tests", "server.test.ts"),
    [
      'import { describe, expect, test } from "bun:test";',
      "",
      'describe("server", () => {',
      '  test("starts", () => {',
      "    expect(true).toBe(true);",
      "  });",
      "});",
      "",
    ].join("\n"),
  );
}

// implements REQ-mcp-init-kibi-autopilot-v1
export function createPartialRepo(root: string) {
  writeRootConfig(root, { paths: ROOT_DOC_PATHS });
  writeEntityDoc(
    path.join(root, "documentation", "requirements", "REQ-PARTIAL-001.md"),
    "REQ-PARTIAL-001",
    "Partial workspace requirement",
    "open",
  );
  ensureDir(path.join(root, "docs"));
  fs.writeFileSync(
    path.join(root, "docs", "bootstrap.md"),
    "# ADR: Repair partial bootstrap\n\n# Requirements\n",
  );
}

// implements REQ-mcp-init-kibi-autopilot-v1
export function createMultiRootRepo(root: string) {
  ensureDocsAt(path.join(root, "packages", "app", "documentation"), "APP");
  ensureDocsAt(path.join(root, "packages", "api", "documentation"), "API");
  ensureDir(path.join(root, "documentation"));
  fs.writeFileSync(path.join(root, "documentation", "symbols.yaml"), "symbols: []\n");
  ensureDir(path.join(root, "docs"));
  fs.writeFileSync(path.join(root, "docs", "bootstrap.md"), "# ADR: Multi-root bootstrap\n");
}

// implements REQ-mcp-init-kibi-autopilot-v1
export function createNoisyRepo(root: string) {
  createNoise(root);
}

// implements REQ-mcp-init-kibi-autopilot-v1
export function createThinRepo(
  root: string,
  options: { multiRoot?: boolean; noisy?: boolean } = {},
) {
  if (options.multiRoot) {
    createMultiRootRepo(root);
    writeRootConfig(root, { paths: MULTI_ROOT_DOC_PATHS });
  } else {
    ensureDocs(root);
    writeRootConfig(root, { paths: ROOT_DOC_PATHS });
  }

  if (options.noisy) {
    createNoise(root);
  }
}

// implements REQ-mcp-init-kibi-autopilot-v1
export function createSeededRepo(
  root: string,
  options: { multiRoot?: boolean; noisy?: boolean } = {},
) {
  createThinRepo(root, options);

  const rootDoc = options.multiRoot
    ? path.join(root, "packages", "app", "documentation")
    : path.join(root, "documentation");

  writeEntityDoc(
    path.join(rootDoc, "requirements", "REQ-SEEDED-002.md"),
    "REQ-SEEDED-002",
    "Seeded extra requirement",
    "open",
  );
  writeEntityDoc(
    path.join(rootDoc, "facts", "FACT-SEEDED-002.md"),
    "FACT-SEEDED-002",
    "Seeded extra fact",
    "active",
  );
}
