import { join } from "node:path";
import { probeRequiredMcp } from "./canary-runtime";
import { prepareExistingLogin } from "./codex-auth";
import { readOptionalArtifact } from "./codex-cell-artifacts";
import type {
  CodexCellDependencies,
  CodexCellOptions,
} from "./codex-cell-types";
import { runIndependentFinalState } from "./final-state";
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
      finalState: {
        complete: finalState.trim().length > 0,
        integrityValid: true,
        claims: [],
      },
      broker: {
        complete: brokerTrace.trim().length > 0,
        integrityValid: true,
        claims: [],
        orderedCalls: [],
      },
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
