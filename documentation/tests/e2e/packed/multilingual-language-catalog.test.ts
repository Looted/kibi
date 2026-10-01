// executable_for TEST-multilingual-language-catalog
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
const SETUP_TIMEOUT_MS = 120_000;
const COMMAND_TIMEOUT_MS = 30_000;
const HOOK_TIMEOUT_MS = 120_000;

type LanguageFixture = Readonly<{
  language: string;
  sourcePath: string;
  baseline: string;
  withUnowned: string;
  baselineOwners: readonly Readonly<{
    title: string;
    granularityReason?: "config-artifact" | "module-level-behavior";
  }>[];
  baselineName?: string;
  addedName: string;
  expectedAddedLocator: string;
}>;

const languageFixtures: readonly LanguageFixture[] = [
  {
    language: "java",
    sourcePath: "src/Engine.java",
    baseline: "package demo; class Engine { void baseline() {} }\n",
    withUnowned:
      "package demo; class Engine { void baseline() {} void addedUnowned() {} }\n",
    baselineOwners: [
      { title: "demo.Engine.baseline()" },
      {
        title: "demo.Engine",
        granularityReason: "module-level-behavior",
      },
    ],
    addedName: "addedUnowned",
    expectedAddedLocator: "demo.Engine.addedUnowned()",
  },
  {
    language: "csharp",
    sourcePath: "src/Engine.cs",
    baseline: "namespace Demo; class Engine { void Baseline() {} }\n",
    withUnowned:
      "namespace Demo; class Engine { void Baseline() {} void AddedUnowned() {} }\n",
    baselineOwners: [
      { title: "Demo.Engine.Baseline()" },
      {
        title: "Demo.Engine",
        granularityReason: "module-level-behavior",
      },
    ],
    addedName: "AddedUnowned",
    expectedAddedLocator: "Demo.Engine.AddedUnowned()",
  },
  {
    language: "php",
    sourcePath: "src/Engine.php",
    baseline:
      "<?php namespace Demo; class Engine { public function baseline() {} }\n",
    withUnowned:
      "<?php namespace Demo; class Engine { public function baseline() {} public function addedUnowned() {} }\n",
    baselineOwners: [
      { title: "Demo.Engine.baseline" },
      {
        title: "Demo.Engine",
        granularityReason: "module-level-behavior",
      },
    ],
    addedName: "addedUnowned",
    expectedAddedLocator: "Demo.Engine.addedUnowned",
  },
  {
    language: "c",
    sourcePath: "src/engine.c",
    baseline:
      "struct Engine { int value; }; int baseline(void) { return 1; }\n",
    withUnowned:
      "struct Engine { int value; }; int baseline(void) { return 1; } int added_unowned(void) { return 2; }\n",
    baselineOwners: [
      { title: "baseline" },
      {
        title: "struct.Engine",
        granularityReason: "module-level-behavior",
      },
    ],
    addedName: "added_unowned",
    expectedAddedLocator: "added_unowned",
  },
  {
    language: "cpp",
    sourcePath: "src/Engine.cpp",
    baseline:
      "namespace demo { class Engine { public: void baseline() {} }; }\n",
    withUnowned:
      "namespace demo { class Engine { public: void baseline() {} void addedUnowned() {} }; }\n",
    baselineOwners: [
      { title: "demo.Engine.baseline()" },
      {
        title: "demo.Engine",
        granularityReason: "module-level-behavior",
      },
    ],
    addedName: "addedUnowned",
    expectedAddedLocator: "demo.Engine.addedUnowned()",
  },
  {
    language: "bash",
    sourcePath: "src/functions.sh",
    baseline: "#!/usr/bin/env bash\nbaseline() { :; }\n",
    withUnowned:
      "#!/usr/bin/env bash\nbaseline() { :; }\nadded_unowned() { :; }\n",
    baselineOwners: [{ title: "baseline" }],
    addedName: "added_unowned",
    expectedAddedLocator: "added_unowned",
  },
  {
    language: "ruby",
    sourcePath: "src/engine.rb",
    baseline:
      "module Demo\n  class Engine\n    def baseline\n      1\n    end\n  end\nend\n",
    withUnowned:
      "module Demo\n  class Engine\n    def baseline\n      1\n    end\n    def added_unowned\n      2\n    end\n  end\nend\n",
    baselineOwners: [
      { title: "Demo.Engine.baseline" },
      {
        title: "Demo.Engine",
        granularityReason: "module-level-behavior",
      },
    ],
    addedName: "added_unowned",
    expectedAddedLocator: "Demo.Engine.added_unowned",
  },
  {
    language: "terraform",
    sourcePath: "infra/main.tf",
    baseline: 'resource "aws_instance" "baseline" { ami = "ami-baseline" }\n',
    withUnowned:
      'resource "aws_instance" "baseline" { ami = "ami-baseline" }\nresource "aws_s3_bucket" "added_unowned" { bucket = "new" }\n',
    baselineOwners: [
      {
        title: 'terraform:resource["aws_instance","baseline"]',
        granularityReason: "config-artifact",
      },
    ],
    addedName: "added_unowned",
    expectedAddedLocator: 'terraform:resource["aws_s3_bucket","added_unowned"]',
  },
  {
    language: "hcl",
    sourcePath: "infra/labels.hcl",
    baseline: 'resource "api.edge" "worker.base" { name = "base" }\n',
    withUnowned:
      'resource "api.edge" "worker.base" { name = "base" }\nresource "api.bucket" "added_unowned" { name = "new" }\n',
    baselineOwners: [
      {
        title: 'hcl:["resource","api.edge","worker.base"]',
        granularityReason: "config-artifact",
      },
    ],
    baselineName: "worker.base",
    addedName: "added_unowned",
    expectedAddedLocator: 'hcl:["resource","api.bucket","added_unowned"]',
  },
];

type SourceSymbol = Readonly<{
  name: string;
  qualifiedName?: string;
  kind: string;
  nativeKind?: string;
  nameRange?: Readonly<{
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  }>;
}>;

type Analysis = Readonly<{
  status: "ok" | "partial" | "unsupported" | "failed";
  sourceFile: string;
  language: string;
  providerId: string | null;
  inputFingerprint: string;
  symbols: readonly SourceSymbol[];
  diagnostics: readonly Readonly<{ code: string; message: string }>[];
  uncoveredRanges: readonly Readonly<{ reason: string }>[];
}>;

type StagedViolation = Readonly<{
  name: string;
  file: string;
  currentLinks: number;
  requiredLinks: number;
}>;

type StagedFile = Readonly<{
  path: string;
  sourceAnalysis?: Readonly<{
    after?: Readonly<{ inputFingerprint?: string }>;
  }>;
}>;

type StagedEnvelope = Readonly<{
  structuredContent?: Readonly<{
    count?: number;
    violations?: readonly StagedViolation[];
    staged?: Readonly<{ files?: readonly StagedFile[] }>;
  }>;
}>;

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

function parseStaged(result: {
  stdout: string;
  stderr: string;
}): StagedEnvelope {
  const envelope = JSON.parse(result.stdout) as StagedEnvelope;
  assert.ok(
    envelope.structuredContent,
    "staged check omitted structured content",
  );
  assert.ok(
    Array.isArray(envelope.structuredContent.violations),
    "staged check omitted the violation array",
  );
  assert.equal(
    envelope.structuredContent.count,
    envelope.structuredContent.violations.length,
    "staged check count disagrees with violation rows",
  );
  return envelope;
}

function symbolsFrom(envelope: StagedEnvelope): readonly StagedViolation[] {
  return envelope.structuredContent?.violations ?? [];
}

function sourceFingerprint(
  envelope: StagedEnvelope,
  sourcePath: string,
): string {
  const row = envelope.structuredContent?.staged?.files?.find(
    (file) => file.path === sourcePath,
  );
  const fingerprint = row?.sourceAnalysis?.after?.inputFingerprint;
  assert.match(
    fingerprint ?? "",
    /^[a-f0-9]{64}$/,
    `staged result omitted the SHA-256 source fingerprint for ${sourcePath}`,
  );
  return fingerprint as string;
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function manifestFor(
  analyses: readonly Analysis[],
  includeAddedOwners = false,
): string {
  const entries = analyses.flatMap((analysis, fileIndex) => {
    const fixture = languageFixtures[fileIndex];
    assert.ok(fixture, `catalog fixture ${fileIndex} is missing`);
    const owners = [
      ...fixture.baselineOwners,
      ...(includeAddedOwners ? [{ title: fixture.expectedAddedLocator }] : []),
    ];
    return owners.map((owner, ownerIndex) => {
      assert.ok(
        analysis.symbols.some(
          (symbol) => (symbol.qualifiedName ?? symbol.name) === owner.title,
        ),
        `${fixture.language} baseline owner ${owner.title} was not extracted`,
      );
      return {
        id: `SYM-CATALOG-${String(fileIndex + 1).padStart(2, "0")}-${String(ownerIndex + 1).padStart(3, "0")}`,
        ...owner,
        sourceFile: analysis.sourceFile,
      };
    });
  });
  const uniqueKeys = new Set(
    entries.map((entry) => `${entry.sourceFile}\0${entry.title}`),
  );
  assert.equal(
    uniqueKeys.size,
    entries.length,
    "catalog baseline must expose unique source-local locators",
  );
  assert.equal(
    entries.length,
    languageFixtures.reduce(
      (total, fixture) =>
        total + fixture.baselineOwners.length + Number(includeAddedOwners),
      0,
    ),
  );
  return [
    "symbols:",
    ...entries.flatMap((entry) => [
      `  - id: ${entry.id}`,
      `    title: ${yamlString(entry.title)}`,
      `    sourceFile: ${yamlString(entry.sourceFile)}`,
      ...(entry.granularityReason
        ? [`    granularity_reason: ${entry.granularityReason}`]
        : []),
      "    relationships:",
      "      - type: implements",
      "        target: REQ-multilingual-language-catalog",
    ]),
    "",
  ].join("\n");
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
  throw new Error("Packed catalog E2E runtime network access is disabled: " + name);
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
const NativeSocket = net.Socket;
const nativeSocketConnect = NativeSocket.prototype.connect;
NativeSocket.prototype.connect = function guardedSocketConnect(...args) {
  if (unixSocketPath(args[0])) return nativeSocketConnect.apply(this, args);
  throw new Error("Packed catalog E2E runtime network access is disabled: TCP socket");
};
const guardConnection = (original, name) => function guardedConnection(...args) {
  if (unixSocketPath(args[0])) return original.apply(this, args);
  throw new Error("Packed catalog E2E runtime network access is disabled: " + name);
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

function analysisCases(sandbox: TestSandbox): Record<string, unknown> {
  const cases: Record<string, unknown> = {};
  for (const [index, fixture] of languageFixtures.entries()) {
    cases[`baseline-${index}`] = {
      path: fixture.sourcePath,
      content: fixture.baseline,
    };
    cases[`added-${index}`] = {
      path: fixture.sourcePath,
      content: fixture.withUnowned,
    };
  }
  cases["header-ambiguous"] = {
    path: "include/shared.h",
    content: "struct Header { int value; };\n",
  };
  cases["header-c"] = {
    path: "include/shared.h",
    language: "c",
    content: "struct Header { int value; };\n",
  };
  cases["header-cpp"] = {
    path: "include/shared.h",
    language: "cpp",
    content: "struct Header { int value; };\n",
  };
  cases["prolog-ambiguous"] = { path: "logic/module.pl", content: "task.\n" };
  cases["prolog-hint"] = {
    path: "logic/module.pl",
    language: "prolog",
    content: "task.\n",
  };
  cases["perl-hint"] = {
    path: "logic/module.pl",
    language: "perl",
    content: "sub task { 1 }\n",
  };
  for (const [extension, language, content] of [
    ["sql", "sql", "select 1;\n"],
    ["html", "html", "<main>catalog</main>\n"],
    ["css", "css", "body { color: red; }\n"],
    ["json", "json", '{"catalog": true}\n'],
    ["yaml", "yaml", "catalog: true\n"],
  ] as const) {
    cases[`file-level-${language}`] = {
      path: `data/input.${extension}`,
      content,
    };
  }
  const sentinel = join(sandbox.baseDir, "must-not-execute.txt");
  cases["extensionless-python"] = {
    path: "scripts/catalog-python",
    content: `#!/usr/bin/env -S -u TRACE python3 -I\nfrom pathlib import Path\ndef python_task():\n    Path(${JSON.stringify(sentinel)}).write_text("executed")\n`,
  };
  cases["extensionless-bash"] = {
    path: "scripts/catalog-bash",
    content: `#!/usr/bin/env -S -u TRACE bash\nbash_task() { touch ${JSON.stringify(sentinel)}; }\n`,
  };
  cases["extensionless-ruby"] = {
    path: "scripts/catalog-ruby",
    content: `#!/usr/bin/env -S -i ruby\ndef ruby_task\n  File.write(${JSON.stringify(sentinel)}, "executed")\nend\n`,
  };
  cases["extensionless-node"] = {
    path: "scripts/catalog-node",
    content: `#!/usr/bin/env node\nimport { writeFileSync } from "node:fs";\nexport function nodeTask() { writeFileSync(${JSON.stringify(sentinel)}, "executed"); }\n`,
  };
  cases["overload-java-before"] = {
    path: "overloads/Engine.java",
    content: "package stable; class Engine { void run(int value) {} }\n",
  };
  cases["overload-java-after"] = {
    path: "overloads/Engine.java",
    content:
      "package stable; class Engine { void run(int value) {} void run(String value) {} }\n",
  };
  cases["overload-csharp-before"] = {
    path: "overloads/Engine.cs",
    content: "namespace Stable; class Engine { void Run() {} }\n",
  };
  cases["overload-csharp-after"] = {
    path: "overloads/Engine.cs",
    content:
      "namespace Stable; class Engine { void Run() {} void Run(int value) {} }\n",
  };
  cases["overload-cpp-before"] = {
    path: "overloads/engine.cpp",
    content: "int run(int value) { return value; }\n",
  };
  cases["overload-cpp-after"] = {
    path: "overloads/engine.cpp",
    content:
      "int run(int value) { return value; }\ndouble run(double value) { return value; }\n",
  };
  cases["hcl-structure"] = {
    path: "infra/structural.hcl",
    content: 'resource "api.edge" "worker.eu" { name = "worker" }\n',
  };
  cases["partial-cpp"] = {
    path: "src/damaged.cpp",
    content:
      "int clean(void) { return 1; }\nint damaged(void) {\n return ; broken syntax @;\n}\n",
  };
  cases["unicode-crlf-cpp"] = {
    path: "src/unicode.cpp",
    content: 'const char* marker = "😀"; int task() { return 1; }\r\n',
  };
  cases["input-limit"] = {
    path: "src/oversized.py",
    content: "x".repeat(8 * 1024 * 1024 + 1),
  };
  return cases;
}

function writeAnalysisRunner(sandbox: TestSandbox, casesPath: string): string {
  const runnerPath = join(sandbox.baseDir, "analyze-installed.mjs");
  writeFileSync(
    runnerPath,
    `import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const [repoDir, prefixDir, casesPath] = process.argv.slice(2);
if (globalThis.KIBI_E2E_NETWORK_GUARD !== "active") throw new Error("network guard was not loaded");
const repoRequire = createRequire(join(repoDir, "package.json"));
const prefixRequire = createRequire(join(prefixDir, "package.json"));
const sdk = await import(pathToFileURL(repoRequire.resolve("kibi-plugin-sdk")).href);
const parser = await import(pathToFileURL(repoRequire.resolve("kibi-plugin-treesitter")).href);
const cli = await import(pathToFileURL(prefixRequire.resolve("kibi-cli/plugins")).href);
const extractor = parser.createTreeSitterSymbolExtractor();
const registry = new cli.CapabilityRegistry({ workspaceRoot: repoDir });
const service = cli.createSourceAnalysisService({ registry, analysisTimeoutMs: 30000 });
const inputs = JSON.parse(readFileSync(casesPath, "utf8"));
const results = {};
for (const [key, input] of Object.entries(inputs)) {
  const hostResult = await service.analyzeTextV2(input.path, input.content, input.language);
  const validated = sdk.validateSourceAnalysisResultV2(hostResult, input);
  if (validated.sourceFile !== input.path) throw new Error("SDK validation changed the source identity");
  if (key === "input-limit") {
    results[key] = hostResult;
    continue;
  }
  if (input.path.endsWith(".tf") || input.path.endsWith(".hcl") || input.path.endsWith(".java") || input.path.endsWith(".cs") || input.path.endsWith(".php") || input.path.endsWith(".c") || input.path.endsWith(".cpp") || input.path.endsWith(".h") || input.path.endsWith(".sh") || input.path.endsWith(".rb") || input.path.endsWith(".bash")) {
    if (extractor.supports({ path: input.path, ...(input.language ? { language: input.language } : {}) })) {
      const parserResult = await extractor.analyze(input);
      sdk.validateSourceAnalysisResultV2(parserResult, input);
    }
  }
  results[key] = hostResult;
}
process.stdout.write(JSON.stringify(results));
`,
    "utf8",
  );
  return runnerPath;
}

async function runInstalledAnalysis(
  sandbox: TestSandbox,
  cases: Record<string, unknown>,
): Promise<Record<string, Analysis>> {
  const casesPath = join(sandbox.baseDir, "analysis-cases.json");
  writeFileSync(casesPath, `${JSON.stringify(cases)}\n`, "utf8");
  const runnerPath = writeAnalysisRunner(sandbox, casesPath);
  const result = await run(
    "node",
    [runnerPath, sandbox.repoDir, sandbox.npmPrefix, casesPath],
    { cwd: sandbox.repoDir, env: sandbox.env, timeoutMs: 240_000 },
  );
  assertCommandExit(result, 0, "installed provider and CLI analysis runner");
  return JSON.parse(result.stdout) as Record<string, Analysis>;
}

function symbolsWithName(
  analysis: Analysis,
  name: string,
): readonly SourceSymbol[] {
  return analysis.symbols.filter((symbol) => symbol.name === name);
}

function assertProvider(analysis: Analysis, language: string): void {
  assert.equal(
    analysis.status,
    "ok",
    `${analysis.sourceFile} expected ${language} provider success; got ${JSON.stringify({ status: analysis.status, language: analysis.language, providerId: analysis.providerId, diagnostics: analysis.diagnostics })}`,
  );
  assert.equal(analysis.language, language);
  assert.ok(
    analysis.providerId,
    `no installed provider claimed ${analysis.sourceFile}`,
  );
  assert.equal(analysis.diagnostics.length, 0);
}

function assertNoExecution(sandbox: TestSandbox): void {
  assert.equal(
    existsSync(join(sandbox.baseDir, "must-not-execute.txt")),
    false,
    "source text was analyzed as data and must not be executed",
  );
}

function sourceHash(source: string): string {
  return createHash("sha256").update(source, "utf8").digest("hex");
}

async function runCatalogWorkflow(tarballs: Tarballs): Promise<void> {
  const sandbox = createSandbox();
  try {
    await sandbox.install(tarballs);
    await sandbox.initGitRepo();
    assertCommandExit(
      await run("git", ["commit", "--allow-empty", "-m", "initial"], {
        cwd: sandbox.repoDir,
        env: sandbox.env,
        timeoutMs: HOOK_TIMEOUT_MS,
      }),
      0,
      "initial hook-free commit before Kibi initialization",
    );

    const packageConfig = {
      name: "packed-multilingual-language-catalog",
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
    const localParserInstall = await run(
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
        timeoutMs: SETUP_TIMEOUT_MS,
      },
    );
    assertCommandExit(
      localParserInstall,
      0,
      "consumer-local SDK/parser install",
    );
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
    assertCommandExit(guardProbe, 0, "offline runtime guard probe");
    assert.equal(guardProbe.stdout, "active");

    const cases = analysisCases(sandbox);
    const analyses = await runInstalledAnalysis(sandbox, cases);
    const baselineAnalyses: Analysis[] = [];
    for (const [index, fixture] of languageFixtures.entries()) {
      const baseline = analyses[`baseline-${index}`];
      const modified = analyses[`added-${index}`];
      assert.ok(
        baseline && modified,
        `analysis missing for ${fixture.language}`,
      );
      assertProvider(baseline, fixture.language);
      assertProvider(modified, fixture.language);
      assert.ok(
        baseline.symbols.length > 0,
        `${fixture.language} emitted no baseline symbols`,
      );
      assert.ok(
        baseline.symbols.some(
          (symbol) =>
            symbol.name.toLowerCase() ===
            (fixture.baselineName ?? "baseline").toLowerCase(),
        ),
        `${fixture.language} baseline declaration was not captured`,
      );
      const added = symbolsWithName(modified, fixture.addedName);
      assert.equal(
        added.length,
        1,
        `${fixture.language} added declaration locator was not unique`,
      );
      assert.equal(
        added[0]?.qualifiedName ?? added[0]?.name,
        fixture.expectedAddedLocator,
        `${fixture.language} qualified locator changed unexpectedly`,
      );
      const beforeLocators = new Set(
        baseline.symbols.map((symbol) => symbol.qualifiedName ?? symbol.name),
      );
      const newLocators = modified.symbols.filter(
        (symbol) => !beforeLocators.has(symbol.qualifiedName ?? symbol.name),
      );
      assert.equal(
        newLocators.length,
        1,
        `${fixture.language} expected one new declaration`,
      );
      baselineAnalyses.push(baseline);
    }

    const headerAmbiguous = analyses["header-ambiguous"];
    const headerC = analyses["header-c"];
    const headerCpp = analyses["header-cpp"];
    assert.equal(headerAmbiguous?.status, "unsupported");
    assert.equal(headerAmbiguous?.language, "c-or-cpp");
    assert.equal(
      headerAmbiguous?.diagnostics[0]?.code,
      "source_language_ambiguous",
    );
    assertProvider(headerC as Analysis, "c");
    assertProvider(headerCpp as Analysis, "cpp");
    for (const [key, language] of [
      ["prolog-hint", "prolog"],
      ["perl-hint", "perl"],
    ] as const) {
      const result = analyses[key];
      assert.equal(result?.language, language);
      assert.equal(result?.status, "unsupported");
      assert.equal(result?.providerId, null);
    }
    assert.equal(analyses["prolog-ambiguous"]?.status, "unsupported");
    assert.equal(analyses["prolog-ambiguous"]?.language, "perl-or-prolog");
    assert.equal(
      analyses["prolog-ambiguous"]?.diagnostics[0]?.code,
      "source_language_ambiguous",
    );
    for (const language of ["sql", "html", "css", "json", "yaml"]) {
      const result = analyses[`file-level-${language}`];
      assert.equal(
        result?.status,
        "unsupported",
        `${language} remains file-level`,
      );
      assert.equal(result?.language, language);
      assert.equal(result?.providerId, null);
      assert.equal(result?.diagnostics[0]?.code, "source_file_level_only");
    }

    const extensionless = [
      ["extensionless-python", "python", "python_task"],
      ["extensionless-bash", "bash", "bash_task"],
      ["extensionless-ruby", "ruby", "ruby_task"],
      ["extensionless-node", "javascript", "nodeTask"],
    ] as const;
    for (const [key, language, name] of extensionless) {
      const result = analyses[key];
      assertProvider(result as Analysis, language);
      assert.equal(symbolsWithName(result as Analysis, name).length, 1);
    }

    for (const [language, locator] of [
      ["java", "stable.Engine.run(int)"],
      ["csharp", "Stable.Engine.Run()"],
      ["cpp", "run(int)"],
    ] as const) {
      const before = analyses[`overload-${language}-before`];
      const after = analyses[`overload-${language}-after`];
      assert.equal(before?.status, "ok");
      assert.equal(after?.status, "ok");
      assert.ok(
        before?.symbols.some((symbol) => symbol.qualifiedName === locator),
      );
      assert.ok(
        after?.symbols.some((symbol) => symbol.qualifiedName === locator),
      );
    }

    const hcl = analyses["hcl-structure"];
    assert.equal(hcl?.status, "ok");
    const hclResource = hcl?.symbols.find(
      (symbol) =>
        symbol.qualifiedName === 'hcl:["resource","api.edge","worker.eu"]',
    );
    assert.equal(hclResource?.kind, "unknown");
    assert.equal(hclResource?.nativeKind, "hcl:block:resource");
    assert.ok(!hcl?.symbols.some((symbol) => symbol.kind === "function"));

    const malformed = analyses["partial-cpp"];
    assert.equal(malformed?.status, "partial");
    assert.ok(
      malformed?.diagnostics.some((item) => item.code.includes("SYNTAX")),
    );
    assert.ok(malformed?.uncoveredRanges.length);
    assert.ok(malformed?.symbols.some((symbol) => symbol.name === "clean"));
    assert.ok(!malformed?.symbols.some((symbol) => symbol.name === "damaged"));

    const unicode = analyses["unicode-crlf-cpp"];
    assert.equal(unicode?.status, "ok");
    const unicodeTask = symbolsWithName(unicode as Analysis, "task")[0];
    assert.ok(unicodeTask?.nameRange, "qualified provider omitted nameRange");
    const unicodeContent = (cases["unicode-crlf-cpp"] as { content: string })
      .content;
    const expectedColumn = unicodeContent.slice(
      0,
      unicodeContent.indexOf("task"),
    ).length;
    assert.deepEqual(unicodeTask.nameRange, {
      startLine: 1,
      startColumn: expectedColumn,
      endLine: 1,
      endColumn: expectedColumn + "task".length,
    });
    assertNoExecution(sandbox);

    const tooLarge = analyses["input-limit"];
    assert.equal(tooLarge?.status, "failed");
    assert.equal(tooLarge?.diagnostics[0]?.code, "input_limit");
    assert.equal(tooLarge?.symbols.length, 0);

    assertCommandExit(
      await kibi(sandbox, ["init"], { timeoutMs: SETUP_TIMEOUT_MS }),
      0,
      "Kibi init and real hook installation",
    );
    createMarkdownFile(
      sandbox,
      ".kb/requirements/REQ-multilingual-language-catalog.md",
      {
        id: "REQ-multilingual-language-catalog",
        title: "Qualified multilingual source declarations remain traceable",
        status: "active",
        created_at: "2026-09-26T00:00:00Z",
        updated_at: "2026-09-26T00:00:00Z",
        source: ".kb/requirements/REQ-multilingual-language-catalog.md",
      },
      "The approved offline source catalog records qualified declarations for Java, C#, PHP, C, C++, Bash, Ruby, Terraform, and HCL. Ambiguity, unsupported file-level documents, parser damage, and structural HCL remain explicit; no source program is executed.",
    );
    for (const fixture of languageFixtures) {
      const fullPath = join(sandbox.repoDir, fixture.sourcePath);
      mkdirSync(join(fullPath, ".."), { recursive: true });
      writeFileSync(fullPath, fixture.baseline, "utf8");
    }
    writeFileSync(
      join(sandbox.repoDir, ".kb/symbols.yaml"),
      manifestFor(baselineAnalyses),
      "utf8",
    );
    stageSourceFile(sandbox, "package.json");
    for (const fixture of languageFixtures)
      stageSourceFile(sandbox, fixture.sourcePath);
    stageSourceFile(sandbox, ".kb/symbols.yaml");

    assertCommandExit(
      await kibi(sandbox, ["sync", "--refresh-symbol-coordinates"], {
        timeoutMs: COMMAND_TIMEOUT_MS,
      }),
      0,
      "baseline coordinate refresh",
    );
    stageSourceFile(sandbox, ".kb/symbols.yaml");
    stageSourceFile(sandbox, ".kb/symbol-coordinates.yaml");
    const baselineCheck = await kibi(
      sandbox,
      ["check", "--staged", "--format", "json"],
      { timeoutMs: COMMAND_TIMEOUT_MS },
    );
    assertCommandExit(baselineCheck, 0, "owned catalog baseline staged check");
    assert.equal(symbolsFrom(parseStaged(baselineCheck)).length, 0);
    assertCommandExit(
      await kibi(sandbox, ["check-generated", "--staged"], {
        timeoutMs: COMMAND_TIMEOUT_MS,
      }),
      0,
      "owned catalog baseline generated-manifest check",
    );
    assertCommandExit(
      await run(
        "git",
        ["commit", "-m", "owned multilingual catalog baseline"],
        {
          cwd: sandbox.repoDir,
          env: sandbox.env,
          timeoutMs: HOOK_TIMEOUT_MS,
        },
      ),
      0,
      "hook-validated catalog baseline commit",
    );

    for (const fixture of languageFixtures) {
      writeFileSync(
        join(sandbox.repoDir, fixture.sourcePath),
        fixture.withUnowned,
        "utf8",
      );
      stageSourceFile(sandbox, fixture.sourcePath);
    }
    const unownedBytes = languageFixtures.map((fixture) =>
      sourceHash(fixture.withUnowned),
    );
    assertCommandExit(
      await kibi(sandbox, ["sync", "--refresh-symbol-coordinates"], {
        timeoutMs: COMMAND_TIMEOUT_MS,
      }),
      0,
      "unowned declaration coordinate refresh",
    );
    stageSourceFile(sandbox, ".kb/symbols.yaml");
    stageSourceFile(sandbox, ".kb/symbol-coordinates.yaml");
    assertCommandExit(
      await kibi(sandbox, ["check-generated", "--staged"], {
        timeoutMs: COMMAND_TIMEOUT_MS,
      }),
      0,
      "unowned negative case has current generated manifests",
    );
    const unownedCheck = await kibi(
      sandbox,
      ["check", "--staged", "--format", "json"],
      { timeoutMs: COMMAND_TIMEOUT_MS },
    );
    assertCommandExit(unownedCheck, 1, "unowned catalog declarations");
    const negativeEnvelope = parseStaged(unownedCheck);
    const negativeViolations = symbolsFrom(negativeEnvelope);
    assert.equal(
      negativeViolations.length,
      languageFixtures.length,
      `only the nine deliberately unowned declarations should block:\n${outputOf(unownedCheck)}`,
    );
    for (const fixture of languageFixtures) {
      const matches = negativeViolations.filter(
        (violation) =>
          violation.file === fixture.sourcePath &&
          violation.name === fixture.expectedAddedLocator,
      );
      assert.equal(
        matches.length,
        1,
        `missing exact ownership violation for ${fixture.language}`,
      );
      assert.equal(matches[0]?.currentLinks, 0);
      assert.equal(matches[0]?.requiredLinks, 1);
    }
    const negativeFingerprints = new Map(
      languageFixtures.map((fixture) => [
        fixture.sourcePath,
        sourceFingerprint(negativeEnvelope, fixture.sourcePath),
      ]),
    );

    const rejectedCommit = await run(
      "git",
      ["commit", "-m", "reject unowned catalog declarations"],
      {
        cwd: sandbox.repoDir,
        env: sandbox.env,
        timeoutMs: HOOK_TIMEOUT_MS,
      },
    );
    assert.equal(
      rejectedCommit.exitCode,
      1,
      `normal pre-commit hook must reject the same ownership gap:\n${outputOf(rejectedCommit)}`,
    );
    for (const fixture of languageFixtures) {
      assert.ok(
        outputOf(rejectedCommit).includes(fixture.expectedAddedLocator),
        `normal hook did not name ${fixture.expectedAddedLocator}:\n${outputOf(rejectedCommit)}`,
      );
    }

    const modifiedAnalyses = languageFixtures.map((_, index) => {
      const result = analyses[`added-${index}`];
      assert.ok(result);
      return result;
    });
    const repairedManifest = manifestFor(modifiedAnalyses, true);
    writeFileSync(
      join(sandbox.repoDir, ".kb/symbols.yaml"),
      repairedManifest,
      "utf8",
    );
    stageSourceFile(sandbox, ".kb/symbols.yaml");
    assertCommandExit(
      await kibi(sandbox, ["sync", "--refresh-symbol-coordinates"], {
        timeoutMs: COMMAND_TIMEOUT_MS,
      }),
      0,
      "ownership repair coordinate refresh",
    );
    stageSourceFile(sandbox, ".kb/symbols.yaml");
    stageSourceFile(sandbox, ".kb/symbol-coordinates.yaml");
    for (const [index, fixture] of languageFixtures.entries()) {
      assert.equal(
        createHash("sha256")
          .update(readFileSync(join(sandbox.repoDir, fixture.sourcePath)))
          .digest("hex"),
        unownedBytes[index],
        `${fixture.language} source bytes changed during ownership repair`,
      );
    }
    const repairedCheck = await kibi(
      sandbox,
      ["check", "--staged", "--format", "json"],
      { timeoutMs: COMMAND_TIMEOUT_MS },
    );
    assertCommandExit(repairedCheck, 0, "repaired catalog staged check");
    const repairedEnvelope = parseStaged(repairedCheck);
    assert.equal(symbolsFrom(repairedEnvelope).length, 0);
    for (const fixture of languageFixtures) {
      assert.equal(
        sourceFingerprint(repairedEnvelope, fixture.sourcePath),
        negativeFingerprints.get(fixture.sourcePath),
        `${fixture.language} fingerprint must remain fixed when ownership alone changes`,
      );
    }
    assertCommandExit(
      await kibi(sandbox, ["check-generated", "--staged"], {
        timeoutMs: COMMAND_TIMEOUT_MS,
      }),
      0,
      "repaired catalog generated-manifest check",
    );
    assertCommandExit(
      await run(
        "git",
        ["commit", "-m", "own multilingual catalog declarations"],
        {
          cwd: sandbox.repoDir,
          env: sandbox.env,
          timeoutMs: HOOK_TIMEOUT_MS,
        },
      ),
      0,
      "hook-validated catalog ownership repair commit",
    );
  } finally {
    await sandbox.cleanup();
  }
}

// executable_for TEST-multilingual-language-catalog
export async function runMultilingualLanguageCatalogWorkflow(
  tarballs: Tarballs,
): Promise<void> {
  await runCatalogWorkflow(tarballs);
}

if (RUN_NODE_TEST_SUITE) {
  describe("Packed multilingual language catalog and exact-index ownership", () => {
    let tarballs: Tarballs;

    before(
      async () => {
        assert.ok(
          checkPrologAvailable(),
          "SWI-Prolog is required for exact staged and real hook checks",
        );
        tarballs = await packAll();
      },
      { timeout: 180_000 },
    );

    it(
      "runs offline qualified catalog, ambiguity, and exact-index ownership behavior from installed tarballs",
      { timeout: 720_000 },
      async () => runMultilingualLanguageCatalogWorkflow(tarballs),
    );
  });
}
