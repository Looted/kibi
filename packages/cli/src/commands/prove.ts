import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { executeIngestProof } from "../operations/proof/ingest-proof.js";
import type { IngestProofResult } from "../operations/proof/ingest-proof.js";
import type { ProofIntegration } from "../proof/integrations.js";
import {
  PROOF_RUNS_DIR,
  loadProofIntegrations,
  resolveIntegration,
} from "../proof/integrations.js";
import { convertJUnitXml } from "../proof/producers/junit-adapter.js";
import { convertTap } from "../proof/producers/tap-adapter.js";
import { loadEntities } from "../public/operations/discovery-entities.js";
import type { OperationContext } from "../public/operations/runtime-types.js";
import { ingestProofSpec } from "../public/operations/specs/proof.js";
import { readWorkspaceSnapshot } from "../public/operations/workspace-snapshot.js";
import {
  PROOF_RUN_VERSION,
  type ProofContract,
  type ProofResult,
  type ProofRunArtifact,
  proofBindingsErrors,
  proofRunArtifactErrors,
} from "../public/proof-protocol.js";
import { createCliRuntime } from "../runtime/cli-runtime.js";

// implements REQ-kibi-proof-evidence-protocol
export type ProveCommandOptions = Readonly<{
  testId?: string;
  requirement?: string;
  integration?: string;
  all?: boolean;
  workspaceRoot?: string;
}>;

type SelectedTest = Record<string, unknown>;

function withId(entity: Record<string, unknown>): SelectedTest {
  if (typeof entity.id !== "string" || entity.id === "")
    throw new Error("prove: loaded test entity is missing an id");
  return entity;
}

function testId(test: SelectedTest): string {
  return String(test.id);
}

function parseContract(test: Record<string, unknown>): ProofContract | null {
  const contract = test.proof_contract;
  if (
    contract === null ||
    typeof contract !== "object" ||
    Array.isArray(contract)
  )
    return null;
  return contract as ProofContract;
}

async function runChild(
  commandArgv: readonly string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): Promise<number> {
  const [command, ...args] = commandArgv;
  if (!command)
    throw new Error("prove: integration command argv must be non-empty");
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      shell: false,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("close", (code) => resolve(code ?? 1));
  });
}

function commandEnvironment(
  integration: ProofIntegration,
  commandArgv: readonly string[],
  snapshot: string,
  workspaceRoot: string,
  testIds: readonly string[],
  outputPath: string,
): NodeJS.ProcessEnv {
  return {
    ...process.env,
    KIBI_PROOF_OUTPUT: outputPath,
    KIBI_PROOF_SNAPSHOT: snapshot,
    KIBI_PROOF_COMMAND_ARGV: JSON.stringify(commandArgv),
    KIBI_PROOF_INTEGRATION: integration.id,
    KIBI_PROOF_WORKSPACE: workspaceRoot,
    KIBI_PROOF_TEST_IDS: JSON.stringify(testIds),
  };
}

function collectBindings(tests: readonly SelectedTest[]): {
  symbol_id: string;
  target: string;
  native_id?: string;
  aliases?: string[];
}[] {
  const bindings: {
    symbol_id: string;
    target: string;
    native_id?: string;
    aliases?: string[];
  }[] = [];
  for (const test of tests) {
    const raw = test.proof_bindings;
    if (raw === undefined || raw === null) continue;
    if (!Array.isArray(raw)) continue;
    const errors = proofBindingsErrors(raw);
    if (errors.length > 0)
      throw new Error(
        `prove: test ${test.id} has invalid proof_bindings: ${errors.join("; ")}`,
      );
    for (const entry of raw) {
      const row = entry as Record<string, unknown>;
      bindings.push({
        symbol_id: String(row.symbol_id),
        target: String(row.target),
        ...(row.native_id !== undefined
          ? { native_id: String(row.native_id) }
          : {}),
        ...(row.aliases !== undefined
          ? { aliases: (row.aliases as unknown[]).map(String) }
          : {}),
      });
    }
  }
  return bindings;
}

function dedupeObligations(tests: readonly SelectedTest[]): ProofResult[] {
  const seen = new Set<string>();
  const results: ProofResult[] = [];
  for (const test of tests) {
    const contract = parseContract(test);
    if (!contract) continue;
    for (const obligation of contract.required_proofs) {
      const key = `${obligation.target}\0${obligation.symbol_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({
        symbol_id: obligation.symbol_id,
        target: obligation.target,
        outcome: "passed",
        binding: "aggregate_run",
        attempts: { status: "unavailable" },
      });
    }
  }
  return results;
}

function markAggregateFailure(results: ProofResult[]): ProofResult[] {
  return results.map((result) => ({ ...result, outcome: "failed" as const }));
}

async function selectTests(
  context: OperationContext,
  options: ProveCommandOptions,
): Promise<SelectedTest[]> {
  const loadAll = async (): Promise<Record<string, unknown>[]> =>
    await loadEntities(context.prolog as never, { type: "test" });
  let candidates: SelectedTest[] = [];
  if (options.testId) {
    const found = await loadEntities(context.prolog as never, {
      id: options.testId,
      type: "test",
    });
    candidates = found.map(withId);
  } else if (options.requirement) {
    const requirementId = options.requirement;
    const scenarioResult = await context.prolog?.query(
      `findall([S,T], (kb_relationship(specified_by, '${requirementId}', S), (kb_relationship(verified_by, S, T) ; kb_relationship(validates, T, S)), kb_entity(T, test, _)), Rows)`,
    );
    const rowsRaw = scenarioResult?.success
      ? scenarioResult.bindings.Rows
      : undefined;
    const ids = new Set<string>();
    if (typeof rowsRaw === "string") {
      for (const match of rowsRaw.matchAll(
        /\[['"]?([^,\]]+)['"]?,['"]?([^,\]]+)['"]?\]/g,
      )) {
        const test = match[2];
        if (test) ids.add(test.trim());
      }
    }
    const directResult = await context.prolog?.query(
      `findall(T, (kb_relationship(validates, T, '${requirementId}'), kb_entity(T, test, _)), Rows)`,
    );
    const directRaw = directResult?.success
      ? directResult.bindings.Rows
      : undefined;
    if (typeof directRaw === "string") {
      for (const match of directRaw.matchAll(
        /\[?['"]?([A-Za-z0-9_-]+)['"]?\]?/g,
      )) {
        const candidate: string | undefined = match[1];
        if (candidate?.startsWith("TEST-")) ids.add(candidate);
      }
    }
    const all = await loadAll();
    candidates = all.filter((entity) => ids.has(String(entity.id))).map(withId);
  } else {
    candidates = (await loadAll()).map(withId);
  }
  const selected = candidates.filter(
    (entity) => parseContract(entity) !== null,
  );
  if (options.integration) {
    return selected.filter(
      (entity) => parseContract(entity)?.integration === options.integration,
    );
  }
  return selected;
}

function summarize(result: IngestProofResult): string {
  const parts = [`passed ${result.passed}`, `failed ${result.failed}`];
  if (result.unchanged > 0) parts.push(`unchanged ${result.unchanged}`);
  return parts.join(", ");
}

// implements REQ-kibi-proof-evidence-protocol
export async function proveCommand(
  options: ProveCommandOptions,
): Promise<{ exitCode: number }> {
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const runtime = createCliRuntime(
    options.workspaceRoot === undefined ? {} : { workspaceRoot },
  );
  const context = await runtime.open(ingestProofSpec, {
    ...(options.workspaceRoot === undefined ? {} : { workspaceRoot }),
  });
  let completed = false;
  try {
    const integrations = loadProofIntegrations(context.workspaceRoot);
    if (!integrations.available)
      throw new Error(`prove: ${integrations.error}`);
    const selected = await selectTests(context, options);
    if (selected.length === 0) {
      process.stdout.write(
        `${JSON.stringify({ proved: 0, failed: 0, message: "no proof-bearing tests selected" })}\n`,
      );
      completed = true;
      return { exitCode: 0 };
    }
    const before = await readWorkspaceSnapshot(context);
    if (!before.available) throw new Error(`prove: ${before.error}`);
    const snapshot = before.snapshot.hash;

    const groups = new Map<string, SelectedTest[]>();
    for (const test of selected) {
      const contract = parseContract(test);
      if (!contract) continue;
      const list = groups.get(contract.integration) ?? [];
      list.push(test as SelectedTest);
      groups.set(contract.integration, list);
    }

    const runsDir = path.join(context.workspaceRoot, PROOF_RUNS_DIR);
    await mkdir(runsDir, { recursive: true });

    const ingestResults: IngestProofResult[] = [];
    const failures: string[] = [];
    for (const [integrationId, tests] of groups) {
      const integration = resolveIntegration(
        integrations.integrations,
        integrationId,
      );
      if (!integration) {
        failures.push(
          `integration '${integrationId}' (required by ${tests.map((t) => t.id).join(", ")}) is not configured in .kb/proof/integrations.json`,
        );
        continue;
      }
      const commandArgv = [...integration.command];
      const artifactPath = path.resolve(
        context.workspaceRoot,
        integration.artifact ??
          path.join(PROOF_RUNS_DIR, `${integrationId}.json`),
      );
      await mkdir(path.dirname(artifactPath), { recursive: true });
      await rm(artifactPath, { force: true });
      const env = commandEnvironment(
        integration,
        commandArgv,
        snapshot,
        context.workspaceRoot,
        tests.map((test) => String(test.id)),
        artifactPath,
      );
      const startedAt = new Date().toISOString();
      let exitCode: number;
      try {
        exitCode = await runChild(commandArgv, context.workspaceRoot, env);
      } catch (error) {
        failures.push(
          `integration '${integrationId}' failed to start: ${error instanceof Error ? error.message : String(error)}`,
        );
        continue;
      }
      const finishedAt = new Date().toISOString();

      let artifact: ProofRunArtifact;
      try {
        artifact = await buildArtifact({
          integration,
          commandArgv,
          exitCode,
          startedAt,
          finishedAt,
          artifactPath,
          snapshot,
          tests,
        });
      } catch (error) {
        failures.push(
          `integration '${integrationId}': ${error instanceof Error ? error.message : String(error)}`,
        );
        continue;
      }
      const artifactErrors = proofRunArtifactErrors(artifact);
      if (artifactErrors.length > 0) {
        failures.push(
          `integration '${integrationId}' produced an invalid kibi.proof-run.v1 artifact: ${artifactErrors.join("; ")}`,
        );
        continue;
      }
      await mkdir(path.dirname(artifactPath), { recursive: true });
      await writeFile(
        artifactPath,
        `${JSON.stringify(artifact, null, 2)}\n`,
        "utf8",
      );
      const afterRun = await readWorkspaceSnapshot(context);
      if (!afterRun.available || afterRun.snapshot.hash !== snapshot) {
        failures.push(
          `integration '${integrationId}' changed the tracked workspace during proof execution; proof is bound to snapshot ${snapshot}`,
        );
        continue;
      }
      const ingested = await executeIngestProof(
        {
          snapshot,
          artifact: artifact as unknown as Record<string, unknown>,
          testIds: tests.map((test) => String(test.id)),
        },
        context,
      );
      ingestResults.push(ingested.structuredContent);
      const afterIngest = await readWorkspaceSnapshot(context);
      if (!afterIngest.available || afterIngest.snapshot.hash !== snapshot) {
        failures.push(
          "the tracked workspace changed while receipts were applied; re-run kibi prove",
        );
      }
    }

    const passed = ingestResults.reduce(
      (sum, result) => sum + result.passed,
      0,
    );
    const failed = ingestResults.reduce(
      (sum, result) => sum + result.failed,
      0,
    );
    const unchanged = ingestResults.reduce(
      (sum, result) => sum + result.unchanged,
      0,
    );
    const summary = {
      proved: passed,
      failed,
      unchanged,
      runs: ingestResults.map((result) => ({
        integration: result.integration,
        summary: summarize(result),
        results: result.results,
      })),
      ...(failures.length > 0 ? { failures } : {}),
    };
    process.stdout.write(`${JSON.stringify(summary)}\n`);
    completed = true;
    await runtime.afterSuccess(ingestProofSpec, context);
    return { exitCode: failures.length > 0 || failed > 0 ? 1 : 0 };
  } finally {
    await runtime.close(
      context,
      completed
        ? { status: "success", result: 0 }
        : { status: "error", error: 1 },
    );
  }
}

async function buildArtifact(input: {
  integration: ProofIntegration;
  commandArgv: readonly string[];
  exitCode: number;
  startedAt: string;
  finishedAt: string;
  artifactPath: string;
  snapshot: string;
  tests: readonly SelectedTest[];
}): Promise<ProofRunArtifact> {
  const {
    integration,
    commandArgv,
    exitCode,
    startedAt,
    finishedAt,
    artifactPath,
    snapshot,
    tests,
  } = input;
  const run = (outcome: ProofRunArtifact["run"]["outcome"]) => ({
    outcome,
    exit_code: exitCode,
    started_at: startedAt,
    finished_at: finishedAt,
  });
  if (integration.producer === "command") {
    const results = dedupeObligations(tests);
    return {
      version: PROOF_RUN_VERSION,
      producer: {
        name: "kibi-command-producer",
        ...(integration.producer_version !== undefined
          ? { version: integration.producer_version }
          : {}),
      },
      integration: integration.id,
      command_argv: [...commandArgv],
      code_snapshot: snapshot,
      environment: {
        os: process.platform,
        arch: process.arch,
        runtime: { name: "node", version: process.version },
      },
      run: run(exitCode === 0 ? "passed" : "failed"),
      proof_results: exitCode === 0 ? results : markAggregateFailure(results),
    };
  }
  if (integration.producer === "junit" || integration.producer === "tap") {
    const nativePath = integration.artifact;
    if (!nativePath)
      throw new Error(
        `producer '${integration.producer}' requires an artifact path in .kb/proof/integrations.json`,
      );
    let native: string;
    try {
      native = await readFile(path.resolve(context_path(nativePath)), "utf8");
    } catch {
      throw new Error(
        `producer '${integration.producer}' did not produce its native report at ${nativePath}`,
      );
    }
    const bindings = collectBindings(tests);
    const conversion =
      integration.producer === "junit"
        ? convertJUnitXml(native, bindings)
        : convertTap(native, bindings);
    if (conversion.results.length === 0)
      throw new Error(
        `producer '${integration.producer}' produced no bound proof results${conversion.diagnostics.length > 0 ? `: ${conversion.diagnostics.join("; ")}` : ""}`,
      );
    return {
      version: PROOF_RUN_VERSION,
      producer: {
        name: `kibi-${integration.producer}-adapter`,
        ...(integration.producer_version !== undefined
          ? { version: integration.producer_version }
          : {}),
      },
      integration: integration.id,
      command_argv: [...commandArgv],
      code_snapshot: snapshot,
      environment: {
        os: process.platform,
        arch: process.arch,
        runtime: { name: "node", version: process.version },
      },
      run: run(
        conversion.results.every((result) => result.outcome === "passed")
          ? "passed"
          : "failed",
      ),
      proof_results: conversion.results,
      ...(conversion.diagnostics.length > 0
        ? { diagnostics: conversion.diagnostics }
        : {}),
    };
  }
  // Self-emitting producers (playwright and custom): read the emitted
  // kibi.proof-run.v1 artifact and enforce the process outcome.
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(await readFile(artifactPath, "utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    throw new Error(
      `producer '${integration.producer}' did not emit a readable kibi.proof-run.v1 artifact at ${artifactPath}`,
    );
  }
  const artifact = parsed as unknown as ProofRunArtifact;
  const runRecord = parsed.run as Record<string, unknown> | undefined;
  const reportedOutcome = runRecord?.outcome;
  if (exitCode !== 0) {
    if (reportedOutcome === "passed") {
      throw new Error(
        `producer '${integration.producer}' reported run.outcome 'passed' but the process exited with code ${exitCode}`,
      );
    }
  }
  return artifact;
}

function context_path(nativePath: string): string {
  return path.isAbsolute(nativePath)
    ? nativePath
    : path.join(process.cwd(), nativePath);
}
