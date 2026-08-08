import { createHash } from "node:crypto";
import { join } from "node:path";
import type { EvidenceClaim } from "../scoring/evidence-utils";
import { probeRequiredMcp } from "./canary-runtime";
import { prepareExistingLogin } from "./codex-auth";
import { readOptionalArtifact } from "./codex-cell-artifacts";
import type {
  CodexCellDependencies,
  CodexCellOptions,
} from "./codex-cell-types";
import {
  type FinalStateReceipt,
  FinalStateReceiptSchema,
  runIndependentFinalState,
} from "./final-state";
import { parseTraceReceipts, verifyTraceChain } from "./jsonrpc";
import { stageKibiMcpBroker } from "./mcp-broker-stage";
import type { CanaryRunner } from "./permissions";
import { runBoundedProcess } from "./process";

function stringEnvironment(env: NodeJS.ProcessEnv): Record<string, string> {
  return Object.fromEntries(
    Object.entries(env).flatMap(([key, value]) =>
      value === undefined ? [] : [[key, value]],
    ),
  );
}

function scalarClaims(
  value: unknown,
  prefix: string,
): readonly EvidenceClaim[] {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return [{ key: prefix, value }];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      scalarClaims(entry, `${prefix}[${index}]`),
    );
  }
  if (typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, entry]) =>
    scalarClaims(entry, `${prefix}.${key}`),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function structuredContent(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  const content = value.structuredContent ?? value.structured_content;
  return isRecord(content) ? content : null;
}

function successfulResult(value: unknown): boolean {
  return !isRecord(value) || value.isError !== true;
}

function cleanCheckResult(value: unknown): boolean {
  const content = structuredContent(value);
  return (
    successfulResult(value) &&
    content?.count === 0 &&
    Array.isArray(content.violations) &&
    content.violations.length === 0
  );
}

function sameRequest(
  actual: FinalStateReceipt["requests"][number],
  expected: CodexCellOptions["finalStateRequests"][number],
): boolean {
  return (
    actual.tool === expected.tool &&
    JSON.stringify(actual.args) === JSON.stringify(expected.args)
  );
}

function referenceTargets(value: unknown): readonly string[] {
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap((entry) => {
    if (typeof entry !== "string") return [];
    return [
      entry.startsWith("kb:entity/") ? entry.slice("kb:entity/".length) : entry,
    ];
  });
}

// implements REQ-skillopt-logical-evidence-fidelity
function safeMutationComplete(
  receipt: FinalStateReceipt,
  taskId: string,
): boolean {
  if (!taskId.includes("-safe-mutation-direction-")) return true;
  const suffix = createHash("sha256")
    .update(taskId)
    .digest("hex")
    .slice(0, 12)
    .toUpperCase();
  const symbolId = `SYM-FIXTURE-${suffix}`;
  const requirementId = `REQ-FIXTURE-${suffix}`;
  const testId = `TEST-FIXTURE-${suffix}`;
  const query = receipt.requests.find(({ tool }) => tool === "kb_query");
  const entities = structuredContent(query?.result)?.entities;
  if (!Array.isArray(entities)) return false;
  const symbol = entities.find(
    (entity): entity is Record<string, unknown> =>
      isRecord(entity) && entity.id === symbolId && entity.type === "symbol",
  );
  return (
    symbol?.sourceFile === "src/fixture.ts" &&
    referenceTargets(symbol.implements).includes(requirementId) &&
    referenceTargets(symbol.covered_by).includes(testId)
  );
}

function sealedFinalState(
  finalState: string,
  options: Pick<CodexCellOptions, "evaluatorManifest" | "finalStateRequests">,
) {
  const receipt = FinalStateReceiptSchema.parse(JSON.parse(finalState));
  const integrityValid = receipt.requests.every(
    (request) =>
      createHash("sha256")
        .update(JSON.stringify(request.result))
        .digest("hex") === request.resultHash,
  );
  const complete =
    receipt.requests.length === options.finalStateRequests.length &&
    options.finalStateRequests.every((request, index) => {
      const actual = receipt.requests[index];
      return actual !== undefined && sameRequest(actual, request);
    });
  const taskComplete =
    complete &&
    receipt.requests.some(
      (request) =>
        request.tool === "kb_query" && successfulResult(request.result),
    ) &&
    receipt.requests.some(
      (request) =>
        request.tool === "kb_check" && cleanCheckResult(request.result),
    ) &&
    safeMutationComplete(receipt, options.evaluatorManifest.taskId);
  const evaluatorClaims = options.evaluatorManifest.expectedFinalState.flatMap(
    (assertion): readonly EvidenceClaim[] => {
      if (assertion.query.startsWith("state://")) {
        return [{ key: assertion.key, value: taskComplete }];
      }
      if (assertion.query === "workspace://isolation/sentinel-count") {
        return [{ key: assertion.key, value: 0 }];
      }
      return [];
    },
  );
  return {
    complete,
    integrityValid,
    claims: [
      ...receipt.requests.flatMap((request) =>
        scalarClaims(request.result, `final-state.${request.tool}`),
      ),
      ...evaluatorClaims,
    ],
    snapshot: finalState,
  };
}

function sealedBroker(brokerTrace: string) {
  const verification = verifyTraceChain(brokerTrace);
  const receipts = verification.valid ? parseTraceReceipts(brokerTrace) : [];
  const requestCalls = receipts
    .filter(
      (receipt) =>
        receipt.direction === "target_to_server" &&
        receipt.kind === "request" &&
        receipt.method === "tools/call" &&
        receipt.toolName !== undefined,
    )
    .map((receipt, index) => ({
      correlationId: receipt.correlationId,
      tool: receipt.toolName ?? "",
      predicate: `sequence=${index + 1}`,
    }));
  const successfulTools = requestCalls.flatMap((call) => {
    const completed = receipts.some((receipt) => {
      if (
        receipt.correlationId !== call.correlationId ||
        receipt.direction !== "server_to_target" ||
        receipt.kind !== "response" ||
        receipt.method !== "tools/call" ||
        receipt.toolName !== call.tool ||
        !isRecord(receipt.payload) ||
        !Object.hasOwn(receipt.payload, "result")
      ) {
        return false;
      }
      const result = receipt.payload.result;
      return !isRecord(result) || result.isError !== true;
    });
    return completed ? [call.tool] : [];
  });
  return {
    evidence: {
      // Completeness means the broker emitted a structurally verifiable trace.
      // Whether the model made required tool calls is behavioral protocol
      // evidence and is scored below; it is not an infrastructure property.
      complete: verification.entries > 0,
      integrityValid: verification.valid,
      claims: [],
      orderedCalls: requestCalls.map(({ tool, predicate }) => ({
        tool,
        predicate,
      })),
    },
    successfulTools,
  };
}

function sealedDiagnostic(
  diagnosticReceipt: string,
  successfulTools: readonly string[],
) {
  const lines = diagnosticReceipt
    .split("\n")
    .filter((line) => line.trim().length > 0);
  let integrityValid = true;
  const records: Record<string, unknown>[] = [];
  try {
    for (const line of lines) {
      const record: unknown = JSON.parse(line);
      if (!isRecord(record)) {
        integrityValid = false;
      } else {
        records.push(record);
      }
    }
  } catch {
    integrityValid = false;
  }
  const expectedTools = [...successfulTools].sort();
  const receiptTools = records
    .flatMap((record) =>
      typeof record.tool === "string" &&
      record.status === "success" &&
      Object.hasOwn(record, "telemetry") &&
      (record.telemetry === null || isRecord(record.telemetry))
        ? [record.tool]
        : [],
    )
    .sort();
  integrityValid &&=
    JSON.stringify(receiptTools) === JSON.stringify(expectedTools);
  return {
    // An empty receipt is the correct reconciliation for an empty multiset of
    // successful model-originated calls. Do not turn "model used no MCP tool"
    // into an infrastructure failure before the protocol rubric can score it.
    complete: lines.length > 0 || successfulTools.length === 0,
    integrityValid,
    claims: [] as readonly EvidenceClaim[],
  };
}

export function sealDefaultCellEvidence(
  options: Pick<CodexCellOptions, "evaluatorManifest" | "finalStateRequests">,
  evidence: Readonly<{
    finalState: string;
    brokerTrace: string;
    diagnosticReceipt: string;
  }>,
) {
  const broker = sealedBroker(evidence.brokerTrace);
  return {
    finalState: sealedFinalState(evidence.finalState, options),
    broker: broker.evidence,
    diagnostic: sealedDiagnostic(
      evidence.diagnosticReceipt,
      broker.successfulTools,
    ),
    codex: { complete: true, integrityValid: true, claims: [] },
    isolation: { observedSentinels: [], violations: [] },
  };
}

// implements REQ-skillopt-codex-optimization
export function defaultCodexCellDependencies(
  options: CodexCellOptions,
): CodexCellDependencies {
  const groupMode =
    options.env.KIBI_SKILLOPT_PROCESS_GROUP === "python_bridge"
      ? "inherited"
      : "owned";
  const run: CanaryRunner = (argv, cwd, env, timeoutMs, stdin) =>
    runBoundedProcess({ argv, cwd, env, timeoutMs, stdin, groupMode });
  return {
    prepareLogin: ({ privateCodexHome, sandboxHome, env }) =>
      prepareExistingLogin({
        privateCodexHome,
        sandboxHome,
        env,
        run: (argv, childEnv) =>
          runBoundedProcess({
            argv,
            cwd: options.sourceWorktree,
            env: childEnv,
            timeoutMs: 15_000,
            groupMode,
          }),
      }),
    stageBroker: stageKibiMcpBroker,
    probeMcp: probeRequiredMcp,
    run,
    finalState: async (context) => {
      const receipt = await runIndependentFinalState({
        launch: {
          ...context.broker.downstream,
          args: [...context.broker.downstream.args],
          env: {
            ...stringEnvironment(context.env),
            // Keep independent verifier calls out of the model's diagnostic
            // usage receipt.  The two lanes share a fixture workspace, but
            // their evidence must remain independently attributable.
            KIBI_MCP_DIAGNOSTIC_USAGE_LOG_PATH: join(
              context.workspace.privateEvidence,
              "final-state-usage.log",
            ),
          },
        },
        receiptPath: context.receiptPath,
        requests: context.requests,
        binding: {
          caseId: options.evaluatorManifest.taskId,
          roots: {
            publicManifestHash: options.evaluatorManifest.publicManifestHash,
            workspaceHash: options.evaluatorManifest.workspaceHash,
            fixtureSeedHash: options.evaluatorManifest.fixtureSeedHash,
          },
          sequence: 1,
        },
        timeoutMs: context.timeoutMs,
      });
      return `${JSON.stringify(receipt)}\n`;
    },
    diagnosticReceipt: (workspace) =>
      readOptionalArtifact(join(workspace.target, ".kb/usage.log")),
    evaluateSealedEvidence: async ({
      finalState,
      brokerTrace,
      diagnosticReceipt,
    }) =>
      sealDefaultCellEvidence(options, {
        finalState,
        brokerTrace,
        diagnosticReceipt,
      }),
    clock: () => new Date(),
  };
}
