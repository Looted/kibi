import { join } from "node:path";
import type { EvidenceClaim } from "../scoring/evidence-utils";
import { probeRequiredMcp } from "./canary-runtime";
import { prepareExistingLogin } from "./codex-auth";
import { readOptionalArtifact } from "./codex-cell-artifacts";
import type {
  CodexCellDependencies,
  CodexCellOptions,
} from "./codex-cell-types";
import { runIndependentFinalState } from "./final-state";
import { FinalStateReceiptSchema } from "./final-state";
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

function sealedFinalState(finalState: string) {
  const receipt = FinalStateReceiptSchema.parse(JSON.parse(finalState));
  return {
    complete: receipt.requests.length > 0,
    integrityValid: true,
    claims: receipt.requests.flatMap((request) =>
      scalarClaims(request.result, `final-state.${request.tool}`),
    ),
    snapshot: receipt,
  };
}

function traceCall(value: unknown, sequence: number) {
  if (value === null || typeof value !== "object") return [];
  const method = "method" in value ? value.method : undefined;
  const toolName = "toolName" in value ? value.toolName : undefined;
  return method === "tools/call" && typeof toolName === "string"
    ? [{ tool: toolName, predicate: `sequence=${sequence}` }]
    : [];
}

function sealedBroker(brokerTrace: string) {
  const calls = brokerTrace
    .split("\n")
    .filter((line) => line.length > 0)
    .flatMap((line, index) => {
      const value: unknown = JSON.parse(line);
      return traceCall(value, index + 1);
    });
  return {
    complete: brokerTrace.trim().length > 0,
    integrityValid: true,
    claims: [],
    orderedCalls: calls,
  };
}

// implements REQ-skillopt-codex-optimization
export function defaultCodexCellDependencies(
  options: CodexCellOptions,
): CodexCellDependencies {
  const run: CanaryRunner = (argv, cwd, env, timeoutMs, stdin) =>
    runBoundedProcess({ argv, cwd, env, timeoutMs, stdin });
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
    }) => ({
      finalState: sealedFinalState(finalState),
      broker: sealedBroker(brokerTrace),
      diagnostic: {
        complete: diagnosticReceipt.trim().length > 0,
        integrityValid: true,
        claims: [],
      },
      codex: { complete: true, integrityValid: true, claims: [] },
      isolation: { observedSentinels: [], violations: [] },
    }),
    clock: () => new Date(),
  };
}
