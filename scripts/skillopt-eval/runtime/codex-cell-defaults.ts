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
    );
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
  const calls = receipts
    .filter(
      (receipt) =>
        receipt.direction === "target_to_server" &&
        receipt.kind === "request" &&
        receipt.method === "tools/call" &&
        receipt.toolName !== undefined,
    )
    .map((receipt, index) => ({
      tool: receipt.toolName ?? "",
      predicate: `sequence=${index + 1}`,
    }));
  return {
    complete: verification.entries > 0 && calls.length > 0,
    integrityValid: verification.valid,
    claims: [],
    orderedCalls: calls,
  };
}

function sealedDiagnostic(
  diagnosticReceipt: string,
  calls: readonly Readonly<{ tool: string }>[],
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
  const expectedTools = calls.map(({ tool }) => tool).sort();
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
    complete: lines.length > 0,
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
    broker,
    diagnostic: sealedDiagnostic(
      evidence.diagnosticReceipt,
      broker.orderedCalls,
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
          env: stringEnvironment(context.env),
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
