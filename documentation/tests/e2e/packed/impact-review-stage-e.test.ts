import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { before, describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createSandbox,
  kibi,
  packAll,
  run,
} from "./helpers.js";
import {
  sendMcpRequest,
  startMcpServer,
} from "./mcp-cli-operation-parity-support.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";
const REPOSITORY_ROOT = resolve(
  process.env.KIBI_PROOF_REPO_ROOT?.trim() || process.cwd(),
);
const COMMAND_TIMEOUT_MS = 120_000;
const REQUIREMENT_IDS = [
  "REQ-IMPACT-FIRST",
  "REQ-IMPACT-SECOND",
  "REQ-IMPACT-ADDED",
] as const;
const SOURCE_PATH = "src/service.ts";
const SOURCE_BEFORE = [
  'export function first(): string { return "approved"; }',
  "export function second(): number { return 2; }",
  "",
].join("\n");
const SOURCE_AFTER = [
  'export function first(): string { return "revised"; }',
  "export function second(): number { return 2; }",
  "export function newBehavior(): boolean { return true; }",
  "",
].join("\n");
const TEST_ID = "TEST-IMPACT-RECEIPT-CYCLE";
const TEST_SYMBOL_ID = "SYM-IMPACT-FIRST";
const TEST_INTEGRATION_ID = "impact-fixture-command";
const DECORATOR_REQUIREMENT_ID = "REQ-IMPACT-PYTHON-DECORATOR";
const DECORATOR_SYMBOL_ID = "SYM-IMPACT-PYTHON-DECORATOR";
const DECORATOR_SOURCE_PATH = "src/decorated.py";
const DECORATOR_BASELINE_SOURCE = 'def decorated():\n    return "decorated"\n';
const DECORATOR_STAGED_SOURCE =
  '@identity\ndef decorated():\n    return "decorated"\n';
const DECORATOR_PARTIAL_DIAGNOSTIC =
  "TREESITTER_DECORATOR_EXPANSION_UNAVAILABLE";
const DECORATOR_LIMITATION_CLASS = "python-decorator-expansion";

type CommandResult = Readonly<{
  stdout: string;
  stderr: string;
  exitCode: number;
}>;

type KibiEnvelope = Readonly<{
  status?: unknown;
  data?: unknown;
  structuredContent?: unknown;
  proofSnapshot?: unknown;
}>;

type AnalysisResult = Readonly<{
  status: "ok" | "partial" | "unsupported" | "failed";
  providerId: string | null;
  providerFingerprint: string | null;
  diagnostics?: readonly Readonly<{ code: string }>[];
  diagnosticCodes: readonly string[];
  uncoveredRanges: readonly unknown[];
}>;
type SourceChange = Readonly<{
  before: AnalysisResult | null;
  after: AnalysisResult | null;
}>;
type Snapshot = Readonly<{
  baseTree: string;
  inventory: readonly unknown[];
}>;
type PreparedFile = Readonly<{
  path: string;
  before: Readonly<{ analysis?: AnalysisResult }> | null;
  after: Readonly<{ analysis?: AnalysisResult }> | null;
}>;
type PreparedImpactReview = Readonly<{
  policy: Readonly<{
    allowedPartial: readonly Readonly<{
      providerId: string;
      providerFingerprint: string;
      diagnosticCode: string;
      limitationClass: string;
    }>[];
  }>;
  files: readonly PreparedFile[];
  scopedRequirementIdsByPath: ReadonlyMap<string, readonly string[]>;
  baseEntities: ReadonlyMap<
    string,
    Readonly<{ fingerprint: string; artifactPath: string }>
  >;
  headEntities: ReadonlyMap<
    string,
    Readonly<{ fingerprint: string; artifactPath: string }>
  >;
}>;
type AnalysisReview =
  | Readonly<{
      kind: "unsupported_review";
      side: "before" | "after";
      wholeFile: true;
      rationale: string;
    }>
  | Readonly<{
      kind: "partial_review";
      side: "before" | "after";
      limitationClass: string;
      ranges: readonly unknown[];
      rationale: string;
    }>;
type ImpactDecision =
  | Readonly<{
      kind: "impact";
      requirementIds: readonly string[];
      knowledge:
        | Readonly<{ state: "still_current"; rationale: string }>
        | Readonly<{
            state: "updated";
            entities: readonly Readonly<{
              entityId: string;
              artifactPath: string;
              beforeFingerprint: string | null;
              afterFingerprint: string;
            }>[];
            stillCurrent?: readonly Readonly<{
              requirementId: string;
              rationale: string;
            }>[];
          }>;
    }>
  | Readonly<{
      kind: "no_impact";
      reason: string;
      rationale: string;
    }>
  | Readonly<{
      kind: "not_applicable";
      policyReason: string;
      rationale: string;
    }>;
type ReviewDecisionEntry = Readonly<{
  decision: ImpactDecision;
  analysisReviews?: readonly AnalysisReview[];
}>;
type ImpactReviewRecord = Readonly<{
  files: readonly Readonly<{
    path: string;
    analysisReviews: readonly AnalysisReview[];
    decision: ImpactDecision;
  }>[];
  scope: Readonly<{ providerSetFingerprint: string }>;
}>;
type ImpactEvaluation = Readonly<{
  passed: boolean;
  scopeFingerprint?: string;
}>;
type EvaluationOptions = Readonly<{
  providerSetFingerprint: string;
  evaluatorFingerprint: string;
  analyses: ReadonlyMap<string, SourceChange>;
}>;
type SourceAnalysisService = Readonly<{
  analyzeTextV2: (path: string, content: string) => Promise<AnalysisResult>;
}>;
type SnapshotApi = Readonly<{
  captureStagedSnapshot: (repoDir: string) => Snapshot;
}>;
type EvaluatorApi = Readonly<{
  createImpactReviewRecord: (
    prepared: PreparedImpactReview,
    decisions: ReadonlyMap<string, ReviewDecisionEntry>,
    reviewerId: string,
  ) => ImpactReviewRecord;
  evaluateImpactReview: (
    snapshot: Snapshot,
    options: EvaluationOptions,
  ) => ImpactEvaluation;
  fingerprintImpactEvaluator: () => string;
}>;
type SourceAnalysisApi = Readonly<{
  analyzeSourceChanges: (
    inventory: readonly unknown[],
    service: unknown,
  ) => Promise<Map<string, SourceChange>>;
}>;
type MaintenanceApi = Readonly<{
  createMaintenanceSourceAnalysisService: (
    repoDir: string,
    config: unknown,
  ) => SourceAnalysisService;
  fingerprintMaintenanceSourceSet: (repoDir: string, config: unknown) => string;
  readSnapshotSourceConfig: (snapshot: Snapshot, baseTree: string) => unknown;
}>;
type SemanticApi = Readonly<{
  analyzeSemanticAdvisorInput: (input: {
    payload: Record<string, unknown>;
  }) => Readonly<{
    receipt: Readonly<{
      inventory_contract: Readonly<{
        source_field: string;
        source_hash: string;
        version: string;
      }>;
      propositions: readonly Readonly<{
        claim_key: string;
        claim_text: string;
        role: string;
        status: string;
        span: unknown;
        reason?: string;
      }>[];
    }>;
  }>;
}>;

type InstalledImpactApi = Readonly<{
  snapshot: SnapshotApi;
  evaluator: EvaluatorApi;
  sourceAnalysis: SourceAnalysisApi;
  maintenance: MaintenanceApi;
  semantic: SemanticApi;
}>;

function outputOf(result: CommandResult): string {
  return `${result.stdout}\n${result.stderr}`;
}

function assertExit(
  result: CommandResult,
  expected: number,
  label: string,
): void {
  assert.equal(
    result.exitCode,
    expected,
    `${label} exited ${result.exitCode}; expected ${expected}.\n${outputOf(result)}`,
  );
}

function parseJson(result: CommandResult, label: string): KibiEnvelope {
  try {
    const parsed: unknown = JSON.parse(result.stdout);
    if (!isRecord(parsed)) {
      throw new Error("JSON root must be an object");
    }
    return {
      status: parsed.status,
      data: parsed.data,
      structuredContent: parsed.structuredContent,
      proofSnapshot: parsed.proofSnapshot,
    };
  } catch (error) {
    throw new Error(
      `${label} did not return JSON: ${String(error)}\n${outputOf(result)}`,
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  return value;
}

function requireString(
  record: Record<string, unknown>,
  key: string,
  label: string,
): string {
  const value = record[key];
  if (typeof value !== "string") {
    throw new Error(`${label}.${key} must be a string`);
  }
  return value;
}

function parseJsonObject(text: string, label: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} did not return JSON: ${String(error)}`);
  }
  return requireRecord(parsed, `${label} JSON root`);
}

function objectArray(value: unknown, label: string): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value.map((entry, index) =>
    requireRecord(entry, `${label}[${index}]`),
  );
}

function jsonStringify(value: unknown, label: string): string {
  const serialized = JSON.stringify(value);
  if (typeof serialized !== "string") {
    throw new Error(`${label} could not be serialized as JSON`);
  }
  return serialized;
}

function assertModuleFunctions<T extends object>(
  candidate: unknown,
  label: string,
  names: readonly (keyof T & string)[],
): asserts candidate is T {
  const module = requireRecord(candidate, `Installed ${label} module`);
  for (const name of names) {
    if (typeof module[name] !== "function") {
      throw new Error(`Installed ${label} module omitted function ${name}`);
    }
  }
}

let requestCounter = 0;
async function kibiInput(
  sandbox: TestSandbox,
  operation: string,
  payload: unknown,
): Promise<CommandResult> {
  const requestPath = join(
    sandbox.baseDir,
    `kibi-request-${requestCounter++}.json`,
  );
  writeFileSync(requestPath, `${JSON.stringify(payload)}\n`, "utf8");
  try {
    return await kibi(sandbox, [operation, "--input", requestPath], {
      timeoutMs: COMMAND_TIMEOUT_MS,
    });
  } finally {
    unlinkSync(requestPath);
  }
}

async function upsert(
  sandbox: TestSandbox,
  payload: Record<string, unknown>,
): Promise<void> {
  const validation = await kibiInput(sandbox, "validate-upsert", payload);
  assertExit(validation, 0, `validate ${String(payload.id)}`);
  const preflight = parseJson(validation, `validate ${String(payload.id)}`);
  assert.equal(preflight.status, "success", outputOf(validation));
  const preflightData = requireRecord(
    preflight.data,
    `validate ${String(payload.id)} data`,
  );
  assert.equal(preflightData.valid, true, outputOf(validation));

  const mutation = await kibiInput(sandbox, "upsert", payload);
  assertExit(mutation, 0, `upsert ${String(payload.id)}`);
  const result = parseJson(mutation, `upsert ${String(payload.id)}`);
  assert.equal(result.status, "success", outputOf(mutation));
}

function sourceHash(sandbox: TestSandbox): string {
  return createHash("sha256")
    .update(readFileSync(join(sandbox.repoDir, SOURCE_PATH)))
    .digest("hex");
}

function createRuntimeNetworkGuard(sandbox: TestSandbox): void {
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
const NativeSocket = net.Socket;
const nativeSocketConnect = NativeSocket.prototype.connect;
NativeSocket.prototype.connect = function guardedSocketConnect(...args) {
  if (unixSocketPath(args[0])) return nativeSocketConnect.apply(this, args);
  throw new Error("Packed E2E runtime network access is disabled: TCP socket");
};
const guardConnection = (original, name) => function guardedConnection(...args) {
  if (unixSocketPath(args[0])) return original.apply(this, args);
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
}

async function installedModule(
  sandbox: TestSandbox,
  relativePath: string,
): Promise<unknown> {
  const modulePath = join(
    sandbox.npmPrefix,
    "node_modules",
    "kibi-cli",
    "dist",
    relativePath,
  );
  const imported: unknown = await import(pathToFileURL(modulePath).href);
  return imported;
}

async function loadImpactApi(
  sandbox: TestSandbox,
): Promise<InstalledImpactApi> {
  // Dynamic imports deliberately bind the test to installed tarball modules,
  // rather than workspace declarations or build output.
  const [snapshot, evaluator, sourceAnalysis, maintenance, semantic] =
    await Promise.all([
      installedModule(sandbox, "traceability/git-change-snapshot.js"),
      installedModule(sandbox, "traceability/impact-evaluator.js"),
      installedModule(sandbox, "plugins/source-change-analysis.js"),
      installedModule(sandbox, "plugins/maintenance-source-analysis.js"),
      installedModule(sandbox, "operations/semantic-advisor/analyze-prose.js"),
    ]);

  assertModuleFunctions<InstalledImpactApi["snapshot"]>(snapshot, "snapshot", [
    "captureStagedSnapshot",
  ]);
  assertModuleFunctions<InstalledImpactApi["evaluator"]>(
    evaluator,
    "impact evaluator",
    [
      "createImpactReviewRecord",
      "evaluateImpactReview",
      "fingerprintImpactEvaluator",
    ],
  );
  assertModuleFunctions<InstalledImpactApi["sourceAnalysis"]>(
    sourceAnalysis,
    "source analysis",
    ["analyzeSourceChanges"],
  );
  assertModuleFunctions<InstalledImpactApi["maintenance"]>(
    maintenance,
    "maintenance source analysis",
    [
      "createMaintenanceSourceAnalysisService",
      "fingerprintMaintenanceSourceSet",
      "readSnapshotSourceConfig",
    ],
  );
  assertModuleFunctions<InstalledImpactApi["semantic"]>(
    semantic,
    "semantic advisor",
    ["analyzeSemanticAdvisorInput"],
  );

  return { snapshot, evaluator, sourceAnalysis, maintenance, semantic };
}

function assertInstalledTarballProvenance(
  sandbox: TestSandbox,
  tarballs: Tarballs,
): void {
  const installManifest = parseJsonObject(
    readFileSync(join(sandbox.npmPrefix, "package.json"), "utf8"),
    "packed install manifest",
  );
  const dependencies = requireRecord(
    installManifest.dependencies,
    "packed install dependencies",
  );
  const inputs = {
    "kibi-core": tarballs.core,
    "kibi-cli": tarballs.cli,
    "kibi-runtime": tarballs.runtime,
    "kibi-mcp": tarballs.mcp,
    "kibi-opencode": tarballs.opencode,
    "kibi-codex": tarballs.codex,
    "kibi-cursor": tarballs.cursor,
    "kibi-plugin-sdk": tarballs["plugin-sdk"],
    "kibi-plugin-builtin": tarballs["plugin-builtin"],
  };
  const evidence = Object.entries(inputs).map(([packageName, tarballPath]) => {
    assert.equal(
      dependencies[packageName],
      `file:${tarballPath}`,
      `${packageName} install manifest must point at this run's candidate tarball`,
    );
    const installedManifest = parseJsonObject(
      readFileSync(
        join(sandbox.npmPrefix, "node_modules", packageName, "package.json"),
        "utf8",
      ),
      `${packageName} installed package manifest`,
    );
    const digest = createHash("sha256")
      .update(readFileSync(tarballPath))
      .digest("hex");
    assert.equal(
      requireString(installedManifest, "name", packageName),
      packageName,
    );
    const version = requireString(installedManifest, "version", packageName);
    return {
      package: packageName,
      version,
      tarball: tarballPath,
      sha256: digest,
    };
  });
  process.stdout.write(
    `STAGE_E_PACKED_INSTALL_PROVENANCE ${JSON.stringify(evidence)}\n`,
  );
}

async function prepareReview(
  sandbox: TestSandbox,
  options: Readonly<{ verifyMcpParity?: boolean }> = {},
): Promise<
  Readonly<{
    record: ImpactReviewRecord;
    prepared: PreparedImpactReview;
  }>
> {
  const input = { scope: { kind: "staged" } };
  const preparationResult = await kibiInput(
    sandbox,
    "prepare-impact-review",
    input,
  );
  assertExit(
    preparationResult,
    0,
    "prepare staged impact review through the public CLI",
  );
  const preparationEnvelope = parseJson(
    preparationResult,
    "public staged impact review preparation",
  );
  const preparation = requireRecord(
    preparationEnvelope.data,
    "public preparation data",
  );
  if (options.verifyMcpParity) {
    await assertInstalledMcpPreparationParity(
      sandbox,
      input,
      preparationEnvelope.data,
    );
  }
  assert.equal(
    preparation.preparationVersion,
    "kibi.impact-review-preparation.v1",
  );
  const authorship = requireRecord(
    preparation.authorship,
    "preparation authorship",
  );
  const templateEnvelope = requireRecord(
    authorship.recordTemplate,
    "preparation record template",
  );
  assert.equal(templateEnvelope.isValidImpactReviewRecord, false);
  const recordTemplate = requireRecord(
    templateEnvelope.record,
    "preparation record template body",
  );
  const scopes = objectArray(
    preparation.requirementScopes,
    "requirementScopes",
  );
  const scopesByPath = new Map(
    scopes.map((scope) => [
      requireString(scope, "path", "requirement scope"),
      Array.isArray(scope.requirementIds)
        ? (scope.requirementIds as string[])
        : [],
    ]),
  );
  const rowsFor = (side: "before" | "after") =>
    new Map(
      scopes.flatMap((scope) => {
        const rows = objectArray(scope[side], `${side} requirement context`);
        return rows.flatMap((row) => {
          if (
            row.state !== "present" ||
            typeof row.id !== "string" ||
            typeof row.entityFingerprint !== "string" ||
            typeof row.artifactPath !== "string"
          )
            return [];
          return [
            [
              row.id,
              {
                fingerprint: row.entityFingerprint,
                artifactPath: row.artifactPath,
              },
            ] as const,
          ];
        });
      }),
    );
  const fileEvidence = objectArray(preparation.files, "prepared file evidence");
  const publicObligations = objectArray(
    preparation.residualReviewObligations,
    "residualReviewObligations",
  );
  const prepared: PreparedImpactReview = {
    policy: {
      allowedPartial: publicObligations.flatMap((obligation) => {
        if (obligation.kind !== "partial_review") return [];
        const evidence = fileEvidence.find(
          (file) => file.path === obligation.path,
        );
        const side = obligation.side === "before" ? "before" : "after";
        const analysis = isRecord(evidence?.[side])
          ? evidence[side].analysis
          : undefined;
        if (!isRecord(analysis) || !Array.isArray(analysis.diagnosticCodes))
          return [];
        return analysis.diagnosticCodes.map((diagnosticCode) => ({
          providerId: String(analysis.providerId),
          providerFingerprint: String(analysis.providerFingerprint),
          diagnosticCode: String(diagnosticCode),
          limitationClass: String(obligation.limitationClass),
        }));
      }),
    },
    files: fileEvidence as unknown as PreparedImpactReview["files"],
    scopedRequirementIdsByPath: scopesByPath,
    baseEntities: rowsFor("before"),
    headEntities: rowsFor("after"),
  };
  const changedRequirementIds = new Set<string>(REQUIREMENT_IDS);
  const decisions = new Map<string, ReviewDecisionEntry>();
  const obligations = publicObligations;
  for (const file of prepared.files) {
    const scoped = prepared.scopedRequirementIdsByPath.get(file.path) ?? [];
    let decision: ImpactDecision;
    if (scoped.length === 0) {
      decision = {
        kind: "no_impact",
        reason: "supporting-evidence",
        rationale:
          "This captured path contains supporting fixture metadata and has no scoped requirement.",
      };
    } else {
      const entities = scoped.flatMap((entityId) => {
        if (!changedRequirementIds.has(entityId)) return [];
        const before = prepared.baseEntities.get(entityId);
        const after = prepared.headEntities.get(entityId);
        if (!after || before?.fingerprint === after.fingerprint) return [];
        return [
          {
            entityId,
            artifactPath: after.artifactPath,
            beforeFingerprint: before?.fingerprint ?? null,
            afterFingerprint: after.fingerprint,
          },
        ];
      });
      if (entities.length > 0) {
        const updated = new Set(entities.map((item) => item.entityId));
        decision = {
          kind: "impact",
          requirementIds: scoped,
          knowledge: {
            state: "updated",
            entities,
            stillCurrent: scoped
              .filter((entityId) => !updated.has(entityId))
              .map((requirementId: string) => ({
                requirementId,
                rationale:
                  "This scoped requirement remains accurate for the reviewed source change.",
              })),
          },
        };
      } else {
        decision = {
          kind: "impact",
          requirementIds: scoped,
          knowledge: {
            state: "still_current",
            rationale:
              "Every scoped requirement remains accurate for the reviewed source change.",
          },
        };
      }
    }

    const analysisReviews: AnalysisReview[] = obligations
      .filter((obligation) => obligation.path === file.path)
      .map((obligation) => {
        if (obligation.kind === "unsupported_review")
          return {
            kind: "unsupported_review" as const,
            side: obligation.side as "before" | "after",
            wholeFile: true as const,
            rationale:
              "The trusted policy permits a self-claimed human review of this unsupported text file; the entire captured file was considered.",
          };
        return {
          kind: "partial_review" as const,
          side: obligation.side as "before" | "after",
          limitationClass: String(obligation.limitationClass),
          ranges: objectArray(obligation.ranges, "partial review ranges"),
          rationale:
            "The exact uncovered ranges on this side were reviewed without inferring unsupported declarations.",
        };
      });
    decisions.set(file.path, { decision, analysisReviews });
  }

  const templateFiles = objectArray(
    recordTemplate.files,
    "record template files",
  );
  const record = {
    ...recordTemplate,
    reviewer: {
      id: "packed-impact-review-fixture",
      source: "self-claimed-local",
    },
    reviewedAt: new Date().toISOString(),
    files: templateFiles.map((file) => {
      const path = requireString(file, "path", "template file");
      const authored = decisions.get(path);
      assert.ok(authored, `missing explicit fixture authorship for ${path}`);
      return {
        ...file,
        analysisReviews: authored.analysisReviews ?? [],
        decision: authored.decision,
      };
    }),
  } as unknown as ImpactReviewRecord;
  return { record, prepared };
}

async function assertInstalledMcpPreparationParity(
  sandbox: TestSandbox,
  input: Readonly<Record<string, unknown>>,
  cliData: unknown,
): Promise<void> {
  const mcp = startMcpServer(sandbox);
  try {
    const initialized = await sendMcpRequest(mcp, 1, "initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "impact-review-parity", version: "1.0.0" },
    });
    assert.ifError(initialized.error);
    mcp.stdin?.write(
      `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`,
    );
    const response = await sendMcpRequest(mcp, 2, "tools/call", {
      name: "kb_prepare_impact_review",
      arguments: input,
    });
    assert.ifError(response.error);
    const result = requireRecord(response.result, "MCP preparation result");
    assert.notEqual(result.isError, true);
    const envelope = requireRecord(
      result.structuredContent,
      "MCP preparation envelope",
    );
    assert.equal(envelope.operation, "kb_prepare_impact_review");
    assert.equal(envelope.status, "success");
    assert.deepEqual(
      envelope.data,
      cliData,
      "installed MCP runtime and CLI must expose identical preparation data",
    );
  } finally {
    if (mcp.exitCode === null && mcp.signalCode === null) {
      const exited = new Promise<void>((resolveExit) => {
        mcp.once("exit", () => resolveExit());
      });
      mcp.kill();
      await exited;
    }
  }
}

function stage(
  sandbox: TestSandbox,
  paths: readonly string[],
): Promise<CommandResult> {
  return run("git", ["add", "--", ...paths], {
    cwd: sandbox.repoDir,
    env: sandbox.env,
    timeoutMs: COMMAND_TIMEOUT_MS,
  });
}

async function assertGit(
  sandbox: TestSandbox,
  args: readonly string[],
  label: string,
): Promise<string> {
  const result = await run("git", [...args], {
    cwd: sandbox.repoDir,
    env: sandbox.env,
    timeoutMs: COMMAND_TIMEOUT_MS,
  });
  assertExit(result, 0, label);
  return result.stdout.trim();
}

type GateInputSnapshot = Readonly<{
  indexTree: string;
  headCommit: string;
  sourceBytes: Buffer;
}>;

async function captureGateInputSnapshot(
  sandbox: TestSandbox,
  sourcePath: string,
  label: string,
): Promise<GateInputSnapshot> {
  return {
    indexTree: await assertGit(sandbox, ["write-tree"], `${label} index`),
    headCommit: await assertGit(
      sandbox,
      ["rev-parse", "HEAD"],
      `${label} HEAD`,
    ),
    sourceBytes: readFileSync(sourcePath),
  };
}

async function assertGateInputsPreserved(
  sandbox: TestSandbox,
  sourcePath: string,
  expected: GateInputSnapshot,
  label: string,
): Promise<void> {
  assert.deepEqual(
    readFileSync(sourcePath),
    expected.sourceBytes,
    `${label} must preserve the current source bytes`,
  );
  assert.equal(
    await assertGit(sandbox, ["write-tree"], `${label} index after gate`),
    expected.indexTree,
    `${label} must preserve the Git index`,
  );
  assert.equal(
    await assertGit(sandbox, ["rev-parse", "HEAD"], `${label} HEAD after gate`),
    expected.headCommit,
    `${label} must preserve HEAD`,
  );
}

function requirementPayload(
  semantic: InstalledImpactApi["semantic"],
  id: string,
  title: string,
  semanticText: string,
): Record<string, unknown> {
  const { receipt } = semantic.analyzeSemanticAdvisorInput({
    payload: {
      type: "req",
      id,
      properties: { title, status: "active", semantic_text: semanticText },
    },
  });
  const propositions = receipt.propositions;
  const inventoryContract = receipt.inventory_contract;
  return {
    type: "req",
    id,
    properties: {
      title,
      status: "active",
      semantic_text: semanticText,
      semantic_source_field: inventoryContract.source_field,
      semantic_source_hash: inventoryContract.source_hash,
      semantic_inventory_version: inventoryContract.version,
      logic_claims: propositions.map((proposition) => proposition.claim_key),
      semantic_inventory: propositions.map((proposition) => ({
        claim_key: proposition.claim_key,
        claim_text: proposition.claim_text,
        role: proposition.role,
        status: proposition.status,
        span: proposition.span,
        ...(proposition.reason ? { reason: proposition.reason } : {}),
      })),
    },
  };
}

function setupEntities(
  semantic: InstalledImpactApi["semantic"],
): readonly Record<string, unknown>[] {
  const req1 = REQUIREMENT_IDS[0];
  const req2 = REQUIREMENT_IDS[1];
  return [
    requirementPayload(
      semantic,
      req1,
      "The first service behavior remains specified",
      "The first service function returns the approved value.",
    ),
    requirementPayload(
      semantic,
      req2,
      "The second service behavior remains specified",
      "The second service function returns the numeric value two.",
    ),
    {
      type: "test",
      id: TEST_ID,
      properties: {
        title: "The installed CLI accepts only current impact evidence",
        status: "active",
        verification_scope: "end_to_end",
        verification_perspective: "consumer",
        proof_contract: {
          version: "kibi.proof-contract.v1",
          integration: TEST_INTEGRATION_ID,
          required_proofs: [{ symbol_id: TEST_SYMBOL_ID, target: "default" }],
          success_policy: "all_required_first_attempt",
        },
      },
      relationships: [
        { type: "validates", from: TEST_ID, to: req1 },
        { type: "validates", from: TEST_ID, to: req2 },
      ],
    },
    {
      type: "symbol",
      id: TEST_SYMBOL_ID,
      properties: {
        title: "first",
        status: "active",
        sourceFile: SOURCE_PATH,
        symbol_role: "behavioral",
      },
      relationships: [
        { type: "implements", from: TEST_SYMBOL_ID, to: req1 },
        { type: "covered_by", from: TEST_SYMBOL_ID, to: TEST_ID },
      ],
    },
    {
      type: "symbol",
      id: "SYM-IMPACT-SECOND",
      properties: {
        title: "second",
        status: "active",
        sourceFile: SOURCE_PATH,
        symbol_role: "behavioral",
      },
      relationships: [
        { type: "implements", from: "SYM-IMPACT-SECOND", to: req2 },
      ],
    },
  ];
}

async function createBaseline(
  sandbox: TestSandbox,
  semantic: InstalledImpactApi["semantic"],
): Promise<void> {
  await sandbox.initGitRepo();
  await assertGit(sandbox, ["branch", "-m", "main"], "rename fixture branch");
  await assertGit(
    sandbox,
    ["commit", "--allow-empty", "-m", "fixture repository start"],
    "empty fixture commit",
  );

  const packageConfig = {
    name: "impact-review-installed-consumer",
    private: true,
    kibi: { plugins: [] },
  };
  mkdirSync(join(sandbox.repoDir, ".kibi"), { recursive: true });
  writeFileSync(
    join(sandbox.repoDir, "package.json"),
    `${JSON.stringify(packageConfig, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    join(sandbox.repoDir, ".kibi/impact-policy.json"),
    `${JSON.stringify(
      {
        contractVersion: "kibi.impact-policy.v1",
        id: "impact-installed-fixture",
        version: "1",
        allowUnsupportedReview: true,
        allowedPartial: [],
        notApplicablePaths: [],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const initialized = await kibi(sandbox, ["init", "--no-hooks"], {
    timeoutMs: COMMAND_TIMEOUT_MS,
  });
  assertExit(
    initialized,
    0,
    "initialize isolated Kibi workspace without hooks",
  );

  // This is disposable integration fixture configuration, authored in the
  // packed consumer only. It runs a harmless Node child and never imports or
  // executes source under review.
  mkdirSync(join(sandbox.repoDir, ".kb/proof"), { recursive: true });
  writeFileSync(
    join(sandbox.repoDir, ".kb/proof/integrations.json"),
    `${JSON.stringify(
      {
        version: "kibi.proof-integration.v1",
        integrations: [
          {
            id: TEST_INTEGRATION_ID,
            producer: "command",
            command: [
              "node",
              "-e",
              "process.stdout.write('fixture proof run')",
            ],
            description:
              "A harmless command used only to exercise receipt ingestion.",
          },
        ],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  for (const payload of setupEntities(semantic)) await upsert(sandbox, payload);
  mkdirSync(dirname(join(sandbox.repoDir, SOURCE_PATH)), { recursive: true });
  writeFileSync(join(sandbox.repoDir, SOURCE_PATH), SOURCE_BEFORE, "utf8");

  const synced = await kibi(sandbox, ["sync", "--refresh-symbol-coordinates"], {
    timeoutMs: COMMAND_TIMEOUT_MS,
  });
  assertExit(synced, 0, "compile fixture baseline through Kibi sync");

  const staged = await stage(sandbox, [
    "package.json",
    ".kibi",
    ".gitignore",
    ".kb",
    "src",
  ]);
  assertExit(staged, 0, "stage Kibi-authored fixture baseline");
  const committed = await assertGit(
    sandbox,
    ["commit", "-m", "trusted impact policy and authored Kibi baseline"],
    "commit protected target baseline",
  );
  assert.ok(committed.length > 0);
  const baselineCheck = await kibi(sandbox, [
    "check",
    "--staged",
    "--format",
    "json",
  ]);
  assertExit(baselineCheck, 0, "clean installed baseline staged check");

  await assertGit(
    sandbox,
    ["switch", "-c", "feature/impact-review"],
    "create reviewed feature branch",
  );
}

async function stageFixtureKnowledge(sandbox: TestSandbox): Promise<void> {
  const result = await stage(sandbox, [".kb"]);
  assertExit(result, 0, "stage canonical Kibi source writes");
}

function stagedViolations(
  result: CommandResult,
): Array<Record<string, unknown>> {
  const output = parseJson(result, "staged check");
  const content = requireRecord(
    output.structuredContent,
    `staged check structured content.\n${outputOf(result)}`,
  );
  const violations = objectArray(content.violations, "staged check violations");
  assert.equal(content.count, violations.length);
  return violations;
}

function stagedFileDiagnostics(
  result: CommandResult,
): Array<Record<string, unknown>> {
  const output = parseJson(result, "staged check");
  const content = requireRecord(
    output.structuredContent,
    `staged check structured content.\n${outputOf(result)}`,
  );
  return objectArray(content.diagnostics, "staged check file diagnostics");
}

async function runInstalledGeneratedCoordinateWorkflow(
  tarballs: Tarballs,
): Promise<void> {
  const sandbox = createSandbox();
  try {
    await sandbox.install(tarballs);
    // This fixture proves local-HEAD review behavior. Keep runner CI state
    // away from its normal path; the explicit negative below opts back in.
    sandbox.env.CI = undefined;
    assertInstalledTarballProvenance(sandbox, tarballs);
    await sandbox.verifyKibiCliResolution();
    const api = await loadImpactApi(sandbox);
    await sandbox.initGitRepo();
    await assertGit(
      sandbox,
      ["branch", "-m", "main"],
      "name coordinate fixture base",
    );
    await assertGit(
      sandbox,
      ["commit", "--allow-empty", "-m", "coordinate fixture start"],
      "create coordinate fixture start commit",
    );

    const sourceConfig = {
      plugins: [
        {
          package: "kibi-plugin-treesitter",
          capabilities: {
            "kibi.symbol-extractor.v2": { mode: "augment" },
          },
        },
      ],
    };
    const packageConfig = {
      name: "stage-e-generated-coordinate-consumer",
      private: true,
      dependencies: { "kibi-plugin-treesitter": "*" },
      kibi: sourceConfig,
    };
    writeFileSync(
      join(sandbox.repoDir, "package.json"),
      `${JSON.stringify(packageConfig, null, 2)}\n`,
      "utf8",
    );

    const parserInstall = await run(
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
    assertExit(
      parserInstall,
      0,
      "install the exact packed source parser in the fixture",
    );
    const installedParser = parseJsonObject(
      readFileSync(
        join(
          sandbox.repoDir,
          "node_modules/kibi-plugin-treesitter/package.json",
        ),
        "utf8",
      ),
      "installed Tree-sitter package manifest",
    );
    assert.equal(
      requireString(installedParser, "name", "installed Tree-sitter package"),
      "kibi-plugin-treesitter",
    );
    const installedParserVersion = requireString(
      installedParser,
      "version",
      "installed Tree-sitter package",
    );
    const parserTarballHash = createHash("sha256")
      .update(readFileSync(tarballs["plugin-treesitter"]))
      .digest("hex");
    process.stdout.write(
      `STAGE_E_COORDINATE_PARSER_PROVENANCE ${JSON.stringify({
        package: installedParser.name,
        version: installedParserVersion,
        tarball: tarballs["plugin-treesitter"],
        sha256: parserTarballHash,
      })}\n`,
    );
    packageConfig.dependencies["kibi-plugin-treesitter"] =
      installedParserVersion;
    writeFileSync(
      join(sandbox.repoDir, "package.json"),
      `${JSON.stringify(packageConfig, null, 2)}\n`,
      "utf8",
    );

    const sourceService =
      api.maintenance.createMaintenanceSourceAnalysisService(
        sandbox.repoDir,
        sourceConfig,
      );
    const baselineAnalysis = await sourceService.analyzeTextV2(
      DECORATOR_SOURCE_PATH,
      DECORATOR_BASELINE_SOURCE,
    );
    assert.equal(
      baselineAnalysis.status,
      "ok",
      JSON.stringify(baselineAnalysis),
    );
    assert.equal(
      baselineAnalysis.providerId,
      "kibi-plugin-treesitter.tree-sitter.v2",
    );
    assert.match(
      String(baselineAnalysis.providerFingerprint),
      /^[0-9a-f]{64}$/,
    );

    mkdirSync(join(sandbox.repoDir, ".kibi"), { recursive: true });
    writeFileSync(
      join(sandbox.repoDir, ".kibi/impact-policy.json"),
      `${JSON.stringify(
        {
          contractVersion: "kibi.impact-policy.v1",
          id: "stage-e-installed-decorator-policy",
          version: "1",
          allowUnsupportedReview: true,
          allowedPartial: [
            {
              providerId: baselineAnalysis.providerId,
              providerFingerprint: `sha256:${baselineAnalysis.providerFingerprint}`,
              diagnosticCode: DECORATOR_PARTIAL_DIAGNOSTIC,
              limitationClass: DECORATOR_LIMITATION_CLASS,
            },
          ],
          notApplicablePaths: [],
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const initialized = await kibi(sandbox, ["init", "--no-hooks"], {
      timeoutMs: COMMAND_TIMEOUT_MS,
    });
    assertExit(
      initialized,
      0,
      "initialize the isolated generated-coordinate fixture",
    );
    await upsert(
      sandbox,
      requirementPayload(
        api.semantic,
        DECORATOR_REQUIREMENT_ID,
        "The decorated Python handler remains explicitly authored",
        "The decorated Python handler returns the reviewed string value.",
      ),
    );
    await upsert(sandbox, {
      type: "symbol",
      id: DECORATOR_SYMBOL_ID,
      properties: {
        title: "decorated",
        status: "active",
        sourceFile: DECORATOR_SOURCE_PATH,
        symbol_role: "behavioral",
      },
      relationships: [
        {
          type: "implements",
          from: DECORATOR_SYMBOL_ID,
          to: DECORATOR_REQUIREMENT_ID,
        },
      ],
    });
    mkdirSync(join(sandbox.repoDir, "src"), { recursive: true });
    writeFileSync(
      join(sandbox.repoDir, DECORATOR_SOURCE_PATH),
      DECORATOR_BASELINE_SOURCE,
      "utf8",
    );
    // Sync only discovers tracked manifests, so stage the authored baseline first.
    const baselineSources = await stage(sandbox, [
      "package.json",
      ".kibi",
      ".kb",
      ".gitignore",
      "src",
    ]);
    assertExit(
      baselineSources,
      0,
      "stage authored baseline sources before sync",
    );
    const baselineSync = await kibi(
      sandbox,
      ["sync", "--refresh-symbol-coordinates"],
      { timeoutMs: COMMAND_TIMEOUT_MS },
    );
    assertExit(
      baselineSync,
      0,
      "compile and coordinate the authored Python baseline",
    );
    const baselineGenerated = await stage(sandbox, [".kb"]);
    assertExit(baselineGenerated, 0, "stage refreshed baseline manifests");
    const baselineCoordinateCheck = await kibi(
      sandbox,
      ["check-generated", "--staged"],
      { timeoutMs: COMMAND_TIMEOUT_MS },
    );
    assertExit(
      baselineCoordinateCheck,
      0,
      "confirm the un-decorated baseline has current generated coordinates",
    );
    const committedBase = await assertGit(
      sandbox,
      ["commit", "-m", "trusted parser policy and authored Python coordinates"],
      "commit the protected fixture base",
    );
    assert.ok(committedBase.length > 0);
    const policyFromBase = parseJsonObject(
      await assertGit(
        sandbox,
        ["show", "HEAD:.kibi/impact-policy.json"],
        "read the committed base policy",
      ),
      "committed base impact policy",
    );
    const allowedPartial = objectArray(
      policyFromBase.allowedPartial,
      "base policy allowedPartial",
    );
    assert.deepEqual(allowedPartial, [
      {
        providerId: baselineAnalysis.providerId,
        providerFingerprint: `sha256:${baselineAnalysis.providerFingerprint}`,
        diagnosticCode: DECORATOR_PARTIAL_DIAGNOSTIC,
        limitationClass: DECORATOR_LIMITATION_CLASS,
      },
    ]);
    const baseCommit = await assertGit(
      sandbox,
      ["rev-parse", "HEAD"],
      "capture generated-coordinate base commit",
    );
    await assertGit(
      sandbox,
      ["switch", "-c", "feature/reviewed-python-coordinates"],
      "create generated-coordinate feature branch",
    );

    const sourcePath = join(sandbox.repoDir, DECORATOR_SOURCE_PATH);
    const symbolsPath = join(sandbox.repoDir, ".kb/symbols.yaml");
    const coordinatesPath = join(
      sandbox.repoDir,
      ".kb/symbol-coordinates.yaml",
    );
    const reviewPath = join(sandbox.repoDir, ".kibi/impact-review.json");
    const stagedSourceBytes = Buffer.from(DECORATOR_STAGED_SOURCE, "utf8");
    writeFileSync(sourcePath, stagedSourceBytes);
    const sourceStage = await stage(sandbox, [DECORATOR_SOURCE_PATH]);
    assertExit(sourceStage, 0, "stage the decorated Python declaration");

    const defaultBeforeReviewIndex = await assertGit(
      sandbox,
      ["write-tree"],
      "capture index before generated gate without review",
    );
    const defaultBeforeReviewHead = await assertGit(
      sandbox,
      ["rev-parse", "HEAD"],
      "capture HEAD before generated gate without review",
    );
    const defaultGenerated = await kibi(
      sandbox,
      ["check-generated", "--staged"],
      { timeoutMs: COMMAND_TIMEOUT_MS },
    );
    assert.notEqual(
      defaultGenerated.exitCode,
      0,
      "generated gate must reject partial decorator analysis without its exact E review",
    );
    assert.match(
      outputOf(defaultGenerated),
      /Reviewed coordinate migration failed/i,
    );
    assert.match(outputOf(defaultGenerated), /impact review record missing/i);
    assert.deepEqual(readFileSync(sourcePath), stagedSourceBytes);
    assert.equal(
      await assertGit(
        sandbox,
        ["write-tree"],
        "verify no-review gate preserved index",
      ),
      defaultBeforeReviewIndex,
    );
    assert.equal(
      await assertGit(
        sandbox,
        ["rev-parse", "HEAD"],
        "verify no-review gate preserved HEAD",
      ),
      defaultBeforeReviewHead,
    );
    assert.equal(defaultBeforeReviewHead, baseCommit);

    const coordinateSync = await kibi(
      sandbox,
      ["sync", "--refresh-symbol-coordinates"],
      { timeoutMs: COMMAND_TIMEOUT_MS },
    );
    assertExit(
      coordinateSync,
      0,
      "refresh only the authored decorated declaration coordinates",
    );
    assert.match(
      outputOf(coordinateSync),
      /Coordinate-only refresh for src\/decorated\.py; source analysis remains partial:/i,
      "coordinate sync must state that Python analysis remains partial",
    );
    assert.match(
      outputOf(coordinateSync),
      /Python decorators are not evaluated and may alter or synthesize declarations/i,
    );
    assert.deepEqual(readFileSync(sourcePath), stagedSourceBytes);
    const authoredBaseline = await assertGit(
      sandbox,
      ["show", "HEAD:.kb/symbols.yaml"],
      "read authored baseline symbols",
    );
    const refreshedSymbols = readFileSync(symbolsPath, "utf8");
    const declaredSymbolIds = (content: string): string[] =>
      [...content.matchAll(/\bid:\s*(SYM-[A-Z0-9-]+)/g)]
        .map((match) => match[1] as string)
        .sort();
    assert.deepEqual(
      declaredSymbolIds(refreshedSymbols),
      declaredSymbolIds(authoredBaseline),
      "coordinate refresh must retain authored identities without synthesizing symbol declarations",
    );
    const coordinateStage = await stage(sandbox, [
      ".kb/symbol-coordinates.yaml",
    ]);
    assertExit(coordinateStage, 0, "stage the canonical generated coordinates");

    const reviewedSnapshot = api.snapshot.captureStagedSnapshot(
      sandbox.repoDir,
    );
    const trustedConfig = api.maintenance.readSnapshotSourceConfig(
      reviewedSnapshot,
      reviewedSnapshot.baseTree,
    );
    const trustedService =
      api.maintenance.createMaintenanceSourceAnalysisService(
        sandbox.repoDir,
        trustedConfig,
      );
    const analyses = await api.sourceAnalysis.analyzeSourceChanges(
      reviewedSnapshot.inventory,
      trustedService,
    );
    const pythonChange = analyses.get(DECORATOR_SOURCE_PATH);
    assert.equal(pythonChange?.after?.status, "partial");
    assert.equal(
      pythonChange?.after?.providerId,
      baselineAnalysis.providerId,
      "review uses the same installed Tree-sitter provider as the base policy",
    );
    assert.equal(
      pythonChange?.after?.providerFingerprint,
      baselineAnalysis.providerFingerprint,
    );
    assert.ok(
      pythonChange?.after?.diagnostics?.some(
        (diagnostic: { code: string }) =>
          diagnostic.code === DECORATOR_PARTIAL_DIAGNOSTIC,
      ),
      "decorator expansion limitation must be an explicit partial diagnostic",
    );
    assert.ok(
      (pythonChange?.after?.uncoveredRanges.length ?? 0) > 0,
      "partial provider result must expose exact residual ranges for review",
    );

    const partialReview = await prepareReview(sandbox);
    const prepared = partialReview.prepared;
    const preparedPython = prepared.files.find(
      (file) => file.path === DECORATOR_SOURCE_PATH,
    );
    assert.equal(preparedPython?.after?.analysis?.status, "partial");
    const allowance = prepared.policy.allowedPartial.find(
      (candidate) =>
        candidate.providerId === preparedPython?.after?.analysis?.providerId &&
        candidate.providerFingerprint ===
          preparedPython?.after?.analysis?.providerFingerprint &&
        candidate.diagnosticCode === DECORATOR_PARTIAL_DIAGNOSTIC &&
        candidate.limitationClass === DECORATOR_LIMITATION_CLASS,
    );
    assert.ok(
      allowance,
      "public preparation omitted the trusted partial-review obligation",
    );
    assert.deepEqual(
      preparedPython?.after?.analysis?.uncoveredRanges,
      pythonChange?.after?.uncoveredRanges,
      "public preparation must retain the exact provider-reported ranges",
    );
    const record = partialReview.record;
    writeFileSync(reviewPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    const reviewStage = await stage(sandbox, [".kibi/impact-review.json"]);
    assertExit(
      reviewStage,
      0,
      "stage the exact partial-analysis impact review",
    );

    const exactSnapshot = api.snapshot.captureStagedSnapshot(sandbox.repoDir);
    const exactConfig = api.maintenance.readSnapshotSourceConfig(
      exactSnapshot,
      exactSnapshot.baseTree,
    );
    const exactService = api.maintenance.createMaintenanceSourceAnalysisService(
      sandbox.repoDir,
      exactConfig,
    );
    const exactAnalyses = await api.sourceAnalysis.analyzeSourceChanges(
      exactSnapshot.inventory,
      exactService,
    );
    const exactEvaluation = api.evaluator.evaluateImpactReview(exactSnapshot, {
      providerSetFingerprint: api.maintenance.fingerprintMaintenanceSourceSet(
        sandbox.repoDir,
        exactConfig,
      ),
      evaluatorFingerprint: api.evaluator.fingerprintImpactEvaluator(),
      analyses: exactAnalyses,
    });
    assert.equal(exactEvaluation.passed, true, JSON.stringify(exactEvaluation));

    const exactSourceBytes = readFileSync(sourcePath);
    const exactSymbolsBytes = readFileSync(symbolsPath);
    const exactCoordinatesBytes = readFileSync(coordinatesPath);
    const exactIndex = await assertGit(
      sandbox,
      ["write-tree"],
      "capture exact reviewed generated-coordinate index",
    );
    const exactHead = await assertGit(
      sandbox,
      ["rev-parse", "HEAD"],
      "capture exact reviewed generated-coordinate HEAD",
    );
    const generatedPass = await kibi(sandbox, ["check-generated", "--staged"], {
      timeoutMs: COMMAND_TIMEOUT_MS,
    });
    assertExit(
      generatedPass,
      0,
      "installed generated gate accepts exact reviewed decorator coordinates",
    );
    assert.match(
      outputOf(generatedPass),
      /staged generated manifests are current/i,
    );
    assert.deepEqual(readFileSync(sourcePath), exactSourceBytes);
    assert.deepEqual(readFileSync(symbolsPath), exactSymbolsBytes);
    assert.deepEqual(readFileSync(coordinatesPath), exactCoordinatesBytes);
    assert.equal(
      await assertGit(
        sandbox,
        ["write-tree"],
        "verify successful gate preserved index",
      ),
      exactIndex,
    );
    assert.equal(
      await assertGit(
        sandbox,
        ["rev-parse", "HEAD"],
        "verify successful gate preserved HEAD",
      ),
      exactHead,
    );

    const queried = await kibi(sandbox, [
      "query",
      "symbol",
      "--format",
      "json",
      "--id",
      DECORATOR_SYMBOL_ID,
    ]);
    assertExit(
      queried,
      0,
      "query authored Python coordinate through the installed CLI",
    );
    const queriedSymbolValue: unknown = JSON.parse(queried.stdout);
    const queriedSymbols = objectArray(
      queriedSymbolValue,
      "installed symbol query result",
    );
    assert.equal(queriedSymbols.length, 1);
    const queriedSymbol = queriedSymbols[0];
    assert.ok(queriedSymbol);
    assert.deepEqual(
      {
        id: queriedSymbol.id,
        sourceFile: queriedSymbol.sourceFile,
        sourceLine: queriedSymbol.sourceLine,
        sourceColumn: queriedSymbol.sourceColumn,
        sourceEndLine: queriedSymbol.sourceEndLine,
        sourceEndColumn: queriedSymbol.sourceEndColumn,
      },
      {
        id: DECORATOR_SYMBOL_ID,
        sourceFile: DECORATOR_SOURCE_PATH,
        sourceLine: 2,
        sourceColumn: 0,
        sourceEndLine: 3,
        sourceEndColumn: 22,
      },
    );
    assert.deepEqual(
      [
        ...readFileSync(symbolsPath, "utf8").matchAll(
          /^\s+- id: ([^\r\n]+)$/gm,
        ),
      ].map((match) => match[1]),
      [DECORATOR_SYMBOL_ID],
      "coordinate refresh retains only the authored symbol identity",
    );

    const providerTamper = parseJsonObject(
      jsonStringify(record, "impact review record"),
      "cloned impact review record",
    );
    const providerTamperScope = requireRecord(
      providerTamper.scope,
      "impact review scope",
    );
    providerTamperScope.providerSetFingerprint = `sha256:${"0".repeat(64)}`;
    writeFileSync(
      reviewPath,
      `${JSON.stringify(providerTamper, null, 2)}\n`,
      "utf8",
    );
    const providerReviewStage = await stage(sandbox, [
      ".kibi/impact-review.json",
    ]);
    assertExit(
      providerReviewStage,
      0,
      "stage a deliberately stale provider binding",
    );
    const providerTamperBeforeGate = await captureGateInputSnapshot(
      sandbox,
      sourcePath,
      "stale-provider gate",
    );
    const providerMismatch = await kibi(
      sandbox,
      ["check-generated", "--staged"],
      { timeoutMs: COMMAND_TIMEOUT_MS },
    );
    assert.notEqual(providerMismatch.exitCode, 0);
    assert.match(outputOf(providerMismatch), /provider-set binding is stale/i);
    await assertGateInputsPreserved(
      sandbox,
      sourcePath,
      providerTamperBeforeGate,
      "stale-provider gate",
    );
    writeFileSync(reviewPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    const restoreReview = await stage(sandbox, [".kibi/impact-review.json"]);
    assertExit(restoreReview, 0, "restore exact provider-bound review");

    const staleSourceBytes = Buffer.concat([
      exactSourceBytes,
      Buffer.from("# changed after review\n", "utf8"),
    ]);
    writeFileSync(sourcePath, staleSourceBytes);
    const staleSourceStage = await stage(sandbox, [DECORATOR_SOURCE_PATH]);
    assertExit(staleSourceStage, 0, "stage source bytes changed after review");
    const staleSourceBeforeGate = await captureGateInputSnapshot(
      sandbox,
      sourcePath,
      "stale-source gate",
    );
    const staleSource = await kibi(sandbox, ["check-generated", "--staged"], {
      timeoutMs: COMMAND_TIMEOUT_MS,
    });
    assert.notEqual(staleSource.exitCode, 0);
    assert.match(
      outputOf(staleSource),
      /Per-file Git or analysis fingerprint is stale: src\/decorated\.py \(after, newHunkRanges\)/i,
    );
    await assertGateInputsPreserved(
      sandbox,
      sourcePath,
      staleSourceBeforeGate,
      "stale-source gate",
    );
    writeFileSync(sourcePath, exactSourceBytes);
    const restoreSource = await stage(sandbox, [DECORATOR_SOURCE_PATH]);
    assertExit(restoreSource, 0, "restore reviewed source bytes");

    const ciLocalHeadBeforeGate = await captureGateInputSnapshot(
      sandbox,
      sourcePath,
      "CI local-HEAD gate",
    );
    const ciLocalHead = await run(
      "node",
      [sandbox.kibiBin, "check-generated", "--staged"],
      {
        cwd: sandbox.repoDir,
        env: { ...sandbox.env, CI: "true" },
        timeoutMs: COMMAND_TIMEOUT_MS,
      },
    );
    assert.notEqual(ciLocalHead.exitCode, 0);
    assert.match(
      outputOf(ciLocalHead),
      /unavailable in CI without a protected target-base snapshot/i,
      "local HEAD review must refuse CI rather than claim protected-target authorization",
    );
    await assertGateInputsPreserved(
      sandbox,
      sourcePath,
      ciLocalHeadBeforeGate,
      "CI local-HEAD gate",
    );
  } finally {
    await sandbox.cleanup();
  }
}

async function runInstalledImpactPolicyWorkflow(
  tarballs: Tarballs,
): Promise<void> {
  const sandbox = createSandbox();
  try {
    await sandbox.install(tarballs);
    assertInstalledTarballProvenance(sandbox, tarballs);
    await sandbox.verifyKibiCliResolution();
    createRuntimeNetworkGuard(sandbox);

    const guardProbe = await run(
      "node",
      [
        "-e",
        `const assert = require("node:assert/strict"); const net = require("node:net"); assert.equal(globalThis.KIBI_E2E_NETWORK_GUARD, "active"); assert.throws(() => new net.Socket().connect(9, "127.0.0.1"), /network access is disabled/); assert.throws(() => fetch("https://example.invalid"), /network access is disabled/); process.stdout.write("active");`,
      ],
      { cwd: sandbox.repoDir, env: sandbox.env },
    );
    assertExit(guardProbe, 0, "offline runtime guard probe");
    assert.equal(guardProbe.stdout, "active");

    const api = await loadImpactApi(sandbox);
    await createBaseline(sandbox, api.semantic);

    writeFileSync(join(sandbox.repoDir, SOURCE_PATH), SOURCE_AFTER, "utf8");
    mkdirSync(join(sandbox.repoDir, "docs"), { recursive: true });
    writeFileSync(
      join(sandbox.repoDir, "docs/review-note.unclassified"),
      "A complete whole-file review is required for this unsupported note.\n",
      "utf8",
    );
    const initialStage = await stage(sandbox, [
      SOURCE_PATH,
      "docs/review-note.unclassified",
    ]);
    assertExit(initialStage, 0, "stage source and unsupported-note changes");

    await upsert(
      sandbox,
      requirementPayload(
        api.semantic,
        REQUIREMENT_IDS[0],
        "The first service behavior remains specified",
        "The first service function returns the revised value.",
      ),
    );
    await stageFixtureKnowledge(sandbox);
    const synced = await kibi(
      sandbox,
      ["sync", "--refresh-symbol-coordinates"],
      {
        timeoutMs: COMMAND_TIMEOUT_MS,
      },
    );
    assertExit(synced, 0, "sync first source and knowledge change");
    await stageFixtureKnowledge(sandbox);

    const missingReview = await kibi(
      sandbox,
      ["check", "--staged", "--format", "json"],
      { timeoutMs: COMMAND_TIMEOUT_MS },
    );
    assertExit(missingReview, 1, "missing impact review negative case");
    assert.match(outputOf(missingReview), /Staged impact review failed/i);
    assert.match(outputOf(missingReview), /impact review record missing/i);

    const incompleteReview = await prepareReview(sandbox, {
      verifyMcpParity: true,
    });
    assert.deepEqual(
      incompleteReview.prepared.scopedRequirementIdsByPath.get(SOURCE_PATH),
      [REQUIREMENT_IDS[0], REQUIREMENT_IDS[1]],
      "the source review must account for its complete baseline requirement set",
    );
    const incompleteRecord = {
      ...incompleteReview.record,
      files: incompleteReview.record.files.map((file) =>
        file.path === "docs/review-note.unclassified"
          ? { ...file, analysisReviews: [] }
          : file,
      ),
    };
    const reviewPath = join(sandbox.repoDir, ".kibi/impact-review.json");
    writeFileSync(
      reviewPath,
      `${JSON.stringify(incompleteRecord, null, 2)}\n`,
      "utf8",
    );
    const stagedIncomplete = await stage(sandbox, [".kibi/impact-review.json"]);
    assertExit(stagedIncomplete, 0, "stage incomplete unsupported review");
    const omittedUnsupported = await kibi(
      sandbox,
      ["check", "--staged", "--format", "json"],
      { timeoutMs: COMMAND_TIMEOUT_MS },
    );
    assertExit(
      omittedUnsupported,
      1,
      "policy review requires explicit unsupported-file evidence",
    );
    assert.match(
      outputOf(omittedUnsupported),
      /Unsupported side lacks one explicit whole-file review/i,
    );

    const partialAnalysis = incompleteReview;
    const unsupportedPath = partialAnalysis.prepared.files.find(
      (file) => file.path === "docs/review-note.unclassified",
    );
    assert.ok(
      unsupportedPath,
      "unsupported note must remain in complete impact inventory",
    );
    assert.equal(unsupportedPath.after?.analysis?.status, "unsupported");
    const supportedFileReview = partialAnalysis.record.files.find(
      (file) => file.path === "docs/review-note.unclassified",
    );
    assert.deepEqual(supportedFileReview?.analysisReviews, [
      {
        kind: "unsupported_review",
        side: "after",
        wholeFile: true,
        rationale:
          "The trusted policy permits a self-claimed human review of this unsupported text file; the entire captured file was considered.",
      },
    ]);
    writeFileSync(
      reviewPath,
      `${JSON.stringify(partialAnalysis.record, null, 2)}\n`,
      "utf8",
    );
    const stageValidReview = await stage(sandbox, [".kibi/impact-review.json"]);
    assertExit(stageValidReview, 0, "stage complete initial impact review");

    const ownershipNegative = await kibi(
      sandbox,
      ["check", "--staged", "--format", "json"],
      { timeoutMs: COMMAND_TIMEOUT_MS },
    );
    assertExit(ownershipNegative, 1, "unowned declaration negative case");
    const missingOwner = stagedViolations(ownershipNegative).filter(
      (violation) =>
        violation.file === SOURCE_PATH && violation.name === "newBehavior",
    );
    assert.equal(
      missingOwner.length,
      1,
      `staged validation must report the actual unowned declaration.\n${outputOf(ownershipNegative)}`,
    );
    assert.equal(missingOwner[0]?.currentLinks, 0);
    assert.equal(missingOwner[0]?.requiredLinks, 1);
    const sourceHashBeforeRepair = sourceHash(sandbox);

    await upsert(
      sandbox,
      requirementPayload(
        api.semantic,
        REQUIREMENT_IDS[2],
        "The new service behavior is specified",
        "The new service function returns the boolean value true.",
      ),
    );
    await upsert(sandbox, {
      type: "symbol",
      id: "SYM-IMPACT-ADDED",
      properties: {
        title: "newBehavior",
        status: "active",
        sourceFile: SOURCE_PATH,
        symbol_role: "behavioral",
      },
      relationships: [
        {
          type: "implements",
          from: "SYM-IMPACT-ADDED",
          to: REQUIREMENT_IDS[2],
        },
        { type: "covered_by", from: "SYM-IMPACT-ADDED", to: TEST_ID },
      ],
    });
    await upsert(sandbox, {
      type: "test",
      id: TEST_ID,
      properties: {
        title: "The installed CLI accepts only current impact evidence",
        status: "active",
        verification_scope: "end_to_end",
        verification_perspective: "consumer",
        proof_contract: {
          version: "kibi.proof-contract.v1",
          integration: TEST_INTEGRATION_ID,
          required_proofs: [{ symbol_id: TEST_SYMBOL_ID, target: "default" }],
          success_policy: "all_required_first_attempt",
        },
      },
      relationships: [
        { type: "validates", from: TEST_ID, to: REQUIREMENT_IDS[0] },
        { type: "validates", from: TEST_ID, to: REQUIREMENT_IDS[1] },
        { type: "validates", from: TEST_ID, to: REQUIREMENT_IDS[2] },
      ],
    });
    const repairedSync = await kibi(
      sandbox,
      ["sync", "--refresh-symbol-coordinates"],
      { timeoutMs: COMMAND_TIMEOUT_MS },
    );
    assertExit(
      repairedSync,
      0,
      "refresh coordinates after CLI ownership authoring",
    );
    await stageFixtureKnowledge(sandbox);
    assert.equal(
      sourceHash(sandbox),
      sourceHashBeforeRepair,
      "the ownership repair must not rewrite the reviewed source bytes",
    );

    const staleReview = await kibi(
      sandbox,
      ["check", "--staged", "--format", "json"],
      { timeoutMs: COMMAND_TIMEOUT_MS },
    );
    assertExit(staleReview, 1, "old review must fail after knowledge changes");
    assert.match(outputOf(staleReview), /Staged impact review failed/i);
    assert.match(outputOf(staleReview), /captured-knowledge binding is stale/i);

    const canonicalReview = await prepareReview(sandbox);
    assert.deepEqual(
      canonicalReview.prepared.scopedRequirementIdsByPath.get(SOURCE_PATH),
      [...REQUIREMENT_IDS].sort(),
      "updated review must partition every scoped requirement",
    );
    const sourceDecision = canonicalReview.record.files.find(
      (file) => file.path === SOURCE_PATH,
    )?.decision;
    assert.ok(sourceDecision?.kind === "impact");
    assert.equal(sourceDecision?.kind, "impact");
    assert.ok(sourceDecision.knowledge.state === "updated");
    assert.equal(sourceDecision?.knowledge.state, "updated");
    assert.deepEqual(
      sourceDecision.knowledge.entities.map((entity) => entity.entityId),
      [REQUIREMENT_IDS[2], REQUIREMENT_IDS[0]],
      "both changed requirements must be fingerprinted, including the newly authored owner",
    );
    assert.deepEqual(
      (sourceDecision.knowledge.stillCurrent ?? []).map(
        (item) => item.requirementId,
      ),
      [REQUIREMENT_IDS[1]],
      "the unchanged requirement must be explicitly accounted for",
    );
    assert.ok(
      (sourceDecision.knowledge.stillCurrent?.[0]?.rationale.trim().length ??
        0) > 0,
      "still-current partition requires a rationale",
    );
    writeFileSync(
      reviewPath,
      `${JSON.stringify(canonicalReview.record, null, 2)}\n`,
      "utf8",
    );
    const stageCanonicalReview = await stage(sandbox, [
      ".kibi/impact-review.json",
    ]);
    assertExit(
      stageCanonicalReview,
      0,
      "stage canonical repaired impact review",
    );

    const stagedSnapshot = api.snapshot.captureStagedSnapshot(sandbox.repoDir);
    const stagedConfig = api.maintenance.readSnapshotSourceConfig(
      stagedSnapshot,
      stagedSnapshot.baseTree,
    );
    const stagedService =
      api.maintenance.createMaintenanceSourceAnalysisService(
        sandbox.repoDir,
        stagedConfig,
      );
    const stagedAnalyses = await api.sourceAnalysis.analyzeSourceChanges(
      stagedSnapshot.inventory,
      stagedService,
    );
    const stagedEvaluation = api.evaluator.evaluateImpactReview(
      stagedSnapshot,
      {
        providerSetFingerprint: api.maintenance.fingerprintMaintenanceSourceSet(
          sandbox.repoDir,
          stagedConfig,
        ),
        evaluatorFingerprint: api.evaluator.fingerprintImpactEvaluator(),
        analyses: stagedAnalyses,
      },
    );
    assert.equal(
      stagedEvaluation.passed,
      true,
      JSON.stringify(stagedEvaluation),
    );
    assert.match(
      String(stagedEvaluation.scopeFingerprint),
      /^sha256:[0-9a-f]{64}$/,
    );

    const stagedPositive = await kibi(
      sandbox,
      ["check", "--staged", "--format", "json"],
      { timeoutMs: COMMAND_TIMEOUT_MS },
    );
    assertExit(stagedPositive, 0, "canonical repaired staged check");
    assert.equal(stagedViolations(stagedPositive).length, 0);
    const positiveFileDiagnostics = stagedFileDiagnostics(stagedPositive);
    assert.equal(
      positiveFileDiagnostics.some(
        (diagnostic) => diagnostic.id === "staged_file_impact_review_needed",
      ),
      false,
      "a complete impact review resolves legacy staged-impact advisories",
    );
    assert.equal(
      positiveFileDiagnostics.some(
        (diagnostic) =>
          diagnostic.id === "staged_file_ownership_missing" &&
          diagnostic.path === ".kibi/impact-review.json",
      ),
      false,
      "the exact added/modified impact-review transport is not a source file",
    );
    assert.ok(
      positiveFileDiagnostics.some(
        (diagnostic) =>
          diagnostic.id === "staged_file_ownership_missing" &&
          diagnostic.path === "docs/review-note.unclassified",
      ),
      "suppressing the review transport must preserve unrelated file-ownership advisories",
    );

    const targetCommit = await assertGit(
      sandbox,
      ["rev-parse", "HEAD"],
      "read protected target commit",
    );
    await assertGit(
      sandbox,
      ["commit", "-m", "reviewed source change and canonical impact record"],
      "commit reviewed change normally",
    );
    const reviewedHead = await assertGit(
      sandbox,
      ["rev-parse", "HEAD"],
      "read reviewed commit",
    );

    const beforeReceipt = parseJson(
      await kibi(sandbox, ["status", "--format", "json"]),
      "status before proof receipt",
    );
    const beforeReceiptHash = beforeReceipt.proofSnapshot;
    assert.match(String(beforeReceiptHash), /^[0-9a-f]{64}$/);
    const reviewedSourceHash = sourceHash(sandbox);

    const proved = await kibi(sandbox, ["prove", "--test", TEST_ID], {
      timeoutMs: COMMAND_TIMEOUT_MS,
    });
    assertExit(
      proved,
      0,
      "canonical harmless fixture proof run and receipt ingest",
    );
    assert.match(outputOf(proved), /"applied"\s*:\s*true|"applied": true/);
    assert.equal(sourceHash(sandbox), reviewedSourceHash);
    const afterReceipt = parseJson(
      await kibi(sandbox, ["status", "--format", "json"]),
      "status after proof receipt",
    );
    assert.equal(
      afterReceipt.proofSnapshot,
      beforeReceiptHash,
      "canonical receipt append must preserve the projected workspace fingerprint",
    );

    const receiptStage = await stage(sandbox, [
      ".kb/tests/TEST-IMPACT-RECEIPT-CYCLE.md",
    ]);
    assertExit(
      receiptStage,
      0,
      "stage only the canonical proof receipt source",
    );
    await assertGit(
      sandbox,
      ["commit", "-m", "append canonical proof receipt"],
      "commit receipt-only source change normally",
    );
    const receiptHead = await assertGit(
      sandbox,
      ["rev-parse", "HEAD"],
      "read receipt-appended head commit",
    );

    const eventPath = join(sandbox.baseDir, "pull-request-event.json");
    const repository = "fixture/impact-review";
    writeFileSync(
      eventPath,
      `${JSON.stringify(
        {
          repository: { full_name: repository },
          pull_request: {
            base: {
              ref: "main",
              sha: targetCommit,
              repo: { full_name: repository },
            },
            head: { sha: receiptHead },
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    await assertGit(
      sandbox,
      ["switch", "main"],
      "checkout protected target for PR gate",
    );
    const checkDiff = await run("node", [sandbox.kibiBin, "check-diff"], {
      cwd: sandbox.repoDir,
      env: {
        ...sandbox.env,
        GITHUB_EVENT_NAME: "pull_request_target",
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_REPOSITORY: repository,
        KIBI_IMPACT_TRUSTED_TARGET_REF: "refs/heads/main",
        GITHUB_SHA: targetCommit,
      },
      timeoutMs: COMMAND_TIMEOUT_MS,
    });
    assertExit(checkDiff, 0, "installed trusted aggregate PR impact gate");
    const diffResult = parseJsonObject(
      checkDiff.stdout,
      "installed check-diff result",
    );
    assert.equal(diffResult.status, "passed", checkDiff.stdout);
    assert.equal(diffResult.reviewerAuthority, "self-claimed-local");
    assert.equal(
      diffResult.scopeFingerprint,
      stagedEvaluation.scopeFingerprint,
      "the staged review and PR diff gate must bind the same captured source/knowledge bytes after receipt-only append",
    );
    assert.notEqual(reviewedHead, receiptHead);

    writeFileSync(
      join(sandbox.repoDir, "src/malformed.ts"),
      "export function broken( {\r\n",
      "utf8",
    );
    const malformedStage = await stage(sandbox, ["src/malformed.ts"]);
    assertExit(malformedStage, 0, "stage malformed parser regression input");
    const malformedSnapshot = api.snapshot.captureStagedSnapshot(
      sandbox.repoDir,
    );
    const malformedConfig = api.maintenance.readSnapshotSourceConfig(
      malformedSnapshot,
      malformedSnapshot.baseTree,
    );
    const malformedService =
      api.maintenance.createMaintenanceSourceAnalysisService(
        sandbox.repoDir,
        malformedConfig,
      );
    const malformedAnalyses = await api.sourceAnalysis.analyzeSourceChanges(
      malformedSnapshot.inventory,
      malformedService,
    );
    const malformedResult = malformedAnalyses.get("src/malformed.ts")?.after;
    assert.ok(
      malformedResult,
      "installed builtin analyzer did not inspect malformed bytes",
    );
    assert.equal(malformedResult.status, "partial");
    assert.ok((malformedResult.diagnostics?.length ?? 0) > 0);
    assert.ok(malformedResult.uncoveredRanges.length > 0);
    const malformedPreparation = await kibiInput(
      sandbox,
      "prepare-impact-review",
      { scope: { kind: "staged" } },
    );
    assertExit(
      malformedPreparation,
      1,
      "reject malformed source during public impact-review preparation",
    );
    assert.match(
      outputOf(malformedPreparation),
      /Non-waivable parser, provider, timeout, integrity, or syntax diagnostic/i,
      "syntax-derived partial output must remain non-waivable under the explicit unsupported-review policy",
    );

    assertExplicitMigrationDocumentation();
  } finally {
    await sandbox.cleanup();
  }
}

function assertExplicitMigrationDocumentation(): void {
  const migration = readFileSync(
    join(REPOSITORY_ROOT, "documentation/impact-review-stage-e.md"),
    "utf8",
  );
  assert.match(migration, /initial migration is explicit/i);
  assert.match(
    migration,
    /merge this policy to the protected target in a separate change before enabling/i,
  );

  const example = join(
    REPOSITORY_ROOT,
    "documentation/examples/kibi-impact-gate.yml",
  );
  assert.equal(
    existsSync(example),
    true,
    "the documented workflow example should remain available",
  );
  const workflows = join(REPOSITORY_ROOT, ".github/workflows");
  const activeWorkflowText = existsSync(workflows)
    ? readdirSync(workflows)
        .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
        .map((name) => readFileSync(join(workflows, name), "utf8"))
        .join("\n")
    : "";
  assert.doesNotMatch(
    activeWorkflowText,
    /documentation\/examples\/kibi-impact-gate\.yml/,
    "the sample trusted workflow must remain inactive until separately adopted",
  );
}

// executable_for TEST-impact-policy-stage-e-installed-e2e
export async function runInstalledImpactPolicyE2E(
  tarballs: Tarballs,
): Promise<void> {
  await runInstalledImpactPolicyWorkflow(tarballs);
  await runInstalledGeneratedCoordinateWorkflow(tarballs);
}

if (RUN_NODE_TEST_SUITE) {
  describe("Packed installed Stage E impact review lifecycle", () => {
    let tarballs: Tarballs;

    before(
      async () => {
        assert.ok(
          checkPrologAvailable(),
          "SWI-Prolog is required for the installed CLI impact-review workflow",
        );
        tarballs = await packAll();
      },
      { timeout: 300_000 },
    );

    it(
      "keeps exact staged and trusted-diff impact evidence through ownership repair and canonical receipt append",
      { timeout: 900_000 },
      async () => runInstalledImpactPolicyE2E(tarballs),
    );
  });
}
