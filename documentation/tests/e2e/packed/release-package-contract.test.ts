import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { isolatedPackedSandboxEnv, packAll } from "./helpers.js";

const packageNames = ["core", "cli", "runtime", "mcp"] as const;
type PackageName = (typeof packageNames)[number];

async function resolveReleaseTarballs(): Promise<Record<PackageName, string>> {
  const tarballs = await packAll();
  return Object.fromEntries(
    packageNames.map((pkg) => [pkg, tarballs[pkg]]),
  ) as Record<PackageName, string>;
}

function writeConsumerManifest(
  dir: string,
  tarballs: Record<PackageName, string>,
): void {
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify(
      {
        name: "kibi-release-contract-consumer",
        private: true,
        type: "module",
        dependencies: Object.fromEntries(
          packageNames.map((pkg) => [`kibi-${pkg}`, `file:${tarballs[pkg]}`]),
        ),
      },
      null,
      2,
    ),
    "utf8",
  );
  // pnpm resolves a transitive semver dependency from its registry even when
  // the same package is also a direct file dependency. Its current contract
  // reads overrides from the workspace settings file, so model the downloaded
  // artifact set there and keep the consumer registry-independent.
  writeFileSync(
    join(dir, "pnpm-workspace.yaml"),
    [
      "overrides:",
      ...packageNames.map((pkg) => `  kibi-${pkg}: "file:${tarballs[pkg]}"`),
      "",
    ].join("\n"),
    "utf8",
  );
}

function verifyConsumer(dir: string, packageManager: "npm" | "pnpm"): void {
  const args =
    packageManager === "npm"
      ? ["install", "--no-audit"]
      : ["install", "--no-frozen-lockfile"];
  const command = packageManager === "npm" ? "npm" : "pnpm";
  const offline = process.env.KIBI_RELEASE_CONTRACT_OFFLINE === "1";
  execFileSync(command, offline ? [...args, "--offline"] : args, {
    cwd: dir,
    encoding: "utf8",
    env: isolatedPackedSandboxEnv({
      npm_config_audit: "false",
      ...(offline ? { npm_config_registry: "http://127.0.0.1:9" } : {}),
    }),
    stdio: "pipe",
  });
  const probe = execFileSync(
    "node",
    [
      "--input-type=module",
      "-e",
      "import { executeApplyPlan } from 'kibi-cli/operations'; if (typeof executeApplyPlan !== 'function') throw new Error('missing executeApplyPlan'); import 'kibi-mcp';",
    ],
    { cwd: dir, encoding: "utf8", stdio: "pipe" },
  );
  assert.equal(probe, "");
}

describe("release package contracts", { concurrency: false }, () => {
  const tempDirs: string[] = [];
  after(() => {
    for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
  });

  it(
    "packs compiled CLI/core/MCP artifacts and resolves an npm consumer locally",
    { timeout: 300_000 },
    async () => {
      const tarballs = await resolveReleaseTarballs();
      const dir = mkdtempSync(join(tmpdir(), "kibi-release-npm-"));
      tempDirs.push(dir);
      writeConsumerManifest(dir, tarballs);
      verifyConsumer(dir, "npm");
    },
  );

  it(
    "packs and resolves a pnpm consumer without registry fallback",
    {
      timeout: 300_000,
      skip: (() => {
        try {
          execFileSync("pnpm", ["--version"], { stdio: "ignore" });
          return false;
        } catch {
          return "pnpm is not installed";
        }
      })(),
    },
    async () => {
      const tarballs = await resolveReleaseTarballs();
      const dir = mkdtempSync(join(tmpdir(), "kibi-release-pnpm-"));
      tempDirs.push(dir);
      writeConsumerManifest(dir, tarballs);
      verifyConsumer(dir, "pnpm");
    },
  );
});
