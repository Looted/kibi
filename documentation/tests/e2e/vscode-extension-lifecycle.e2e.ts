/*
 * E2E: the built VS Code extension activates against a real Kibi workspace.
 *
 * REQ-vscode-traceability (umbrella), REQ-vscode-sidebar-kb-tree,
 * REQ-vscode-kb-to-source, and REQ-vscode-source-to-kb — this exerciser
 * bundles the shipped extension artifact (packages/vscode/dist/extension.js),
 * prepares a sandbox repository whose KB is produced by the real `kibi` CLI
 * (init, authored entities, symbols manifest, sync), then activates the bundle
 * through the VS Code API boundary and drives the sidebar tree, symbol
 * navigation from the tree to real file/line coordinates, code lenses over the
 * indexed source, and the context-on-open KB discovery surface.
 *
 * Run via `bun run documentation/tests/e2e/vscode-extension-lifecycle.e2e.ts`.
 */
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const REPO_ROOT = process.cwd();
const BUN = process.execPath;

function assert(condition: unknown, message: string): void {
  if (!condition) {
    console.error(`E2E FAILURE: ${message}`);
    process.exit(1);
  }
}

function run(
  command: string,
  args: readonly string[],
  options: Readonly<{ cwd?: string; env?: NodeJS.ProcessEnv }> = {},
): ReturnType<typeof spawnSync> {
  return spawnSync(command, [...args], {
    cwd: options.cwd ?? REPO_ROOT,
    env: { ...process.env, ...(options.env ?? {}) },
    encoding: "utf8",
    timeout: 240_000,
  });
}

type DriverResult = {
  ok: boolean;
  failures: string[];
  evidence: Record<string, unknown>;
};

// ── 1. Build the shipped artifact ───────────────────────────────────────────
const vscodePackage = join(REPO_ROOT, "packages", "vscode");
const build = run(BUN, ["run", "build"], { cwd: vscodePackage });
assert(
  build.status === 0,
  `extension build failed:\n${build.stdout ?? ""}\n${build.stderr ?? ""}`,
);
const distPath = join(vscodePackage, "dist", "extension.js");
assert(
  readFileSync(distPath, "utf8").length > 0,
  "the built extension bundle must be non-empty",
);

// ── 2. Prepare a sandbox repository with a real KB ─────────────────────────
const sandbox = mkdtempSync(join(tmpdir(), "kibi-vscode-e2e-"));
try {
  const git = (args: readonly string[]) =>
    run(
      "git",
      args,
      {
        cwd: sandbox,
        env: {
          GIT_AUTHOR_NAME: "vscode-e2e",
          GIT_AUTHOR_EMAIL: "vscode-e2e@example.invalid",
          GIT_COMMITTER_NAME: "vscode-e2e",
          GIT_COMMITTER_EMAIL: "vscode-e2e@example.invalid",
        },
      },
    );
  assert(git(["init", "--quiet"]).status === 0, "sandbox git init failed");
  assert(
    git(["commit", "--allow-empty", "-q", "-m", "initial"]).status === 0,
    "sandbox initial commit failed",
  );

  // The extension shells out to `kibi`; expose the repo CLI on the child PATH.
  const binDir = join(sandbox, ".bin");
  mkdirSync(binDir, { recursive: true });
  chmodSync(binDir, 0o700);
  symlinkSync(
    join(REPO_ROOT, "packages", "cli", "bin", "kibi"),
    join(binDir, "kibi"),
  );

  const kibi = (args: readonly string[]) =>
    run(
      join(REPO_ROOT, "packages", "cli", "bin", "kibi"),
      args,
      { cwd: sandbox, env: { PATH: `${binDir}:${process.env.PATH ?? ""}` } },
    );
  assert(kibi(["init"]).status === 0, "kibi init failed in the sandbox");

  const entityDirs = [
    ".kb/requirements",
    ".kb/scenarios",
    ".kb/tests",
    "src",
  ];
  for (const dir of entityDirs) {
    mkdirSync(join(sandbox, dir), { recursive: true });
  }
  writeFileSync(
    join(sandbox, ".kb", "requirements", "REQ-E2E-001.md"),
    `---
id: REQ-E2E-001
title: Extension lifecycle fixture requirement
status: open
priority: must
links:
  - type: specified_by
    target: SCEN-E2E-001
---

The fixture requirement owned by the indexed feature symbol.
`,
  );
  writeFileSync(
    join(sandbox, ".kb", "scenarios", "SCEN-E2E-001.md"),
    `---
id: SCEN-E2E-001
title: Extension lifecycle fixture scenario
status: active
links:
  - type: verified_by
    target: TEST-E2E-001
---

Given the built extension, when it activates, then it surfaces this chain.
`,
  );
  writeFileSync(
    join(sandbox, ".kb", "tests", "TEST-E2E-001.md"),
    `---
id: TEST-E2E-001
title: Extension lifecycle fixture test
status: passing
links:
  - type: validates
    target: SCEN-E2E-001
---

Fixture test for the extension lifecycle chain.
`,
  );
  writeFileSync(
    join(sandbox, "src", "feature.ts"),
    [
      "export function featureHello(name: string): string {",
      "  return `hello ${name}`;",
      "}",
      "",
      "export function featureUnused(): number {",
      "  return 41;",
      "}",
      "",
    ].join("\n"),
  );
  writeFileSync(
    join(sandbox, ".kb", "symbols.yaml"),
    `symbols:
  - id: SYM-FEATURE-HELLO
    title: featureHello
    sourceFile: src/feature.ts
    links:
      - type: implements
        target: REQ-E2E-001
    status: active
`,
  );
  for (const sourcePath of [
    ".kb/requirements/REQ-E2E-001.md",
    ".kb/scenarios/SCEN-E2E-001.md",
    ".kb/tests/TEST-E2E-001.md",
    "src/feature.ts",
    ".kb/symbols.yaml",
  ]) {
    assert(
      git(["add", "--", sourcePath]).status === 0,
      `staging ${sourcePath} failed`,
    );
  }
  const sync = kibi(["sync", "--refresh-symbol-coordinates"]);
  assert(
    sync.status === 0,
    `kibi sync failed:\n${sync.stdout ?? ""}\n${sync.stderr ?? ""}`,
  );

  // ── 3. Drive the built artifact against the real workspace ────────────────
  const driver = run(BUN, [
    join(REPO_ROOT, "documentation", "tests", "e2e", "vscode-extension-driver.ts"),
    sandbox,
    distPath,
  ]);
  const driverOutput = (driver.stdout ?? "").trim().split("\n").pop() ?? "";
  let result: DriverResult | undefined;
  try {
    result = JSON.parse(driverOutput) as DriverResult;
  } catch {
    // fall through to the assert below with the raw output
  }
  assert(
    driver.status === 0 && result?.ok === true,
    `extension driver failed:\n${driver.stdout ?? ""}\n${driver.stderr ?? ""}`,
  );
  console.log(
    `vscode extension e2e: all stages passed (${JSON.stringify(result?.evidence)})`,
  );
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}
