import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, describe, it } from "node:test";
import {
  createOwnedPackedTempDirectory,
  isolatedPackedSandboxEnv,
} from "./helpers.js";
import {
  parseNpmPackJsonOutput,
  resolveNpmPackFilename,
} from "./npm-pack-json.js";
import {
  createIsolatedPnpmEnvironment,
  resolvePnpm,
} from "./pnpm-upgrade-utils.js";

const REPO_ROOT = resolve(process.cwd());
const packageNames = ["core", "cli", "runtime", "mcp"] as const;
type PackageName = (typeof packageNames)[number];

let releasePackDestination: string | undefined;

function resolveReleasePackDestination(): string {
  if (releasePackDestination === undefined) {
    releasePackDestination = createOwnedPackedTempDirectory(
      "kibi-release-tarballs-",
    );
  }
  return releasePackDestination;
}

function packReleasePackage(pkg: PackageName): string {
  const suppliedRoot = process.env.KIBI_TEST_TARBALLS;
  if (suppliedRoot) {
    const packageDir = join(suppliedRoot, pkg);
    const candidate = existsSync(packageDir)
      ? readdirSync(packageDir).find(
          (entry) => entry.startsWith(`kibi-${pkg}-`) && entry.endsWith(".tgz"),
        )
      : undefined;
    assert.ok(
      candidate,
      `No supplied kibi-${pkg} tarball found under ${packageDir}`,
    );
    return join(packageDir, candidate);
  }
  const packageDir = join(REPO_ROOT, "packages", pkg);
  const packDestination = resolveReleasePackDestination();
  const output = execFileSync(
    "npm",
    ["pack", "--json", "--pack-destination", packDestination],
    {
      cwd: packageDir,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  const result = parseNpmPackJsonOutput(output)[0];
  assert.ok(result?.filename, `npm pack returned no filename for ${pkg}`);
  return resolveNpmPackFilename(packDestination, result.filename);
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
  const pnpm = packageManager === "pnpm" ? resolvePnpm() : undefined;
  const command = pnpm?.command ?? "npm";
  const commandPrefix = pnpm?.argsPrefix ?? [];
  const offline = process.env.KIBI_RELEASE_CONTRACT_OFFLINE === "1";
  const pnpmEnv =
    pnpm === undefined
      ? isolatedPackedSandboxEnv({
          npm_config_audit: "false",
          ...(offline ? { npm_config_registry: "http://127.0.0.1:9" } : {}),
        })
      : createIsolatedPnpmEnvironment(dir, pnpm).env;
  execFileSync(
    command,
    [...commandPrefix, ...(offline ? [...args, "--offline"] : args)],
    {
      cwd: dir,
      encoding: "utf8",
      env: pnpmEnv,
      stdio: "pipe",
    },
  );
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
    () => {
      const tarballs = Object.fromEntries(
        packageNames.map((pkg) => [pkg, packReleasePackage(pkg)]),
      ) as Record<PackageName, string>;
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
          const pnpm = resolvePnpm();
          execFileSync(pnpm.command, [...pnpm.argsPrefix, "--version"], {
            stdio: "ignore",
          });
          return false;
        } catch {
          return "pnpm is not installed";
        }
      })(),
    },
    () => {
      const tarballs = Object.fromEntries(
        packageNames.map((pkg) => [pkg, packReleasePackage(pkg)]),
      ) as Record<PackageName, string>;
      const dir = mkdtempSync(join(tmpdir(), "kibi-release-pnpm-"));
      tempDirs.push(dir);
      writeConsumerManifest(dir, tarballs);
      verifyConsumer(dir, "pnpm");
    },
  );
});
