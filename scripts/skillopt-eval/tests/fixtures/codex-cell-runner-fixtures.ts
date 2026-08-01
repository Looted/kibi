import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { EpisodeRequest } from "../../contracts/episode";
import { hashWorkspace } from "../../fixtures/workspace";
import type { IsolationWorkspace } from "../../runtime/isolation-workspace";
import type { StagedBrokerLaunch } from "../../runtime/mcp-broker-stage";
import type { CellReceipt } from "../../scoring/cell";
import {
  evaluatorEvidence,
  predicateSnapshot,
} from "./evaluator-authority-fixtures";

// executable_for TEST-skillopt-codex-optimization
export const roots: string[] = [];
export const SCORE: CellReceipt = {
  outcome: "pass",
  terminalCategory: null,
  score: 100,
  soft: 1,
  hard: 1,
  retryable: false,
  adoptionEligible: true,
  components: { finalState: 60, protocol: 25, isolation: 15 },
  criticalFailures: [],
  conflictKeys: [],
};
export const HAPPY_STDOUT = [
  JSON.stringify({ type: "thread.started", thread_id: "thread-fake" }),
  JSON.stringify({
    type: "turn.completed",
    usage: { input_tokens: 1, cached_input_tokens: 0, output_tokens: 1 },
  }),
].join("\n");
export async function cleanupRoots(): Promise<void> {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
}
export async function fixture(): Promise<
  Readonly<{ root: string; hash: string }>
> {
  const root = await mkdtemp(join(tmpdir(), "skillopt-cell-fixture-"));
  roots.push(root);
  await writeFile(join(root, "package.json"), '{"private":true}\n');
  return { root, hash: hashWorkspace(root) };
}
export function request(workspaceFixtureHash: string): EpisodeRequest {
  return {
    schemaVersion: "1.0.0",
    artifactType: "episode-request",
    episodeId: "00000000-0000-4000-8000-000000000011",
    runId: "00000000-0000-4000-8000-000000000012",
    runLockHash: "d".repeat(64),
    variant: "baseline",
    skill: "kibi-usage",
    taskId: "fake-task",
    attempt: 1,
    prompt: "Run the fixture task.",
    workspaceFixtureHash,
  };
}
export function fakeBroker(workspace: IsolationWorkspace): StagedBrokerLaunch {
  return {
    command: process.execPath,
    args: ["fake-broker.js"],
    cwd: workspace.target,
    bundlePath: join(workspace.privateEvidence, "fake-broker.js"),
    tracePath: join(workspace.privateEvidence, "broker-trace.jsonl"),
    downstream: {
      command: process.execPath,
      args: ["fake-mcp.js"],
      cwd: workspace.target,
    },
  };
}
export function predicateFinalState(): string {
  const snapshot = predicateSnapshot();
  return JSON.stringify({
    schemaVersion: "1.0.0",
    workspaceRoot: "/isolated/workspace",
    requests: [
      {
        tool: "kb_query",
        args: { type: "fact" },
        result: snapshot,
        resultHash: new Bun.CryptoHasher("sha256")
          .update(JSON.stringify(snapshot))
          .digest("hex"),
      },
    ],
  });
}
export function sealedEvidence(finalState: string) {
  const evidence = evaluatorEvidence(finalState);
  const { snapshot: _snapshot, ...sealedFinalState } = evidence.finalState;
  return { ...evidence, finalState: sealedFinalState };
}
