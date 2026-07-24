import { readBridgeRequest, writeBridgeResult } from "./runtime/file-bridge";

// implements REQ-skillopt-codex-optimization
function argument(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (value === undefined || value.length === 0) {
    throw new Error(`missing_${name.slice(2)}`);
  }
  return value;
}

const requestPath = argument("--request");
const resultPath = argument("--result");
if (!process.argv.includes("--fake")) {
  throw new Error("bridge_runner_not_configured");
}
const request = await readBridgeRequest(requestPath);
const result = {
  schemaVersion: "1.0.0" as const,
  artifactType: "skillopt-bridge-result" as const,
  runId: request.runId,
  batchId: request.batchId,
  requestHash: "0".repeat(64),
  rows: request.taskIds.map((id) => ({
    id,
    hard: 1 as const,
    soft: 1,
    status: "completed" as const,
    failureCategory: null,
    conversationPath: `predictions/${id}/conversation.json`,
    evidenceRefs: [`episode/${id}/receipt.json`],
  })),
  checkpoint: { maxSteps: 1, completedSteps: 1, nextStep: 2 },
};
await writeBridgeResult(resultPath, result, request);
