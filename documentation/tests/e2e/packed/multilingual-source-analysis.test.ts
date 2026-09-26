import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createMarkdownFile,
  createSandbox,
  kibi,
  packAll,
  run,
  stageSourceFile,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";
const COMMAND_TIMEOUT_MS = 120_000;
const PYTHON_DECORATED_SYMBOL_ID = "SYM-python-decorated";
const PYTHON_DECORATED_SOURCE =
  'def baseline():\n    return "baseline"\n\ndef added_unowned():\n    return "new behavior"\n\n@identity\ndef decorated():\n    return "decorated"\n';
const PYTHON_SYNTAX_ERROR_SOURCE = "@identity\ndef decorated(\n";

type LanguageFixture = Readonly<{
  language: "Python" | "Go" | "Rust";
  sourcePath: string;
  baseName: string;
  unownedName: string;
  baseline: string;
  withUnowned: string;
}>;

const languageFixtures: readonly LanguageFixture[] = [
  {
    language: "Python",
    sourcePath: "src/sample.py",
    baseName: "baseline",
    unownedName: "added_unowned",
    baseline: 'def baseline():\n    return "baseline"\n',
    withUnowned:
      'def baseline():\n    return "baseline"\n\ndef added_unowned():\n    return "new behavior"\n',
  },
  {
    language: "Go",
    sourcePath: "src/sample.go",
    baseName: "Baseline",
    unownedName: "AddedUnowned",
    baseline:
      'package sample\n\nfunc Baseline() string { return "baseline" }\n',
    withUnowned:
      'package sample\n\nfunc Baseline() string { return "baseline" }\n\nfunc AddedUnowned() string { return "new behavior" }\n',
  },
  {
    language: "Rust",
    sourcePath: "src/sample.rs",
    baseName: "baseline",
    unownedName: "added_unowned",
    baseline: 'pub fn baseline() -> &\'static str {\n    "baseline"\n}\n',
    withUnowned:
      'pub fn baseline() -> &\'static str {\n    "baseline"\n}\n\npub fn added_unowned() -> &\'static str {\n    "new behavior"\n}\n',
  },
];

function outputOf(result: { stdout: string; stderr: string }): string {
  return `${result.stdout}\n${result.stderr}`;
}

function assertCommandExit(
  result: { stdout: string; stderr: string; exitCode: number },
  expected: number,
  label: string,
): void {
  assert.equal(
    result.exitCode,
    expected,
    `${label} exited ${result.exitCode}; expected ${expected}.\n${outputOf(result)}`,
  );
}

type StagedViolation = Readonly<{
  name: string;
  file: string;
  currentLinks: number;
  requiredLinks: number;
}>;

function stagedViolations(result: {
  stdout: string;
  stderr: string;
}): StagedViolation[] {
  const envelope = JSON.parse(result.stdout) as {
    structuredContent?: {
      violations?: StagedViolation[];
      count?: number;
    };
  };
  const content = envelope.structuredContent;
  assert.ok(
    content,
    `staged check returned no structured content.\n${outputOf(result)}`,
  );
  assert.ok(
    Array.isArray(content.violations),
    "staged check returned no violations array",
  );
  assert.equal(
    content.count,
    content.violations.length,
    "staged violation count disagrees with its rows",
  );
  return content.violations;
}

function symbolsManifest(
  fixture: LanguageFixture,
  includeAdded: boolean,
  includeDecorated = false,
) {
  const entries = [
    {
      id: `SYM-${fixture.language.toLowerCase()}-baseline`,
      title: fixture.baseName,
    },
    ...(includeAdded
      ? [
          {
            id: `SYM-${fixture.language.toLowerCase()}-added-unowned`,
            title: fixture.unownedName,
          },
        ]
      : []),
    ...(includeDecorated && fixture.language === "Python"
      ? [{ id: PYTHON_DECORATED_SYMBOL_ID, title: "decorated" }]
      : []),
  ];
  return [
    "symbols:",
    ...entries.flatMap((entry) => [
      `  - id: ${entry.id}`,
      `    title: ${entry.title}`,
      `    sourceFile: ${fixture.sourcePath}`,
      "    relationships:",
      "      - type: implements",
      "        target: REQ-source-analysis-v2-contract",
    ]),
    "",
  ].join("\n");
}

type QueriedSymbol = Readonly<{
  id: string;
  sourceLine?: number;
  sourceColumn?: number;
  sourceEndLine?: number;
  sourceEndColumn?: number;
}>;

async function querySymbols(
  sandbox: TestSandbox,
  args: readonly string[],
  label: string,
): Promise<QueriedSymbol[]> {
  const result = await kibi(sandbox, [
    "query",
    "symbol",
    "--format",
    "json",
    ...args,
  ]);
  assertCommandExit(result, 0, label);
  return JSON.parse(result.stdout) as QueriedSymbol[];
}

function manifestSymbolIds(content: string): string[] {
  return [...content.matchAll(/^\s+- id: ([^\r\n]+)$/gm)].map(
    (match) => match[1] ?? "",
  );
}

async function runPythonDecoratorCoordinateWorkflow(
  sandbox: TestSandbox,
  fixture: LanguageFixture,
): Promise<void> {
  assert.equal(fixture.language, "Python");
  const sourcePath = join(sandbox.repoDir, fixture.sourcePath);
  const symbolsPath = join(sandbox.repoDir, ".kb/symbols.yaml");
  const expectedManifest = symbolsManifest(fixture, true, true);
  const expectedSymbolIds = [
    "SYM-python-baseline",
    "SYM-python-added-unowned",
    PYTHON_DECORATED_SYMBOL_ID,
  ];
  const expectedSourceBytes = Buffer.from(PYTHON_DECORATED_SOURCE, "utf8");

  writeFileSync(sourcePath, expectedSourceBytes);
  writeFileSync(symbolsPath, expectedManifest, "utf8");
  stageSourceFile(sandbox, fixture.sourcePath);
  stageSourceFile(sandbox, ".kb/symbols.yaml");

  const coordinateRefresh = await kibi(
    sandbox,
    ["sync", "--refresh-symbol-coordinates"],
    { timeoutMs: COMMAND_TIMEOUT_MS },
  );
  assertCommandExit(coordinateRefresh, 0, "explicit decorated Python coordinate refresh");
  assert.match(
    outputOf(coordinateRefresh),
    /Coordinate-only refresh for src\/sample\.py; source analysis remains partial:/i,
    "coordinate refresh must keep the parser's partial status visible",
  );
  assert.match(
    outputOf(coordinateRefresh),
    /Python decorators are not evaluated and may alter or synthesize declarations/i,
  );
  stageSourceFile(sandbox, ".kb/symbol-coordinates.yaml");

  assert.deepEqual(
    readFileSync(sourcePath),
    expectedSourceBytes,
    "coordinate refresh must preserve exact Python source bytes",
  );
  assert.deepEqual(
    manifestSymbolIds(readFileSync(symbolsPath, "utf8")).sort(),
    [...expectedSymbolIds].sort(),
    "coordinate refresh must not author or synthesize symbol declarations",
  );

  const decorated = await querySymbols(
    sandbox,
    ["--id", PYTHON_DECORATED_SYMBOL_ID],
    "query decorated Python symbol coordinates",
  );
  assert.equal(decorated.length, 1);
  assert.deepEqual(
    {
      sourceLine: decorated[0]?.sourceLine,
      sourceColumn: decorated[0]?.sourceColumn,
      sourceEndLine: decorated[0]?.sourceEndLine,
      sourceEndColumn: decorated[0]?.sourceEndColumn,
    },
    { sourceLine: 8, sourceColumn: 0, sourceEndLine: 9, sourceEndColumn: 22 },
    "public query must return the decorated declaration's known source range",
  );
  const pythonSymbols = await querySymbols(
    sandbox,
    ["--source", fixture.sourcePath],
    "query all authored Python source symbols",
  );
  assert.deepEqual(
    pythonSymbols.map((symbol) => symbol.id).sort(),
    [...expectedSymbolIds].sort(),
    "partial parser analysis must not create declarations that were not authored",
  );

  const partialDefaultCheck = await kibi(sandbox, [
    "check-generated",
    "--staged",
  ]);
  assert.notEqual(
    partialDefaultCheck.exitCode,
    0,
    "default staged generated-manifest check must still reject partial decorated analysis",
  );
  assert.match(
    outputOf(partialDefaultCheck),
    /Cannot refresh incomplete source analysis for src\/sample\.py/i,
  );
  assert.deepEqual(readFileSync(sourcePath), expectedSourceBytes);
  assert.deepEqual(
    manifestSymbolIds(readFileSync(symbolsPath, "utf8")).sort(),
    [...expectedSymbolIds].sort(),
  );

  const syntaxErrorBytes = Buffer.from(PYTHON_SYNTAX_ERROR_SOURCE, "utf8");
  writeFileSync(sourcePath, syntaxErrorBytes);
  stageSourceFile(sandbox, fixture.sourcePath);
  const syntaxDefaultCheck = await kibi(sandbox, [
    "check-generated",
    "--staged",
  ]);
  assert.notEqual(
    syntaxDefaultCheck.exitCode,
    0,
    "default staged generated-manifest check must reject Python syntax errors",
  );
  assert.match(
    outputOf(syntaxDefaultCheck),
    /Cannot refresh incomplete source analysis for src\/sample\.py/i,
  );
  assert.deepEqual(
    readFileSync(sourcePath),
    syntaxErrorBytes,
    "failed syntax validation must not rewrite Python source bytes",
  );
  assert.deepEqual(
    manifestSymbolIds(readFileSync(symbolsPath, "utf8")).sort(),
    [...expectedSymbolIds].sort(),
  );
}

function createNetworkGuard(sandbox: TestSandbox): string {
  const guardPath = join(sandbox.baseDir, "deny-network.cjs");
  writeFileSync(
    guardPath,
    `"use strict";
const path = require("node:path");
const net = require("node:net");
const http = require("node:http");
const https = require("node:https");
const tls = require("node:tls");
const dns = require("node:dns");
const { syncBuiltinESMExports } = require("node:module");
const blocked = (name) => function blockedNetworkOperation() {
  throw new Error("Packed E2E runtime network access is disabled: " + name);
};
const unixSocketPath = (address) => {
  if (Array.isArray(address)) {
    for (const nested of address) {
      const found = unixSocketPath(nested);
      if (found) return found;
    }
    return undefined;
  }
  const candidate = typeof address === "string"
    ? address
    : address && typeof address === "object"
      ? address.path
      : undefined;
  return typeof candidate === "string" && path.isAbsolute(candidate)
    ? candidate
    : undefined;
};
// This preload is confined to disposable consumer processes. Guard the socket
// method itself so direct net.Socket.connect calls cannot bypass the ordinary
// net/http entry points below.
const NativeSocket = net.Socket;
const nativeSocketConnect = NativeSocket.prototype.connect;
NativeSocket.prototype.connect = function guardedSocketConnect(...args) {
  if (unixSocketPath(args[0])) {
    return nativeSocketConnect.apply(this, args);
  }
  throw new Error("Packed E2E runtime network access is disabled: TCP socket");
};
const guardConnection = (original, name) => function guardedConnection(...args) {
  if (unixSocketPath(args[0])) {
    return original.apply(this, args);
  }
  throw new Error("Packed E2E runtime network access is disabled: " + name);
};
net.connect = guardConnection(net.connect, "net.connect");
net.createConnection = guardConnection(net.createConnection, "net.createConnection");
for (const transport of [http, https]) {
  transport.request = blocked("HTTP request");
  transport.get = blocked("HTTP GET");
}
tls.connect = blocked("TLS socket");
for (const name of ["lookup", "resolve", "resolve4", "resolve6", "resolveAny", "resolveCname", "resolveMx", "resolveNaptr", "resolveNs", "resolvePtr", "resolveSoa", "resolveSrv", "resolveTxt", "reverse"]) {
  if (typeof dns[name] === "function") dns[name] = blocked("DNS " + name);
}
if (dns.promises) {
  for (const name of Object.keys(dns.promises)) {
    if (typeof dns.promises[name] === "function") dns.promises[name] = blocked("DNS promise " + name);
  }
}
globalThis.fetch = blocked("fetch");
globalThis.KIBI_E2E_NETWORK_GUARD = "active";
syncBuiltinESMExports();
`,
    "utf8",
  );
  sandbox.env.NODE_OPTIONS = [
    sandbox.env.NODE_OPTIONS,
    `--require=${JSON.stringify(guardPath)}`,
  ]
    .filter(Boolean)
    .join(" ");
  return guardPath;
}

async function runLanguageWorkflow(
  fixture: LanguageFixture,
  tarballs: Tarballs,
): Promise<void> {
  const sandbox = createSandbox();
  try {
    await sandbox.install(tarballs);
    await sandbox.initGitRepo();

    assertCommandExit(
      await run("git", ["commit", "--allow-empty", "-m", "initial"], {
        cwd: sandbox.repoDir,
        env: sandbox.env,
      }),
      0,
      "initial Git commit",
    );
    assertCommandExit(await kibi(sandbox, ["init"]), 0, "kibi init");

    const packageConfig = {
      name: `multilingual-source-analysis-${fixture.language.toLowerCase()}`,
      private: true,
      dependencies: { "kibi-plugin-treesitter": "*" },
      kibi: {
        plugins: [
          {
            package: "kibi-plugin-treesitter",
            capabilities: {
              "kibi.symbol-extractor.v2": { mode: "augment" },
            },
          },
        ],
      },
    };
    writeFileSync(
      join(sandbox.repoDir, "package.json"),
      `${JSON.stringify(packageConfig, null, 2)}\n`,
      "utf8",
    );

    const localPluginInstall = await run(
      "npm",
      [
        "install",
        "--prefix",
        sandbox.repoDir,
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--no-save",
        "--package-lock=false",
        `file:${tarballs["plugin-sdk"]}`,
        `file:${tarballs["plugin-treesitter"]}`,
      ],
      {
        cwd: sandbox.repoDir,
        env: sandbox.env,
        timeoutMs: COMMAND_TIMEOUT_MS,
      },
    );
    assertCommandExit(localPluginInstall, 0, "consumer-local parser install");

    const installedParser = JSON.parse(
      readFileSync(
        join(
          sandbox.repoDir,
          "node_modules/kibi-plugin-treesitter/package.json",
        ),
        "utf8",
      ),
    ) as { version?: unknown };
    assert.equal(typeof installedParser.version, "string");
    packageConfig.dependencies["kibi-plugin-treesitter"] =
      installedParser.version as string;
    writeFileSync(
      join(sandbox.repoDir, "package.json"),
      `${JSON.stringify(packageConfig, null, 2)}\n`,
      "utf8",
    );

    createNetworkGuard(sandbox);
    const guardProbe = await run(
      "node",
      [
        "-e",
        `const assert = require("node:assert/strict"); const net = require("node:net"); assert.equal(globalThis.KIBI_E2E_NETWORK_GUARD, "active"); assert.throws(() => new net.Socket().connect(9, "127.0.0.1"), /network access is disabled/); assert.throws(() => net.createConnection(9, "127.0.0.1"), /network access is disabled/); assert.throws(() => fetch("https://example.invalid"), /network access is disabled/); process.stdout.write("active");`,
      ],
      { cwd: sandbox.repoDir, env: sandbox.env },
    );
    assertCommandExit(guardProbe, 0, "offline guard preload probe");
    assert.equal(guardProbe.stdout, "active", "offline guard was not loaded");

    createMarkdownFile(
      sandbox,
      ".kb/requirements/REQ-source-analysis-v2-contract.md",
      {
        id: "REQ-source-analysis-v2-contract",
        title: "Staged multilingual source declarations have ownership",
        status: "active",
        created_at: "2026-09-26T00:00:00Z",
        updated_at: "2026-09-26T00:00:00Z",
        source: ".kb/requirements/REQ-source-analysis-v2-contract.md",
      },
      "Every changed Python, Go, and Rust declaration is analyzed by the approved source provider and receives authored requirement ownership.",
    );

    mkdirSync(join(sandbox.repoDir, "src"), { recursive: true });
    writeFileSync(
      join(sandbox.repoDir, fixture.sourcePath),
      fixture.baseline,
      "utf8",
    );
    writeFileSync(
      join(sandbox.repoDir, ".kb/symbols.yaml"),
      symbolsManifest(fixture, false),
      "utf8",
    );
    stageSourceFile(sandbox, "package.json");
    stageSourceFile(sandbox, fixture.sourcePath);
    stageSourceFile(sandbox, ".kb/symbols.yaml");

    assertCommandExit(
      await kibi(sandbox, ["sync", "--refresh-symbol-coordinates"], {
        timeoutMs: COMMAND_TIMEOUT_MS,
      }),
      0,
      "baseline source sync and coordinate refresh",
    );
    stageSourceFile(sandbox, ".kb/symbols.yaml");
    stageSourceFile(sandbox, ".kb/symbol-coordinates.yaml");

    const baselineCheck = await kibi(
      sandbox,
      ["check", "--staged", "--format", "json"],
      { timeoutMs: COMMAND_TIMEOUT_MS },
    );
    assertCommandExit(baselineCheck, 0, "owned baseline staged check");
    assert.equal(
      stagedViolations(baselineCheck).length,
      0,
      "baseline must run and pass staged validation",
    );
    assertCommandExit(
      await run("git", ["commit", "-m", `${fixture.language} owned baseline`], {
        cwd: sandbox.repoDir,
        env: sandbox.env,
      }),
      0,
      `${fixture.language} baseline commit`,
    );

    writeFileSync(
      join(sandbox.repoDir, fixture.sourcePath),
      fixture.withUnowned,
      "utf8",
    );
    stageSourceFile(sandbox, fixture.sourcePath);

    const unownedCheck = await kibi(
      sandbox,
      ["check", "--staged", "--format", "json"],
      { timeoutMs: COMMAND_TIMEOUT_MS },
    );
    assertCommandExit(
      unownedCheck,
      1,
      `${fixture.language} unowned declaration`,
    );
    const unownedViolations = stagedViolations(unownedCheck).filter(
      (violation) =>
        violation.file === fixture.sourcePath &&
        violation.name === fixture.unownedName,
    );
    assert.equal(
      unownedViolations.length,
      1,
      `staged check should report exactly one missing-ownership violation for ${fixture.unownedName}:\n${outputOf(unownedCheck)}`,
    );
    assert.equal(unownedViolations[0]?.currentLinks, 0);
    assert.equal(unownedViolations[0]?.requiredLinks, 1);

    writeFileSync(
      join(sandbox.repoDir, ".kb/symbols.yaml"),
      symbolsManifest(fixture, true),
      "utf8",
    );
    stageSourceFile(sandbox, ".kb/symbols.yaml");
    assertCommandExit(
      await kibi(sandbox, ["sync", "--refresh-symbol-coordinates"], {
        timeoutMs: COMMAND_TIMEOUT_MS,
      }),
      0,
      `${fixture.language} ownership repair and coordinate refresh`,
    );
    stageSourceFile(sandbox, ".kb/symbols.yaml");
    stageSourceFile(sandbox, ".kb/symbol-coordinates.yaml");

    const repairedCheck = await kibi(
      sandbox,
      ["check", "--staged", "--format", "json"],
      { timeoutMs: COMMAND_TIMEOUT_MS },
    );
    assertCommandExit(
      repairedCheck,
      0,
      `${fixture.language} repaired staged check`,
    );
    assert.equal(
      stagedViolations(repairedCheck).length,
      0,
      "repaired source change must pass staged validation",
    );

    const generatedCheck = await kibi(
      sandbox,
      ["check-generated", "--staged"],
      { timeoutMs: COMMAND_TIMEOUT_MS },
    );
    assertCommandExit(
      generatedCheck,
      0,
      `${fixture.language} repaired generated-manifest check`,
    );
    assert.match(
      outputOf(generatedCheck),
      /staged generated manifests are current/i,
      "generated-manifest validation must confirm the staged snapshot",
    );
    if (fixture.language === "Python") {
      await runPythonDecoratorCoordinateWorkflow(sandbox, fixture);
    }
  } finally {
    await sandbox.cleanup();
  }
}

// executable_for TEST-source-analysis-v2-contract
export async function runMultilingualSourceAnalysisWorkflow(
  tarballs: Tarballs,
): Promise<void> {
  for (const fixture of languageFixtures) {
    await runLanguageWorkflow(fixture, tarballs);
  }
}

if (RUN_NODE_TEST_SUITE) {
  describe("Packed multilingual source-analysis ownership workflow", () => {
    let tarballs: Tarballs;

    before(
      async () => {
        assert.ok(
          checkPrologAvailable(),
          "SWI-Prolog is required for the real staged-check workflow",
        );
        tarballs = await packAll();
      },
      { timeout: 180_000 },
    );

    it(
      "passes a baseline, rejects an unowned declaration, and accepts its authored owner in Python, Go, and Rust",
      { timeout: 600_000 },
      async () => runMultilingualSourceAnalysisWorkflow(tarballs),
    );
  });
}
