import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterEach, before, beforeEach, describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createSandbox,
  packAll,
  run,
} from "./helpers.js";
import { packagesForPack } from "./packed-packages.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";
const COMMAND_TIMEOUT_MS = 15 * 60 * 1000;
const APPROVED_RUNTIME_SHA256 =
  "266e839d9d7f89c84ba6ce089ffdec9599b0a668c010308f857baad0570a0d50";

type BenchmarkModule = {
  fetchCatalogPinnedRuntimeArchive: (options: {
    catalogPath: string;
    outputPath: string;
  }) => Promise<{ sha256: string; path: string; fileCount: number }>;
  parseNpmTarball: (
    bytes: Buffer,
  ) => Map<
    string,
    { kind: "file"; bytes: Buffer } | { kind: "symlink"; target: string }
  >;
  qualifySourcePackageTarballs: (options: {
    repoRoot: string;
    expectedFolders: readonly string[];
    packages: readonly {
      folder: string;
      sourceDirectory: string;
      tarballPath: string;
    }[];
    outputPath: string;
  }) => {
    packageCount: number;
    packagedFiles: number;
    mismatches: readonly unknown[];
    tarballs: readonly { name: string; version: string; path: string }[];
  };
  assertAcceptedCheckTimingCoverage: (
    sourceAnalysis: unknown,
    prologTiming: unknown,
    options?: { requireRoundTrip?: boolean },
  ) => void;
};

const repoRoot = resolve(
  process.env.KIBI_PROOF_REPO_ROOT?.trim() || process.cwd(),
);
const benchmarkModuleUrl = pathToFileURL(
  join(repoRoot, "scripts", "benchmark-installed-staged-impact.mjs"),
).href;

// executable_for TEST-installed-staged-impact-timing-integrity
export async function runInstalledStagedImpactBenchmarkWorkflow(
  sandbox: TestSandbox,
  tarballs: Tarballs,
): Promise<void> {
  const benchmark = (await import(benchmarkModuleUrl)) as BenchmarkModule;
  const packageInputs = packagesForPack.map((folder) => {
    const tarballPath = (tarballs as unknown as Record<string, string>)[folder];
    if (typeof tarballPath !== "string") {
      throw new Error(`packed archive missing ${folder}`);
    }
    return {
      folder,
      sourceDirectory: join(repoRoot, "packages", folder),
      tarballPath,
    };
  });
  const qualificationPath = join(sandbox.baseDir, "source-qualification.json");
  const qualification = benchmark.qualifySourcePackageTarballs({
    repoRoot,
    packages: packageInputs,
    expectedFolders: packagesForPack,
    outputPath: qualificationPath,
  });
  assert.equal(qualification.packageCount, packagesForPack.length);
  assert.ok(qualification.packagedFiles > qualification.packageCount);
  assert.deepEqual(qualification.mismatches, []);

  const pluginArchive = packageInputs.find(
    ({ folder }) => folder === "plugin-treesitter",
  );
  assert.ok(pluginArchive);
  const pluginEntries = benchmark.parseNpmTarball(
    readFileSync(pluginArchive.tarballPath),
  );
  const bundledNotice = pluginEntries.get("THIRD_PARTY_NOTICES.md");
  const bundledLicense = pluginEntries.get("licenses/web-tree-sitter-MIT.txt");
  assert.ok(bundledNotice && bundledNotice.kind === "file");
  assert.ok(bundledLicense && bundledLicense.kind === "file");
  assert.match(
    bundledNotice.bytes.toString("utf8"),
    /web-tree-sitter` 0\.27\.0 \(MIT\)/,
  );
  assert.match(
    bundledLicense.bytes.toString("utf8"),
    /^The MIT License \(MIT\)/,
  );

  // Only the packed archives are source-qualified. Without omitOptional, npm
  // would pull the published kibi-swipl platform package from the registry,
  // and the benchmark rejects it as an unqualified first-party dependency.
  await sandbox.install(tarballs, {
    ignoreScripts: true,
    omitOptional: !tarballs.swiplPlatform,
  });
  const runtimeArchivePath = join(
    sandbox.baseDir,
    "web-tree-sitter-0.27.0.tgz",
  );
  const runtimeArchive = await benchmark.fetchCatalogPinnedRuntimeArchive({
    catalogPath: join(
      repoRoot,
      "packages",
      "plugin-treesitter",
      "catalog.json",
    ),
    outputPath: runtimeArchivePath,
  });
  assert.equal(runtimeArchive.sha256, APPROVED_RUNTIME_SHA256);

  const outputDir = join(sandbox.baseDir, "benchmark-output");
  const command = await run(
    process.execPath,
    [
      join(repoRoot, "scripts", "benchmark-installed-staged-impact.mjs"),
      "--prefix",
      sandbox.npmPrefix,
      "--qualification",
      qualificationPath,
      "--runtime-archive",
      runtimeArchivePath,
      "--output-dir",
      outputDir,
      "--small-count",
      "3",
      "--large-count",
      "6",
      "--repeats",
      "2",
    ],
    {
      cwd: repoRoot,
      env: sandbox.env,
      timeoutMs: COMMAND_TIMEOUT_MS,
    },
  );
  assert.equal(command.exitCode, 0, `${command.stdout}\n${command.stderr}`);
  const report = JSON.parse(
    readFileSync(join(outputDir, "benchmark-result.json"), "utf8"),
  ) as {
    status: string;
    candidate: {
      qualification: { format: string; packageCount: number };
      parserRuntimeProvenance: {
        approvedRuntimeArchiveComparison: { archiveSha256: string };
      };
    };
    scenarios: Array<{
      size: string;
      localStagedGateAccepted: boolean;
      engineColdWarmBoundary: {
        status: string;
        beforeCheckFindingCount: number;
        oneShotStagedChecks: Array<{
          afterCheck: number;
          persistentEngineFindingCount: number;
        }>;
        verifications: Array<{ pid: number }>;
      };
      localStagedChecks: Array<{
        repeat: number;
        runState: string;
        persistentEngineObservedAfterCheck: boolean;
        sourceAnalysis: unknown;
        prologTiming: unknown;
      }>;
      status: Array<{
        repeat: number;
        engineState: string;
        enginePidConfirmedAfterStatus: number;
      }>;
    }>;
  };
  assert.equal(report.status, "completed");
  assert.equal(
    report.candidate.qualification.format,
    "source_candidate_tarballs_v1",
  );
  assert.equal(
    report.candidate.qualification.packageCount,
    packagesForPack.length,
  );
  assert.equal(
    report.candidate.parserRuntimeProvenance.approvedRuntimeArchiveComparison
      .archiveSha256,
    APPROVED_RUNTIME_SHA256,
  );
  assert.deepEqual(
    report.scenarios.map(({ size }) => size),
    ["small", "large"],
  );
  for (const scenario of report.scenarios) {
    assert.equal(scenario.localStagedGateAccepted, true);
    assert.equal(
      scenario.engineColdWarmBoundary.status,
      "cold_status_started_and_warm_engine_confirmed",
    );
    assert.equal(scenario.engineColdWarmBoundary.beforeCheckFindingCount, 0);
    assert.equal(scenario.localStagedChecks.length, 2);
    assert.equal(scenario.engineColdWarmBoundary.oneShotStagedChecks.length, 2);
    assert.equal(scenario.status.length, 2);
    const confirmedPid = scenario.engineColdWarmBoundary.verifications[0]?.pid;
    if (
      !Number.isSafeInteger(confirmedPid) ||
      typeof confirmedPid !== "number" ||
      confirmedPid <= 0
    ) {
      throw new Error("Benchmark report did not retain a verified engine PID");
    }
    for (const [index, check] of scenario.localStagedChecks.entries()) {
      assert.equal(check.repeat, index + 1);
      assert.equal(
        check.runState,
        index === 0 ? "first-one-shot" : "repeat-one-shot",
      );
      assert.equal(check.persistentEngineObservedAfterCheck, false);
      assert.equal(
        scenario.engineColdWarmBoundary.oneShotStagedChecks[index]
          ?.persistentEngineFindingCount,
        0,
      );
      benchmark.assertAcceptedCheckTimingCoverage(
        check.sourceAnalysis,
        check.prologTiming,
        { requireRoundTrip: true },
      );
    }
    for (const [index, status] of scenario.status.entries()) {
      assert.equal(status.repeat, index + 1);
      assert.equal(
        status.engineState,
        index === 0 ? "cold-engine" : "warm-engine",
      );
      assert.equal(status.enginePidConfirmedAfterStatus, confirmedPid);
    }
  }

  console.log(
    JSON.stringify({
      status: report.status,
      qualifiedPackages: qualification.packageCount,
      sourceFilesCompared: qualification.packagedFiles,
      runtimeArchiveSha256: runtimeArchive.sha256,
      scenarios: report.scenarios.map((scenario) => ({
        size: scenario.size,
        checks: scenario.localStagedChecks.length,
        enginePid: scenario.status[0]?.enginePidConfirmedAfterStatus,
        parserLanguages: ["python", "go", "rust"],
        prologTimingChecked: true,
      })),
    }),
  );
}

if (RUN_NODE_TEST_SUITE) {
  describe(
    "E2E: source-qualified installed staged-impact benchmark",
    { timeout: 30 * 60 * 1000 },
    () => {
      let tarballs: Tarballs;
      let sandbox: TestSandbox | undefined;
      let hasProlog = false;

      before(
        async () => {
          hasProlog = checkPrologAvailable();
          if (!hasProlog) {
            throw new Error(
              "SWI-Prolog is required for the installed staged-impact benchmark proof",
            );
          }
          tarballs = await packAll();
        },
        { timeout: 5 * 60 * 1000 },
      );

      beforeEach(async () => {
        if (!hasProlog) return;
        sandbox = createSandbox({
          forceIsolatedInstall: true,
          includeCompleteInventory: true,
        });
      });

      afterEach(async () => {
        if (sandbox) {
          await sandbox.cleanup();
          sandbox = undefined;
        }
      });

      it("measures installed staged checks and cold and warm status", async () => {
        assert.ok(hasProlog);
        assert.ok(sandbox);
        await runInstalledStagedImpactBenchmarkWorkflow(sandbox, tarballs);
      });
    },
  );
}
