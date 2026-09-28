import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { gzipSync } from "node:zlib";
import {
  assertAcceptedCheckTimingCoverage,
  assignSyntheticReviewIdentity,
  authorPreparedRecord,
  buildRequirementInput,
  capturePerformanceTraceOffsets,
  checkStagedImpactReviewRequired,
  collectInstalledDependencyClosure,
  copyQualifiedPackages,
  createSyntheticDeclarations,
  fetchCatalogPinnedRuntimeArchive,
  installedFileInventory,
  makeRuntimeEnvironment,
  normalizeQualificationReport,
  parseNpmTarball,
  parseSourceAnalysisTimings,
  qualifySourcePackageTarballs,
  readPerformanceTraceWindow,
  stageBaselineFiles,
  stageContent,
  stopEngineAndRemoveWorkspace,
  summarizePrologTiming,
  verifyCatalogRuntimeArchiveBytes,
  verifyPinnedRuntimeArchive,
  verifyQualifiedKibiDependencies,
  writeBaselineImpactPolicy,
} from "./benchmark-installed-staged-impact.mjs";

function hash(text) {
  return createHash("sha256").update(text).digest("hex");
}

test("source-analysis timing parser preserves missing values and rejects malformed observations", () => {
  const absent = parseSourceAnalysisTimings("ordinary diagnostic\n");
  assert.equal(absent.status, "unavailable_no_events");
  assert.equal(absent.eventCount, null);
  assert.equal(absent.phaseWallMs, null);

  const event = {
    kind: "source-analysis",
    language: "python",
    parserInitializationWallMs: 4.25,
    parseWallMs: 0,
    analysisWallMs: 1.5,
    totalAnalysisWallMs: 6,
  };
  const parsed = parseSourceAnalysisTimings(
    `[kibi-performance] ${JSON.stringify(event)}\n`,
  );
  assert.equal(parsed.status, "observed");
  assert.equal(parsed.eventCount, 1);
  assert.equal(parsed.phaseWallMs.parse, 0);
  assert.equal(JSON.stringify(parsed).includes("source/path"), false);
  assert.throws(
    () => parseSourceAnalysisTimings("[kibi-performance] {bad json}\n"),
    /malformed/,
  );
  assert.throws(
    () =>
      parseSourceAnalysisTimings(
        `[kibi-performance] ${JSON.stringify({ ...event, parseWallMs: -1 })}\n`,
      ),
    /invalid schema/,
  );
  const incomplete = { ...event };
  incomplete.totalAnalysisWallMs = undefined;
  assert.throws(
    () =>
      parseSourceAnalysisTimings(
        `[kibi-performance] ${JSON.stringify(incomplete)}\n`,
      ),
    /invalid schema/,
  );
  const truncated = parseSourceAnalysisTimings(
    `[kibi-performance] ${JSON.stringify({
      kind: "source-analysis-truncated",
      reason: "byte_limit",
    })}\n`,
  );
  assert.equal(truncated.status, "truncated");
  assert.equal(truncated.observations.length, 0);
  assert.throws(
    () =>
      parseSourceAnalysisTimings(
        `[kibi-performance] ${JSON.stringify({
          kind: "source-analysis-truncated",
          reason: "unknown",
        })}\n`,
      ),
    /malformed source-analysis limit marker/,
  );
});

test("accepted staged checks require complete mixed-language and Prolog/cache timing per repeat", () => {
  const sourceAnalysis = {
    status: "observed",
    observations: ["python", "go", "rust"].map((language) => ({ language })),
  };
  const roundTrip = {
    status: "observed",
    eventCount: 2,
    roundTrips: { count: 1 },
    cacheHits: { count: 1 },
  };
  assert.doesNotThrow(() =>
    assertAcceptedCheckTimingCoverage(sourceAnalysis, roundTrip, {
      requireRoundTrip: true,
    }),
  );
  assert.doesNotThrow(() =>
    assertAcceptedCheckTimingCoverage(sourceAnalysis, {
      status: "observed_without_round_trips",
      eventCount: 1,
      roundTrips: { count: 0 },
      cacheHits: { count: 1 },
    }),
  );
  assert.throws(
    () =>
      assertAcceptedCheckTimingCoverage(
        { ...sourceAnalysis, status: "truncated" },
        roundTrip,
      ),
    /complete Python, Go and Rust/,
  );
  assert.throws(
    () =>
      assertAcceptedCheckTimingCoverage(
        {
          ...sourceAnalysis,
          observations: sourceAnalysis.observations.filter(
            ({ language }) => language !== "rust",
          ),
        },
        roundTrip,
      ),
    /complete Python, Go and Rust/,
  );
  assert.throws(
    () =>
      assertAcceptedCheckTimingCoverage(sourceAnalysis, {
        ...roundTrip,
        eventCount: 0,
      }),
    /usable Prolog round-trip or cache/,
  );
  assert.throws(
    () =>
      assertAcceptedCheckTimingCoverage(sourceAnalysis, {
        ...roundTrip,
        roundTrips: { count: 0 },
        cacheHits: { count: 0 },
      }),
    /usable Prolog round-trip or cache/,
  );
  assert.throws(
    () =>
      assertAcceptedCheckTimingCoverage(
        sourceAnalysis,
        {
          ...roundTrip,
          roundTrips: { count: 0 },
        },
        { requireRoundTrip: true },
      ),
    /genuine Prolog query round trip/,
  );
});

test("private Prolog trace reader separates round trips, cache hits and missing or truncated data", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "kibi-trace-reader-"));
  const traceDir = path.join(root, "trace");
  mkdirSync(traceDir, { mode: 0o700 });
  try {
    const before = capturePerformanceTraceOffsets(traceDir);
    const filename = path.join(
      traceDir,
      `kibi-performance-${process.pid}.jsonl`,
    );
    writeFileSync(
      filename,
      `${JSON.stringify({
        kind: "prolog-round-trip",
        durationMs: 12.5,
        pid: process.pid,
      })}\n`,
      { mode: 0o600 },
    );
    const observed = readPerformanceTraceWindow(traceDir, before);
    assert.equal(observed.status, "observed");
    assert.equal(observed.events.length, 1);
    assert.deepEqual(summarizePrologTiming(observed), {
      status: "observed",
      eventCount: 1,
      roundTrips: { count: 1, observedWallMs: 12.5 },
      cacheHits: {
        count: 0,
        observedLookupWallMs: null,
        byKind: {
          "prolog-process-cache-hit": 0,
          "engine-query-cache-hit": 0,
          "engine-freshness-cache-hit": 0,
        },
      },
    });

    const noChange = readPerformanceTraceWindow(
      traceDir,
      capturePerformanceTraceOffsets(traceDir),
    );
    assert.equal(noChange.status, "unavailable_no_new_events");
    assert.equal(summarizePrologTiming(noChange).roundTrips.count, null);

    const malformedStart = capturePerformanceTraceOffsets(traceDir);
    appendFileSync(filename, "{bad json}\n");
    assert.throws(
      () => readPerformanceTraceWindow(traceDir, malformedStart),
      /malformed JSON/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }

  const truncatedRoot = mkdtempSync(
    path.join(os.tmpdir(), "kibi-trace-truncated-"),
  );
  const truncatedDir = path.join(truncatedRoot, "trace");
  mkdirSync(truncatedDir, { mode: 0o700 });
  try {
    const filename = path.join(
      truncatedDir,
      `kibi-performance-${process.pid}.jsonl`,
    );
    writeFileSync(
      filename,
      `${JSON.stringify({ kind: "prolog-round-trip", durationMs: 1, pid: process.pid })}\n`,
      { mode: 0o600 },
    );
    const before = capturePerformanceTraceOffsets(truncatedDir);
    writeFileSync(filename, "", { mode: 0o600 });
    assert.equal(
      readPerformanceTraceWindow(truncatedDir, before).status,
      "truncated",
    );
    chmodSync(truncatedDir, 0o755);
    assert.throws(
      () => capturePerformanceTraceOffsets(truncatedDir),
      /private and user-owned/,
    );
  } finally {
    rmSync(truncatedRoot, { recursive: true, force: true });
  }
});

test("strict baseline policy is staged and the missing-review failure is required", () => {
  const root = mkdtempSync(
    path.join(os.tmpdir(), "kibi-benchmark-policy-test-"),
  );
  try {
    const env = makeRuntimeEnvironment(root);
    mkdirSync(path.join(root, ".kb"), { recursive: true });
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(path.join(root, ".gitignore"), "node_modules/\n");
    writeFileSync(path.join(root, ".kb", "fixture.md"), "fixture\n");
    writeFileSync(path.join(root, "package.json"), "{}\n");
    writeFileSync(
      path.join(root, "src", "fixture.py"),
      "def fixture(): pass\n",
    );
    execFileSync("git", ["init", "-b", "main"], { cwd: root, env });

    const policyPath = writeBaselineImpactPolicy(root);
    const policy = JSON.parse(readFileSync(policyPath, "utf8"));
    assert.deepEqual(policy, {
      contractVersion: "kibi.impact-policy.v1",
      id: "synthetic-benchmark-strict-policy",
      version: "1",
      allowUnsupportedReview: false,
      allowedPartial: [],
      notApplicablePaths: [],
    });
    stageBaselineFiles(root, env);
    const stagedPaths = execFileSync(
      "git",
      ["diff", "--cached", "--name-only"],
      { cwd: root, env, encoding: "utf8" },
    )
      .trim()
      .split("\n");
    assert(stagedPaths.includes(".kibi/impact-policy.json"));
    assert.deepEqual(
      JSON.parse(
        execFileSync("git", ["show", ":.kibi/impact-policy.json"], {
          cwd: root,
          env,
          encoding: "utf8",
        }),
      ),
      policy,
    );

    const stagedWithoutReview = {
      structuredContent: {
        violations: [],
        diagnostics: [{ id: "staged_file_impact_review_needed" }],
        staged: { files: [{ path: "src/fixture.py" }] },
        operationalError:
          "Staged impact review failed: Captured impact review record missing",
      },
    };
    assert.deepEqual(
      checkStagedImpactReviewRequired({ code: 1 }, stagedWithoutReview),
      {
        exitCode: 1,
        expectedOperationalErrorObserved: true,
        missingImpactReviewFailureObserved: true,
        legacyMissingImpactReviewAdvisoryObserved: true,
        stagedFileCount: 1,
        blockingViolationCount: 0,
      },
    );
    assert.throws(
      () => checkStagedImpactReviewRequired({ code: 0 }, stagedWithoutReview),
      /exit 1/,
    );
    assert.throws(
      () => checkStagedImpactReviewRequired({ code: 2 }, stagedWithoutReview),
      /exit 1/,
    );
    assert.throws(
      () =>
        checkStagedImpactReviewRequired(
          { code: 1 },
          {
            structuredContent: {
              ...stagedWithoutReview.structuredContent,
              operationalError: "Unrelated operational failure",
            },
          },
        ),
      /expected missing impact-review operational error/,
    );
    assert.equal(
      checkStagedImpactReviewRequired(
        { code: 1 },
        {
          structuredContent: {
            ...stagedWithoutReview.structuredContent,
            diagnostics: [],
          },
        },
      ).legacyMissingImpactReviewAdvisoryObserved,
      false,
    );
    assert.throws(
      () =>
        checkStagedImpactReviewRequired(
          { code: 1 },
          {
            structuredContent: {
              ...stagedWithoutReview.structuredContent,
              staged: { files: [] },
            },
          },
        ),
      /did not expose changed files/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function writePackage(
  nodeModules,
  relativeRoot,
  manifest,
  content = "fixture\n",
) {
  const packageRoot = path.join(nodeModules, ...relativeRoot.split("/"));
  mkdirSync(packageRoot, { recursive: true });
  writeFileSync(
    path.join(packageRoot, "package.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  if (content !== null)
    writeFileSync(path.join(packageRoot, "index.txt"), content);
  return packageRoot;
}

function tarFile(name, bytes) {
  const header = Buffer.alloc(512);
  header.write(name, 0, 100, "utf8");
  header.write("0000644\0", 100, 8, "ascii");
  header.write("0000000\0", 108, 8, "ascii");
  header.write("0000000\0", 116, 8, "ascii");
  header.write(
    `${bytes.length.toString(8).padStart(11, "0")}\0`,
    124,
    12,
    "ascii",
  );
  header.write("0000000\0", 136, 8, "ascii");
  header.fill(32, 148, 156);
  header[156] = "0".charCodeAt(0);
  header.write("ustar\0", 257, 6, "ascii");
  header.write("00", 263, 2, "ascii");
  const checksum = [...header].reduce((sum, byte) => sum + byte, 0);
  header.write(`${checksum.toString(8).padStart(6, "0")}\0 `, 148, 8, "ascii");
  const padding = Buffer.alloc((512 - (bytes.length % 512)) % 512);
  return Buffer.concat([header, bytes, padding]);
}

function makeNpmTarball(files) {
  const rows = [];
  for (const [relativePath, bytes] of files) {
    rows.push(tarFile(`package/${relativePath}`, bytes));
  }
  rows.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(rows));
}

test("source package qualification compares every packed regular file and rejects corrupt or incomplete inputs", () => {
  const root = mkdtempSync(
    path.join(os.tmpdir(), "kibi-source-qualification-"),
  );
  const repoRoot = path.join(root, "repo");
  const packageRoot = path.join(repoRoot, "packages", "fixture");
  mkdirSync(packageRoot, { recursive: true });
  const manifest = Buffer.from(
    `${JSON.stringify({ name: "fixture-package", version: "1.0.0" }, null, 2)}\n`,
  );
  const source = Buffer.from("export const fixture = true;\n");
  writeFileSync(path.join(packageRoot, "package.json"), manifest);
  writeFileSync(path.join(packageRoot, "index.js"), source);
  const archivePath = path.join(root, "fixture.tgz");
  writeFileSync(
    archivePath,
    makeNpmTarball([
      ["package.json", manifest],
      ["index.js", source],
    ]),
  );
  const inputs = {
    repoRoot,
    packages: [
      {
        folder: "fixture",
        sourceDirectory: packageRoot,
        tarballPath: archivePath,
      },
    ],
    expectedFolders: ["fixture"],
  };
  try {
    const qualification = qualifySourcePackageTarballs(inputs);
    assert.equal(qualification.packageCount, 1);
    assert.equal(qualification.packagedFiles, 2);
    assert.deepEqual(qualification.mismatches, []);
    assert.equal(qualification.tarballs[0].name, "fixture-package");
    assert.equal(qualification.tarballs[0].files, 2);

    writeFileSync(path.join(packageRoot, "index.js"), "changed source\n");
    assert.throws(
      () => qualifySourcePackageTarballs(inputs),
      /Packaged bytes differ from current source\/build output/,
    );
    writeFileSync(path.join(packageRoot, "index.js"), source);
    assert.throws(
      () =>
        qualifySourcePackageTarballs({
          ...inputs,
          expectedFolders: ["fixture", "missing"],
        }),
      /package or file count drifted/,
    );
    assert.throws(
      () =>
        qualifySourcePackageTarballs({
          ...inputs,
          packages: [],
        }),
      /nonempty package inventory/,
    );
    writeFileSync(archivePath, Buffer.from("not a gzip archive"));
    assert.throws(() => qualifySourcePackageTarballs(inputs));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("catalog runtime archive verification uses the exact SHA-512 and package identity", () => {
  const packageJson = Buffer.from(
    `${JSON.stringify({ name: "web-tree-sitter", version: "0.27.0", license: "MIT" })}\n`,
  );
  const payload = Buffer.from("inert catalog runtime fixture\n");
  const archive = makeNpmTarball([
    ["package.json", packageJson],
    ["index.js", payload],
  ]);
  const catalog = {
    package: "web-tree-sitter",
    version: "0.27.0",
    license: "MIT",
    packedBytes: archive.length,
    unpackedBytes: packageJson.length + payload.length,
    npmIntegrity: `sha512-${createHash("sha512").update(archive).digest("base64")}`,
  };
  const verified = verifyCatalogRuntimeArchiveBytes(archive, catalog);
  assert.equal(verified.archiveEntries.size, 2);
  assert.equal(verified.archiveSha256, hash(archive));
  assert.throws(
    () =>
      verifyCatalogRuntimeArchiveBytes(
        Buffer.from(archive).subarray(1),
        catalog,
      ),
    /size does not match catalog/,
  );
  assert.throws(
    () =>
      verifyCatalogRuntimeArchiveBytes(archive, {
        ...catalog,
        version: "0.27.1",
      }),
    /identity\/license differs from catalog/,
  );
});

test("fetches only the catalog-pinned runtime URL with bounded integrity verification", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "kibi-runtime-fetch-test-"));
  const packageJson = Buffer.from(
    `${JSON.stringify({ name: "web-tree-sitter", version: "0.27.0", license: "MIT" })}\n`,
  );
  const payload = Buffer.from("inert runtime artifact fixture\n");
  const archive = makeNpmTarball([
    ["package.json", packageJson],
    ["index.js", payload],
  ]);
  const runtime = {
    package: "web-tree-sitter",
    version: "0.27.0",
    license: "MIT",
    npmTarball:
      "https://registry.npmjs.org/web-tree-sitter/-/web-tree-sitter-0.27.0.tgz",
    npmIntegrity: `sha512-${createHash("sha512").update(archive).digest("base64")}`,
    packedBytes: archive.length,
    unpackedBytes: packageJson.length + payload.length,
  };
  const catalogPath = path.join(root, "catalog.json");
  const outputPath = path.join(root, "runtime.tgz");
  writeFileSync(catalogPath, JSON.stringify({ runtime }));
  try {
    let requestedUrl;
    let requestedOptions;
    const fetched = await fetchCatalogPinnedRuntimeArchive({
      catalogPath,
      outputPath,
      fetchImpl: async (url, options) => {
        requestedUrl = url;
        requestedOptions = options;
        return new Response(archive, {
          status: 200,
          headers: { "content-length": String(archive.length) },
        });
      },
    });
    assert.equal(requestedUrl, runtime.npmTarball);
    assert.equal(requestedOptions.redirect, "error");
    assert.equal(fetched.sha256, hash(archive));
    assert.equal(fetched.fileCount, 2);
    assert.deepEqual(readFileSync(outputPath), archive);

    await assert.rejects(
      fetchCatalogPinnedRuntimeArchive({
        catalogPath,
        outputPath: path.join(root, "corrupt.tgz"),
        fetchImpl: async () =>
          new Response(Buffer.from(archive).fill(0), {
            status: 200,
            headers: { "content-length": String(archive.length) },
          }),
      }),
      /SHA-512 does not match catalog/,
    );
    await assert.rejects(
      fetchCatalogPinnedRuntimeArchive({
        catalogPath,
        outputPath: path.join(root, "redirect.tgz"),
        fetchImpl: async () => ({
          status: 200,
          ok: true,
          redirected: true,
          url: "https://registry.npmjs.org/other.tgz",
          headers: new Headers(),
          body: new Response(archive).body,
        }),
      }),
      /exact registry artifact/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("normalizes source-candidate and final-pack qualification reports", () => {
  const candidate = normalizeQualificationReport({
    mismatches: [],
    packageCount: 1,
    packagedFiles: 2,
    tarballs: [
      {
        name: "kibi-cli",
        version: "2.4.0",
        path: "/tmp/kibi-cli.tgz",
        sha256: "a".repeat(64),
        bytes: 42,
      },
    ],
  });
  assert.equal(candidate.format, "source_candidate_tarballs_v1");
  assert.equal(candidate.declaredFileCount, 2);
  assert.equal(candidate.entries[0].path, "/tmp/kibi-cli.tgz");

  const finalPack = normalizeQualificationReport({
    mismatches: [],
    publishableCount: 1,
    fileCount: 3,
    packages: [
      {
        name: "kibi-cli",
        version: "2.4.0",
        tarball: "/tmp/kibi-cli-2.4.0.tgz",
        tarballSha256: "b".repeat(64),
        tarballBytes: 43,
        files: 3,
      },
    ],
  });
  assert.equal(finalPack.format, "final_pack_packages_v1");
  assert.equal(finalPack.declaredFileCount, 3);
  assert.equal(finalPack.entries[0].sha256, "b".repeat(64));
  assert.throws(
    () =>
      normalizeQualificationReport({
        mismatches: [],
        tarballs: [],
        packages: [],
      }),
    /exactly one supported package inventory shape/,
  );
});

test("requires every first-party Kibi package dependency to be archive qualified", () => {
  const manifestBytes = Buffer.from(
    JSON.stringify({
      name: "kibi-cli",
      dependencies: { "kibi-core": "2.4.0" },
      peerDependencies: { "kibi-plugin-sdk": "^0.3.0" },
    }),
    "utf8",
  );
  const packageSources = [
    {
      archiveEntries: new Map([
        ["package.json", { kind: "file", bytes: manifestBytes }],
      ]),
    },
  ];
  assert.deepEqual(
    verifyQualifiedKibiDependencies(
      packageSources,
      new Set(["kibi-core", "kibi-plugin-sdk"]),
    ),
    ["kibi-core", "kibi-plugin-sdk"],
  );
  assert.throws(
    () =>
      verifyQualifiedKibiDependencies(packageSources, new Set(["kibi-core"])),
    /Qualification omits first-party Kibi dependency kibi-plugin-sdk/,
  );
});

test("compares installed parser runtime files to a catalog-pinned archive", () => {
  const root = mkdtempSync(
    path.join(os.tmpdir(), "kibi-runtime-archive-test-"),
  );
  try {
    const packageJson = Buffer.from(
      `${JSON.stringify({ name: "web-tree-sitter", version: "0.27.0" }, null, 2)}\n`,
      "utf8",
    );
    const sourceBytes = Buffer.from("inert runtime file fixture\n", "utf8");
    const archiveBytes = makeNpmTarball([
      ["package.json", packageJson],
      ["index.txt", sourceBytes],
    ]);
    const installedRoot = path.join(root, "web-tree-sitter");
    mkdirSync(installedRoot);
    writeFileSync(path.join(installedRoot, "package.json"), packageJson);
    writeFileSync(path.join(installedRoot, "index.txt"), sourceBytes);
    const integrity = `sha512-${createHash("sha512").update(archiveBytes).digest("base64")}`;
    const comparison = verifyPinnedRuntimeArchive(
      archiveBytes,
      {
        package: "web-tree-sitter",
        version: "0.27.0",
        npmIntegrity: integrity,
        packedBytes: archiveBytes.length,
        unpackedBytes: packageJson.length + sourceBytes.length,
      },
      { installedRoot, inventory: installedFileInventory(installedRoot) },
    );
    assert.equal(
      comparison.status,
      "installed_bytes_match_catalog_pinned_archive",
    );
    assert.equal(comparison.fileCount, 2);
    writeFileSync(path.join(installedRoot, "index.txt"), "changed bytes\n");
    assert.throws(
      () =>
        verifyPinnedRuntimeArchive(
          archiveBytes,
          {
            package: "web-tree-sitter",
            version: "0.27.0",
            npmIntegrity: integrity,
            packedBytes: archiveBytes.length,
            unpackedBytes: packageJson.length + sourceBytes.length,
          },
          { installedRoot, inventory: installedFileInventory(installedRoot) },
        ),
      /Installed runtime bytes differ/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("installed package inventory excludes nested dependency trees", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "kibi-package-inventory-"));
  try {
    const packageRoot = path.join(root, "package");
    const nestedDependency = path.join(
      packageRoot,
      "node_modules",
      "nested-dependency",
    );
    mkdirSync(nestedDependency, { recursive: true });
    writeFileSync(
      path.join(packageRoot, "package.json"),
      `${JSON.stringify({ name: "package", version: "1.0.0" })}\n`,
    );
    writeFileSync(
      path.join(nestedDependency, "package.json"),
      `${JSON.stringify({ name: "nested-dependency", version: "2.0.0" })}\n`,
    );

    const inventory = installedFileInventory(packageRoot);

    assert.deepEqual(
      inventory.files.map(({ path: filePath }) => filePath),
      ["package.json"],
    );
    assert.equal(inventory.fileCount, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("resolves and copies a manifest-scoped installed dependency closure", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "kibi-closure-test-"));
  try {
    const prefix = path.join(root, "prefix");
    const nodeModules = path.join(prefix, "node_modules");
    mkdirSync(nodeModules, { recursive: true });
    const rootManifest = {
      name: "bench-root",
      version: "1.0.0",
      dependencies: { "bench-leaf": "1.0.0", "bench-parent": "1.0.0" },
      optionalDependencies: { "bench-optional": "^1.0.0" },
      peerDependencies: { "bench-peer": "^3.0.0" },
      peerDependenciesMeta: { "bench-peer": { optional: true } },
    };
    const rootPackage = writePackage(
      nodeModules,
      "bench-root",
      rootManifest,
      null,
    );
    writePackage(nodeModules, "bench-leaf", {
      name: "bench-leaf",
      version: "1.0.0",
    });
    writePackage(nodeModules, "bench-parent", {
      name: "bench-parent",
      version: "1.0.0",
      dependencies: { "bench-leaf": "2.0.0" },
    });
    writePackage(nodeModules, "bench-parent/node_modules/bench-leaf", {
      name: "bench-leaf",
      version: "2.0.0",
    });
    const rootManifestBytes = readFileSync(
      path.join(rootPackage, "package.json"),
    );
    const qualified = [
      {
        name: "bench-root",
        installedRoot: rootPackage,
        archiveEntries: new Map([
          ["package.json", { kind: "file", bytes: rootManifestBytes }],
        ]),
      },
    ];

    const closure = collectInstalledDependencyClosure(nodeModules, qualified);
    assert.equal(closure.packages.length, 4);
    assert.equal(closure.missingOptional.length, 2);
    assert.equal(
      closure.packages.find(({ relativeRoot }) => relativeRoot === "bench-leaf")
        .version,
      "1.0.0",
    );
    assert.equal(
      closure.packages.find(
        ({ relativeRoot }) =>
          relativeRoot === "bench-parent/node_modules/bench-leaf",
      ).version,
      "2.0.0",
    );
    assert.equal(closure.dependencyEdges.length, 3);

    const workspace = path.join(root, "workspace");
    mkdirSync(workspace);
    const copiedNodeModules = copyQualifiedPackages(
      closure.packages,
      workspace,
    );
    assert.equal(
      installedFileInventory(path.join(copiedNodeModules, "bench-root")).sha256,
      closure.packages.find(({ name }) => name === "bench-root").inventory
        .sha256,
    );
    assert.equal(
      JSON.parse(
        readFileSync(
          path.join(
            copiedNodeModules,
            "bench-parent",
            "node_modules",
            "bench-leaf",
            "package.json",
          ),
          "utf8",
        ),
      ).version,
      "2.0.0",
    );
    assert.ok(
      existsSync(path.join(copiedNodeModules, "bench-leaf", "index.txt")),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("grounds every assertive benchmark fixture claim with typed fact provenance", () => {
  const text = [
    "Each synthetic benchmark scenario includes exactly one Python source fixture.",
    "Each synthetic benchmark scenario includes exactly one Go source fixture.",
    "Each synthetic benchmark scenario includes exactly one Rust source fixture.",
  ].join(" ");
  const clauses = [
    "Each synthetic benchmark scenario includes exactly one Python source fixture.",
    "Each synthetic benchmark scenario includes exactly one Go source fixture.",
    "Each synthetic benchmark scenario includes exactly one Rust source fixture.",
  ];
  const receipt = {
    inventory_contract: {
      source_field: "semantic_text",
      source_hash: hash(text),
      version: "kibi.semantic-inventory.v1",
    },
    propositions: clauses.map((claim_text, index) => ({
      claim_key: `CLAIM-BENCH-${index}`,
      claim_text,
      role: ["normative", "definition", "descriptive"][index],
      span: { start: index * 10, end: index * 10 + 9 },
      payload_hash: hash(claim_text),
      semantic_key: `BENCH-${index}`,
    })),
  };
  const plan = buildRequirementInput(receipt);
  assert.equal(plan.entity.properties.logic_claims.length, 3);
  assert.deepEqual(
    plan.entity.properties.semantic_inventory.map(({ status }) => status),
    ["modeled", "modeled", "modeled"],
  );
  assert.equal(
    plan.entity.properties.semantic_inventory[0].payload_hash,
    hash(clauses[0]),
  );
  assert.equal(plan.facts.length, 4);
  assert.deepEqual(
    plan.facts
      .slice(1)
      .map(({ properties }) => [
        properties.claim_key,
        properties.claim_text,
        properties.value_int,
      ]),
    clauses.map((claim, index) => [`CLAIM-BENCH-${index}`, claim, 1]),
  );
  assert.equal(plan.relationships.length, 4);
});

test("uses literal Rust declarations and gives authored review a local identity", () => {
  const rust = createSyntheticDeclarations("rust", 2);
  assert.match(rust, /pub fn bench_generated_000\(\) -> &'static str/);
  assert.doesNotMatch(rust, /format!\s*\(/);
  const staged = stageContent({ content: rust, declarationCount: 2 });
  assert.match(staged, /:kibi-bench-staged-000/);
  assert.match(staged, /:kibi-bench-baseline-001/);
  assert.doesNotMatch(staged, /:kibi-bench-staged-001/);

  const record = assignSyntheticReviewIdentity(
    { reviewer: { id: null, source: "self-claimed-local" }, reviewedAt: null },
    "2026-09-27T10:11:12.000Z",
  );
  assert.deepEqual(record.reviewer, {
    id: "synthetic-benchmark-author",
    source: "self-claimed-local",
  });
  assert.equal(record.reviewedAt, "2026-09-27T10:11:12.000Z");
  assert.throws(
    () => assignSyntheticReviewIdentity({ reviewer: {} }, "not-a-timestamp"),
    /valid ISO timestamp/,
  );
});

test("authors prepared file decisions with reviewer and timestamp fields", () => {
  const workspace = mkdtempSync(
    path.join(os.tmpdir(), "kibi-review-authoring-test-"),
  );
  try {
    const result = authorPreparedRecord(
      {
        preparationVersion: "kibi.impact-review-preparation.v1",
        requirementScopes: [],
        residualReviewObligations: [],
        authorship: {
          recordTemplate: {
            isValidImpactReviewRecord: false,
            record: {
              reviewer: { id: null, source: "self-claimed-local" },
              reviewedAt: null,
              files: [
                {
                  path: ".kb/symbol-coordinates.yaml",
                  analysisReviews: null,
                  decision: null,
                },
              ],
            },
          },
        },
      },
      [],
      workspace,
    );
    const authored = JSON.parse(readFileSync(result.recordPath, "utf8"));
    assert.equal(authored.reviewer.id, "synthetic-benchmark-author");
    assert.match(authored.reviewedAt, /^\d{4}-\d{2}-\d{2}T.*Z$/);
    assert.equal(authored.files[0].analysisReviews.length, 0);
    assert.equal(authored.files[0].decision.kind, "no_impact");
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("preserves the temporary workspace when public engine stop fails", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "kibi-engine-cleanup-test-"));
  const workspace = path.join(root, "workspace");
  const traceDirectory = path.join(root, "trace");
  mkdirSync(workspace);
  mkdirSync(traceDirectory);
  writeFileSync(path.join(workspace, "marker.txt"), "preserve-me\n");
  try {
    await assert.rejects(
      stopEngineAndRemoveWorkspace({
        workspace,
        traceDirectory,
        measurements: {},
        stopEngine: async () => {
          throw new Error("public stop returned failure");
        },
      }),
      (error) => {
        assert.equal(
          error.benchmarkCleanup.status,
          "stop_failed_workspace_preserved",
        );
        assert.equal(error.benchmarkCleanup.workspacePath, workspace);
        assert.equal(error.benchmarkCleanup.traceDirectoryPath, traceDirectory);
        return true;
      },
    );
    assert.equal(
      readFileSync(path.join(workspace, "marker.txt"), "utf8"),
      "preserve-me\n",
    );
    assert.equal(existsSync(traceDirectory), true);

    const stoppedWorkspace = path.join(root, "stopped");
    const stoppedTraceDirectory = path.join(root, "stopped-trace");
    mkdirSync(stoppedWorkspace);
    mkdirSync(stoppedTraceDirectory);
    const measurements = {};
    await stopEngineAndRemoveWorkspace({
      workspace: stoppedWorkspace,
      traceDirectory: stoppedTraceDirectory,
      measurements,
      stopEngine: async () => ({ command: { spawnToCloseMs: 1 } }),
    });
    assert.equal(measurements.engineCleanup.status, "stopped");
    assert.equal(existsSync(stoppedWorkspace), false);
    assert.equal(existsSync(stoppedTraceDirectory), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
