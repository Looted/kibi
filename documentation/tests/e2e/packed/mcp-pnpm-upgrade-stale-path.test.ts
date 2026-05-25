import assert from "node:assert";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  type CommandResult,
  type PnpmUpgradeSandbox,
  type Tarballs,
  createPnpmUpgradeSandbox,
  installTarballsWithPnpm,
  packAllForPnpmUpgrade,
  pnpmLabel,
  resolveInstalledKibiMcp,
  runCommand,
  runPnpm,
} from "./pnpm-upgrade-utils.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

const REPO_ROOT = resolve(process.cwd());
const MAIN_WORKTREE_ROOT = resolve(REPO_ROOT, "../..");
const OLD_MCP_VERSION = "0.13.0";
const FORBIDDEN_AFTER_UPGRADE = [
  "kibi-mcp@0.13.0",
  "node_modules/.pnpm/kibi-mcp@0.13.0",
  "dist/server/session.js",
  "dist/server/tools.js",
] as const;

function findOldMcpTarball(): string {
  const candidates = [
    join(REPO_ROOT, "packages", "mcp", `kibi-mcp-${OLD_MCP_VERSION}.tgz`),
    join(
      REPO_ROOT,
      "documentation",
      "tests",
      "e2e",
      "packed",
      "fixtures",
      `kibi-mcp-${OLD_MCP_VERSION}.tgz`,
    ),
    join(
      MAIN_WORKTREE_ROOT,
      "packages",
      "mcp",
      `kibi-mcp-${OLD_MCP_VERSION}.tgz`,
    ),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(
      `Missing old kibi-mcp fixture. Checked:\n${candidates.join("\n")}`,
    );
  }
  return found;
}

function currentMcpVersion(): string {
  const packageJson = JSON.parse(
    readFileSync(join(REPO_ROOT, "packages", "mcp", "package.json"), "utf8"),
  ) as { version?: string };
  assert.ok(
    packageJson.version,
    "packages/mcp/package.json must include version",
  );
  return packageJson.version;
}

function pinLocalKibiTransitives(
  sandbox: PnpmUpgradeSandbox,
  tarballs: Tarballs,
): void {
  writeFileSync(
    join(sandbox.projectDir, "package.json"),
    JSON.stringify(
      {
        name: "kibi-pnpm-upgrade-e2e",
        private: true,
      },
      null,
      2,
    ),
    "utf8",
  );
  writeFileSync(
    join(sandbox.projectDir, "pnpm-workspace.yaml"),
    [
      "packages:",
      "  - .",
      "overrides:",
      `  kibi-cli: ${JSON.stringify(tarballs.cli)}`,
      `  kibi-core: ${JSON.stringify(tarballs.core)}`,
      "",
    ].join("\n"),
    "utf8",
  );
}

function assertInstallSucceeded(phase: string, result: CommandResult): void {
  assert.strictEqual(
    result.exitCode,
    0,
    `${phase} failed. stdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
}

function assertNoForbiddenOutput(label: string, result: CommandResult): void {
  const combined = `${result.stdout}\n${result.stderr}`;
  for (const forbidden of FORBIDDEN_AFTER_UPGRADE) {
    assert.ok(
      !combined.includes(forbidden),
      `${label} output must not include stale path fragment ${forbidden}. Output:\n${combined}`,
    );
  }
}

function parsePrintResolution(
  label: string,
  result: CommandResult,
): {
  packageVersion?: string;
  version?: string;
  resolved?: string;
} {
  assert.strictEqual(
    result.exitCode,
    0,
    `${label} --print-resolution should exit successfully. stdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  assertNoForbiddenOutput(label, result);
  try {
    return JSON.parse(result.stdout.trim()) as {
      packageVersion?: string;
      version?: string;
      resolved?: string;
    };
  } catch (error) {
    assert.fail(
      `${label} --print-resolution should print JSON. stdout:\n${result.stdout}\nstderr:\n${result.stderr}\nparse error: ${(error as Error).message}`,
    );
  }
}

function assertPrintResolution(
  label: string,
  result: CommandResult,
  expectedVersion: string,
): void {
  const resolution = parsePrintResolution(label, result);
  assert.strictEqual(
    resolution.packageVersion ?? resolution.version,
    expectedVersion,
    `${label} should report upgraded kibi-mcp version ${expectedVersion}`,
  );
  assert.ok(
    !resolution.resolved?.includes(`kibi-mcp@${OLD_MCP_VERSION}`),
    `${label} should not resolve the stale kibi-mcp ${OLD_MCP_VERSION} package`,
  );
}

if (RUN_NODE_TEST_SUITE) {
  describe(
    "MCP pnpm packed old-to-new upgrade stale-path regression",
    {
      timeout: 300000,
    },
    () => {
      let sandbox: PnpmUpgradeSandbox;
      let tarballs: Tarballs;

      before(
        async () => {
          tarballs = await packAllForPnpmUpgrade();
          sandbox = createPnpmUpgradeSandbox();
        },
        { timeout: 300000 },
      );

      after(
        () => {
          sandbox?.cleanup();
        },
        { timeout: 60000 },
      );

      it("does not invoke stale 0.13.0 pnpm package paths after upgrading to current packed kibi-mcp", async () => {
        const oldTarball = findOldMcpTarball();
        const expectedVersion = currentMcpVersion();
        pinLocalKibiTransitives(sandbox, tarballs);

        const oldInstall = await installTarballsWithPnpm(sandbox, [oldTarball]);
        assertInstallSucceeded("old kibi-mcp pnpm install", oldInstall);
        const oldResolved = await resolveInstalledKibiMcp(sandbox);
        assert.ok(
          oldResolved.includes(`kibi-mcp-${OLD_MCP_VERSION}.tgz`) ||
            oldResolved.includes(`kibi-mcp@${OLD_MCP_VERSION}`),
          `old install should resolve through the kibi-mcp ${OLD_MCP_VERSION} tarball, got ${oldResolved}`,
        );

        const upgrade = await installTarballsWithPnpm(sandbox, [
          tarballs.core,
          tarballs.cli,
          tarballs.mcp,
        ]);
        assertInstallSucceeded("current packed kibi pnpm upgrade", upgrade);
        const newResolved = await resolveInstalledKibiMcp(sandbox);
        assert.ok(
          !newResolved.includes("kibi-mcp@0.13.0"),
          `new install should not resolve through stale kibi-mcp@0.13.0 path. old=${oldResolved} new=${newResolved}`,
        );

        const pnpmExec = await runPnpm(
          sandbox,
          ["exec", "kibi-mcp", "--print-resolution"],
          { timeoutMs: 10000 },
        );
        assertPrintResolution(
          `${pnpmLabel(sandbox.pnpm)} exec kibi-mcp`,
          pnpmExec,
          expectedVersion,
        );

        const binPath = join(
          sandbox.projectDir,
          "node_modules",
          ".bin",
          "kibi-mcp",
        );
        const directNodeBin = await runCommand(
          binPath,
          ["--print-resolution"],
          { cwd: sandbox.projectDir, env: sandbox.env, timeoutMs: 10000 },
        );
        assertPrintResolution(
          "node node_modules/.bin/kibi-mcp",
          directNodeBin,
          expectedVersion,
        );

        const opencodeCommandArray = [binPath, "--print-resolution"];
        const simulatedOpenCode = await runCommand(
          opencodeCommandArray[0] as string,
          opencodeCommandArray.slice(1),
          { cwd: sandbox.projectDir, env: sandbox.env, timeoutMs: 10000 },
        );
        assertPrintResolution(
          "simulated OpenCode command-array execution",
          simulatedOpenCode,
          expectedVersion,
        );
      });
    },
  );
}
