// implements REQ-kibi-distribution-parity-matrix
import assert from "node:assert";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import type {
  DistributionCapabilityResult,
  DistributionParityAction,
  DistributionRuntimeAdapter,
  DistributionRuntimeKind,
  DistributionSurface,
  RequirementCompilerCapability,
} from "kibi-cli/distribution-parity";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createSandbox,
  kibi,
  packAll,
  stageSourceFile,
} from "./helpers.js";
import {
  sendMcpRequest,
  startMcpServer,
} from "./mcp-cli-operation-parity-support.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";
const REPO_ROOT = resolve(process.cwd());
const SOURCE_CLI = resolve("packages/cli/bin/kibi");
const SOURCE_MCP = resolve("packages/mcp/bin/kibi-mcp");

type MatrixApi = typeof import("kibi-cli/distribution-parity");
type JsonRecord = Record<string, unknown>;
type ProjectAuditConfig = {
  readonly id: string;
  readonly cli: string;
  readonly mcp: string;
  readonly actions?: Partial<
    Record<RequirementCompilerCapability, DistributionParityAction>
  >;
};

class CapabilityUnavailableError extends Error {}

function unwrapResult(value: JsonRecord): JsonRecord {
  const data = value.data;
  return data && typeof data === "object" && !Array.isArray(data)
    ? (data as JsonRecord)
    : value;
}

function asSourceSandbox(sandbox: TestSandbox): TestSandbox {
  return {
    ...sandbox,
    kibiBin: SOURCE_CLI,
    kibiMcpBin: SOURCE_MCP,
  };
}

function projectAuditConfigs(): readonly ProjectAuditConfig[] {
  const encoded = process.env.KIBI_PARITY_PROJECTS;
  if (!encoded) return [];
  const parsed = JSON.parse(encoded) as unknown;
  if (!Array.isArray(parsed)) {
    throw new TypeError("KIBI_PARITY_PROJECTS must be a JSON array.");
  }
  return parsed as ProjectAuditConfig[];
}

function nodeExecutableFor(
  requested: string,
  provenance: ReturnType<MatrixApi["resolveDistributionRuntimeProvenance"]>,
): string {
  const contents = readFileSync(requested, "utf8");
  return contents.startsWith("#!/bin/sh") && provenance.entrypoint
    ? provenance.entrypoint
    : requested;
}

function asProjectSandbox(
  sandbox: TestSandbox,
  config: ProjectAuditConfig,
  matrixApi: MatrixApi,
): TestSandbox {
  const cliProvenance = matrixApi.resolveDistributionRuntimeProvenance(
    config.cli,
  );
  const mcpProvenance = matrixApi.resolveDistributionRuntimeProvenance(
    config.mcp,
  );
  if (
    cliProvenance.status !== "resolved" ||
    mcpProvenance.status !== "resolved"
  ) {
    throw new Error(
      `Project ${config.id} runtime resolution failed: ${cliProvenance.detail ?? mcpProvenance.detail}`,
    );
  }
  return {
    ...sandbox,
    kibiBin: nodeExecutableFor(config.cli, cliProvenance),
    kibiMcpBin: nodeExecutableFor(config.mcp, mcpProvenance),
  };
}

async function commandJson(
  sandbox: TestSandbox,
  route: string,
  input: JsonRecord,
): Promise<{
  readonly exitCode: number;
  readonly value: JsonRecord | null;
  readonly stderr: string;
}> {
  const inputPath = join(sandbox.repoDir, `matrix-${route}.json`);
  writeFileSync(inputPath, JSON.stringify(input), "utf8");
  const result = await kibi(sandbox, [route, "--input", inputPath]);
  const parsed = result.stdout.trim()
    ? (JSON.parse(result.stdout) as JsonRecord)
    : null;
  return {
    exitCode: result.exitCode,
    value: parsed ? unwrapResult(parsed) : null,
    stderr: result.stderr,
  };
}

function requirementDocument(
  id: string,
  links: readonly { readonly type: string; readonly target: string }[] = [],
): string {
  const renderedLinks = links.length
    ? `links:\n${links.map((link) => `  - type: ${link.type}\n    target: ${link.target}`).join("\n")}\n`
    : "";
  return `---
id: ${id}
title: Distribution parity fixture ${id}
status: open
priority: must
${renderedLinks}---

${id} must expose a stable requirement-compiler outcome.
`;
}

function fixtureDocuments(sandbox: TestSandbox): Record<string, string> {
  return {
    "documentation/requirements/REQ-MATRIX-INCOMPLETE.md": requirementDocument(
      "REQ-MATRIX-INCOMPLETE",
    ),
    "documentation/requirements/REQ-MATRIX-RECEIPT.md": requirementDocument(
      "REQ-MATRIX-RECEIPT",
      [{ type: "specified_by", target: "SCEN-MATRIX-RECEIPT" }],
    ),
    "documentation/scenarios/SCEN-MATRIX-RECEIPT.md": `---
id: SCEN-MATRIX-RECEIPT
title: Distribution parity receipt scenario
status: active
links:
  - type: verified_by
    target: TEST-MATRIX-RECEIPT
---

Given a resolved runtime, when proof runs, then receipt evidence is checked.
`,
    "documentation/tests/TEST-MATRIX-RECEIPT.md": `---
id: TEST-MATRIX-RECEIPT
title: Distribution parity receipt test
status: failing
source: tests/e2e/matrix-receipt.test.ts
verification_scope: end_to_end
verification_perspective: consumer
verification_contract:
  version: kibi.verification-contract.v1
  runner: playwright
  command_argv:
    - pnpm
    - exec
    - playwright
    - test
  required_case_symbols: []
  required_projects:
    - chromium
  success_policy: all_required_cases_first_attempt
links:
  - type: validates
    target: SCEN-MATRIX-RECEIPT
---

Intentionally has no verification receipt.
`,
    "tests/e2e/matrix-receipt.test.ts":
      "export const matrixReceiptFixture = 'missing';\n",
    "documentation/facts/FACT-MATRIX-SUBJECT.md": `---
id: FACT-MATRIX-SUBJECT
title: Distribution parity quota subject
type: fact
status: active
fact_kind: subject
subject_key: matrix.quota
---

Strict contradiction subject.
`,
    "documentation/facts/FACT-MATRIX-A.md": strictValueFact("A", 10),
    "documentation/facts/FACT-MATRIX-B.md": strictValueFact("B", 20),
    "documentation/requirements/REQ-MATRIX-A.md": strictRequirement("A", 10),
    "documentation/requirements/REQ-MATRIX-B.md": strictRequirement("B", 20),
  };
}

function strictValueFact(suffix: string, value: number): string {
  return `---
id: FACT-MATRIX-${suffix}
title: Distribution parity quota ${suffix}
type: fact
status: active
fact_kind: property_value
subject_key: matrix.quota
property_key: limit
operator: eq
value_type: int
value_int: ${value}
---

Contradiction fixture value.
`;
}

function strictRequirement(suffix: string, value: number): string {
  return `---
id: REQ-MATRIX-${suffix}
title: Distribution parity contradiction ${suffix}
type: req
status: open
links:
  - type: constrains
    target: FACT-MATRIX-SUBJECT
  - type: requires_property
    target: FACT-MATRIX-${suffix}
---

Matrix quota must equal ${value}.
`;
}

function recentTelemetry(): readonly JsonRecord[] {
  const timestamp = (minutesBefore: number) =>
    new Date(Date.now() - minutesBefore * 60_000).toISOString();
  const events: JsonRecord[] = Array.from({ length: 20 }, (_, index) => ({
    timestamp: timestamp(40 - index),
    tool: "kb_status",
    status: "success",
    telemetry_status: "provided",
    telemetry: { is_autonomous: true },
    business_args: {},
  }));
  events.push({
    timestamp: timestamp(10),
    tool: "kb_upsert",
    status: "success",
    telemetry_status: "provided",
    telemetry: { is_autonomous: true },
    business_args: {
      type: "req",
      id: "REQ-MATRIX-TELEMETRY",
      properties: { title: "Unadvised write", status: "open" },
    },
  });
  return events;
}

async function seedSandbox(sandbox: TestSandbox): Promise<void> {
  await sandbox.initGitRepo();
  const initialized = await kibi(sandbox, ["init", "--no-hooks"]);
  assert.strictEqual(
    initialized.exitCode,
    0,
    `${initialized.stdout}${initialized.stderr}`,
  );
  for (const [relativePath, contents] of Object.entries(
    fixtureDocuments(sandbox),
  )) {
    const fullPath = join(sandbox.repoDir, relativePath);
    const directory = fullPath.slice(0, fullPath.lastIndexOf("/"));
    await import("node:fs/promises").then(({ mkdir }) =>
      mkdir(directory, { recursive: true }),
    );
    writeFileSync(fullPath, contents, "utf8");
    stageSourceFile(sandbox, relativePath);
  }
  const synced = await kibi(sandbox, ["sync"]);
  assert.strictEqual(synced.exitCode, 0, `${synced.stdout}${synced.stderr}`);
  writeFileSync(
    join(sandbox.repoDir, ".kb", "usage.log"),
    `${recentTelemetry()
      .map((event) => JSON.stringify(event))
      .join("\n")}\n`,
    "utf8",
  );
}

function coverageOutcome(value: JsonRecord, capability: string): unknown {
  const rows = value.rows as readonly JsonRecord[] | undefined;
  if (!rows) {
    throw new CapabilityUnavailableError("coverage rows are absent");
  }
  if (capability === "repair_plan") {
    const plan = value.repairPlan as JsonRecord | undefined;
    const batches = plan?.batches as readonly JsonRecord[] | undefined;
    if (!plan || !batches || plan.version !== "kibi.repair-plan.v1") {
      throw new CapabilityUnavailableError("kibi.repair-plan.v1 is absent");
    }
    return {
      version: plan.version,
      status: plan.status,
      phases: [...new Set(batches.map((batch) => batch.phase))],
      states: [...new Set(batches.map((batch) => batch.state))],
      readOnly: plan.readOnly,
      autoApplicable: batches.some((batch) => batch.autoApplicable === true),
    };
  }
  const row = rows.find((candidate) =>
    capability === "verification_receipts"
      ? candidate.id === "REQ-MATRIX-RECEIPT"
      : candidate.id === "REQ-MATRIX-INCOMPLETE",
  );
  assert.ok(row, `Coverage omitted fixture row for ${capability}.`);
  if (capability === "verification_receipts") {
    const stages = row.proofStages as JsonRecord | undefined;
    if (!stages?.passingE2e || !Array.isArray(row.proofGaps)) {
      throw new CapabilityUnavailableError(
        "verification receipt proof evidence is absent",
      );
    }
    return {
      receiptGaps: (row.proofGaps as readonly string[]).filter((gap) =>
        gap.includes("verification_receipt"),
      ),
      passingE2e: stages.passingE2e,
    };
  }
  if (typeof row.proofStatus !== "string" || !row.proofStages) {
    throw new CapabilityUnavailableError(
      "kibi.requirement-proof.v2 evidence is absent",
    );
  }
  return {
    proofStatus: row.proofStatus,
    proofGaps: row.proofGaps,
    stageStatuses: Object.fromEntries(
      Object.entries(row.proofStages as JsonRecord).map(([name, stage]) => [
        name,
        (stage as JsonRecord).status,
      ]),
    ),
  };
}

function semanticOutcome(value: JsonRecord): unknown {
  const outcome = {
    valid: value.valid,
    errorKinds: ((value.errors as readonly string[] | undefined) ?? []).map(
      (error) =>
        /Proposition-complete ingestion failed/.test(error)
          ? "proposition_complete_ingestion"
          : "other",
    ),
  };
  if (
    outcome.valid !== false ||
    !outcome.errorKinds.includes("proposition_complete_ingestion")
  ) {
    throw new CapabilityUnavailableError(
      "proposition-complete preflight rejection is absent",
    );
  }
  return outcome;
}

function contradictionOutcome(value: JsonRecord): unknown {
  const structured = unwrapResult(
    (value.structuredContent as JsonRecord | undefined) ?? value,
  );
  const violations =
    (structured.violations as readonly JsonRecord[] | undefined) ?? [];
  const witnesses = violations.flatMap((violation) => {
    const evidence = violation.evidence as JsonRecord | undefined;
    return (evidence?.witnesses as readonly JsonRecord[] | undefined) ?? [];
  });
  if (witnesses.length === 0) {
    throw new CapabilityUnavailableError(
      "source-bound contradiction witnesses are absent",
    );
  }
  return witnesses.map((witness) => ({
    kind: witness.kind,
    leftFact: (witness.left as JsonRecord).factId,
    rightFact: (witness.right as JsonRecord).factId,
  }));
}

function telemetryOutcome(value: JsonRecord, surface: DistributionSurface) {
  if (surface === "cli") {
    const acceptance = value.acceptance as JsonRecord | undefined;
    if (acceptance?.version !== "kibi.telemetry-acceptance.v1") {
      throw new CapabilityUnavailableError(
        "kibi.telemetry-acceptance.v1 is absent",
      );
    }
    return {
      version: acceptance.version,
      status: acceptance.status,
      metrics: (acceptance.metrics as readonly JsonRecord[]).map((metric) => ({
        id: metric.id,
        status: metric.status,
      })),
    };
  }
  const structured = unwrapResult(
    (value.structuredContent as JsonRecord | undefined) ?? value,
  );
  const diagnosticIds = (
    (structured.qualityDiagnostics as readonly JsonRecord[] | undefined) ?? []
  )
    .filter((diagnostic) => diagnostic.category === "telemetry")
    .map((diagnostic) => diagnostic.id)
    .sort();
  if (diagnosticIds.length === 0) {
    throw new CapabilityUnavailableError(
      "telemetry acceptance diagnostics are absent",
    );
  }
  return { diagnosticIds };
}

function capabilityInput(capability: RequirementCompilerCapability): {
  readonly tool: string;
  readonly route: string;
  readonly input: JsonRecord;
} {
  switch (capability) {
    case "semantic_inventory":
      return {
        tool: "kb_validate_upsert",
        route: "validate-upsert",
        input: {
          type: "req",
          id: "REQ-MATRIX-OMITTED",
          properties: {
            title: "Omitted semantic inventory",
            status: "open",
            text_ref: "The runtime must retain every proposition.",
          },
        },
      };
    case "contradiction_witnesses":
      return {
        tool: "kb_check",
        route: "check",
        input: { rules: ["domain-contradictions"] },
      };
    case "conservative_proof":
    case "repair_plan":
    case "verification_receipts":
      return {
        tool: "kb_coverage",
        route: "coverage",
        input: { by: "req", includePassing: true, limit: 100 },
      };
    case "verification_contract":
      return {
        tool: "kb_query",
        route: "query",
        input: { id: "TEST-MATRIX-RECEIPT" },
      };
    case "telemetry_acceptance":
      return { tool: "kb_check", route: "check", input: {} };
    default:
      throw new CapabilityUnavailableError(
        `capability ${String(capability)} is not supported by this fixture`,
      );
  }
}

function extractOutcome(
  capability: RequirementCompilerCapability,
  surface: DistributionSurface,
  value: JsonRecord,
): unknown {
  switch (capability) {
    case "semantic_inventory":
      return semanticOutcome(value);
    case "contradiction_witnesses":
      return contradictionOutcome(value);
    case "conservative_proof":
    case "repair_plan":
    case "verification_receipts":
      return coverageOutcome(value, capability);
    case "verification_contract": {
      const entity = (value.entities as readonly JsonRecord[] | undefined)?.[0];
      const contract = entity?.verification_contract as JsonRecord | undefined;
      if (
        !contract ||
        contract.version !== "kibi.verification-contract.v1" ||
        !Array.isArray(contract.required_projects)
      ) {
        throw new CapabilityUnavailableError(
          "kibi.verification-contract.v1 is absent",
        );
      }
      return {
        version: contract.version,
        runner: contract.runner,
        requiredProjects: contract.required_projects,
        requiredCaseCount:
          (contract.required_case_symbols as readonly unknown[])?.length ?? 0,
      };
    }
    case "telemetry_acceptance":
      return telemetryOutcome(value, surface);
    default:
      throw new CapabilityUnavailableError(
        `capability ${String(capability)} has no outcome extractor`,
      );
  }
}

async function classifyCapability(
  kind: DistributionRuntimeKind,
  task: () => Promise<unknown>,
): Promise<DistributionCapabilityResult> {
  try {
    return { state: "supported", outcome: await task() };
  } catch (error) {
    if (
      kind === "project_resolved" &&
      error instanceof CapabilityUnavailableError
    ) {
      return { state: "unsupported", detail: error.message };
    }
    throw error;
  }
}

function cliAdapter(
  id: string,
  kind: DistributionRuntimeKind,
  sandbox: TestSandbox,
  matrixApi: MatrixApi,
  project?: string,
  actions?: Partial<
    Record<RequirementCompilerCapability, DistributionParityAction>
  >,
): DistributionRuntimeAdapter {
  const provenance = matrixApi.resolveDistributionRuntimeProvenance(
    sandbox.kibiBin,
  );
  return {
    runtime: {
      id,
      kind,
      surface: "cli",
      ...(project === undefined ? {} : { project }),
      ...(actions === undefined ? {} : { actions }),
      provenance,
    },
    async execute(capability): Promise<DistributionCapabilityResult> {
      return classifyCapability(kind, async () => {
        if (capability === "telemetry_acceptance") {
          const result = await kibi(sandbox, [
            "usage-metrics",
            "--format",
            "json",
          ]);
          if (!result.stdout.trim()) {
            throw new CapabilityUnavailableError(
              result.stderr || "usage-metrics produced no JSON",
            );
          }
          return extractOutcome(
            capability,
            "cli",
            JSON.parse(result.stdout) as JsonRecord,
          );
        }
        const fixture = capabilityInput(capability);
        const result = await commandJson(sandbox, fixture.route, fixture.input);
        if (!result.value) {
          throw new CapabilityUnavailableError(
            result.stderr || `${fixture.route} produced no JSON`,
          );
        }
        return extractOutcome(capability, "cli", result.value);
      });
    },
  };
}

async function mcpAdapter(
  id: string,
  kind: DistributionRuntimeKind,
  sandbox: TestSandbox,
  matrixApi: MatrixApi,
  project?: string,
  actions?: Partial<
    Record<RequirementCompilerCapability, DistributionParityAction>
  >,
): Promise<{
  readonly adapter: DistributionRuntimeAdapter;
  readonly close: () => void;
}> {
  const process = startMcpServer(sandbox);
  await sendMcpRequest(process, 1, "initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "distribution-parity", version: "1.0.0" },
  });
  process.stdin?.write(
    `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`,
  );
  let requestId = 2;
  return {
    adapter: {
      runtime: {
        id,
        kind,
        surface: "mcp",
        ...(project === undefined ? {} : { project }),
        ...(actions === undefined ? {} : { actions }),
        provenance: matrixApi.resolveDistributionRuntimeProvenance(
          sandbox.kibiMcpBin,
        ),
      },
      async execute(capability): Promise<DistributionCapabilityResult> {
        return classifyCapability(kind, async () => {
          const fixture = capabilityInput(capability);
          const response = await sendMcpRequest(
            process,
            requestId++,
            "tools/call",
            {
              name: fixture.tool,
              arguments: fixture.input,
            },
          );
          if (response.error) {
            throw new CapabilityUnavailableError(
              JSON.stringify(response.error),
            );
          }
          const result = response.result as JsonRecord;
          const value = unwrapResult(
            (result.structuredContent as JsonRecord | undefined) ?? result,
          );
          return extractOutcome(capability, "mcp", value);
        });
      },
    },
    close: () => process.kill(),
  };
}

if (RUN_NODE_TEST_SUITE) {
  describe(
    "E2E: source and packed requirement-compiler distribution parity",
    { concurrency: false },
    () => {
      let tarballs: Tarballs;
      const sandboxes: TestSandbox[] = [];
      const closeServers: Array<() => void> = [];
      let hasProlog = false;
      let matrixApi: MatrixApi;

      before(
        async () => {
          hasProlog = checkPrologAvailable();
          if (!hasProlog) return;
          matrixApi = await import(
            pathToFileURL(
              join(
                REPO_ROOT,
                "packages/cli/dist/public/distribution-parity.js",
              ),
            ).href
          );
          tarballs = await packAll();
        },
        { timeout: 300_000 },
      );

      after(async () => {
        for (const close of closeServers) close();
        for (const sandbox of sandboxes) await sandbox.cleanup();
      });

      it(
        "matches all stable semantic outcomes through source and packed CLI/MCP",
        { timeout: 600_000 },
        async () => {
          if (!hasProlog) return;
          const sourceCli = asSourceSandbox(createSandbox());
          const packedCli = createSandbox();
          const sourceMcp = asSourceSandbox(createSandbox());
          const packedMcp = createSandbox();
          sandboxes.push(sourceCli, packedCli, sourceMcp, packedMcp);
          const auditConfigs = projectAuditConfigs();
          const projectSandboxes = auditConfigs.map((config) => ({
            config,
            cli: asProjectSandbox(createSandbox(), config, matrixApi),
            mcp: asProjectSandbox(createSandbox(), config, matrixApi),
          }));
          for (const project of projectSandboxes) {
            sandboxes.push(project.cli, project.mcp);
          }
          await packedCli.install(tarballs);
          await packedMcp.install(tarballs);
          for (const sandbox of sandboxes) await seedSandbox(sandbox);

          const sourceMcpAdapter = await mcpAdapter(
            "source-mcp",
            "source_checkout",
            sourceMcp,
            matrixApi,
          );
          const packedMcpAdapter = await mcpAdapter(
            "packed-mcp",
            "packed_artifact",
            packedMcp,
            matrixApi,
          );
          closeServers.push(sourceMcpAdapter.close, packedMcpAdapter.close);

          const adapters: DistributionRuntimeAdapter[] = [
            cliAdapter("source-cli", "source_checkout", sourceCli, matrixApi),
            cliAdapter("packed-cli", "packed_artifact", packedCli, matrixApi),
            sourceMcpAdapter.adapter,
            packedMcpAdapter.adapter,
          ];
          for (const project of projectSandboxes) {
            const resolvedMcp = await mcpAdapter(
              `${project.config.id}-mcp`,
              "project_resolved",
              project.mcp,
              matrixApi,
              project.config.id,
              project.config.actions,
            );
            closeServers.push(resolvedMcp.close);
            adapters.push(
              cliAdapter(
                `${project.config.id}-cli`,
                "project_resolved",
                project.cli,
                matrixApi,
                project.config.id,
                project.config.actions,
              ),
              resolvedMcp.adapter,
            );
          }

          const report = await matrixApi.runDistributionParityMatrix(adapters, {
            workspaceRoots: sandboxes.map((sandbox) => sandbox.repoDir),
          });

          const reportPath = process.env.KIBI_PARITY_REPORT_PATH;
          if (reportPath) {
            writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
          }

          assert.strictEqual(
            report.status,
            "passed",
            JSON.stringify(report.issues, null, 2),
          );
          assert.strictEqual(report.version, "kibi.distribution-parity.v1");
          assert.deepStrictEqual(
            report.capabilities,
            matrixApi.REQUIREMENT_COMPILER_CAPABILITIES,
          );
          assert.strictEqual(
            report.summary.observationCount,
            matrixApi.REQUIREMENT_COMPILER_CAPABILITIES.length *
              (4 + auditConfigs.length * 2),
          );
          assert.ok(
            report.rows
              .filter((row) => row.kind !== "project_resolved")
              .every((row) => row.comparison === "match"),
          );

          const sourceOutcome = (capability: RequirementCompilerCapability) =>
            report.rows.find(
              (row) =>
                row.runtimeId === "source-cli" && row.capability === capability,
            )?.normalizedOutcome as JsonRecord | readonly JsonRecord[];
          assert.deepStrictEqual(sourceOutcome("semantic_inventory"), {
            errorKinds: ["proposition_complete_ingestion"],
            valid: false,
          });
          assert.deepStrictEqual(sourceOutcome("contradiction_witnesses"), [
            {
              kind: "strict_property",
              leftFact: "FACT-MATRIX-A",
              rightFact: "FACT-MATRIX-B",
            },
          ]);
          assert.strictEqual(
            (sourceOutcome("conservative_proof") as JsonRecord).proofStatus,
            "missing",
          );
          assert.strictEqual(
            (sourceOutcome("repair_plan") as JsonRecord).version,
            "kibi.repair-plan.v1",
          );
          assert.ok(
            (
              (sourceOutcome("verification_receipts") as JsonRecord)
                .receiptGaps as readonly string[]
            ).includes("missing_verification_receipt"),
          );
          assert.strictEqual(
            (sourceOutcome("verification_contract") as JsonRecord).version,
            "kibi.verification-contract.v1",
          );
          assert.strictEqual(
            (sourceOutcome("telemetry_acceptance") as JsonRecord).status,
            "failed",
          );
        },
      );
    },
  );
}
