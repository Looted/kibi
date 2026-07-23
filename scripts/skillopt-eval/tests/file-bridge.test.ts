import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BridgeRequestSchema,
  BridgeResultSchema,
  BridgeVisibilityError,
  FileBridge,
  readBridgeResult,
  writeBridgeRequest,
  writeBridgeResult,
} from "../runtime/file-bridge";

const HASH = "a".repeat(64);
const REQUEST = {
  schemaVersion: "1.0.0",
  artifactType: "skillopt-bridge-request",
  runId: "00000000-0000-4000-8000-000000000081",
  batchId: "batch-001",
  skill: "kibi-usage",
  phase: "train",
  candidateBody: "Use Kibi through MCP.",
  taskIds: ["usage-train-1"],
  sourceLockHash: HASH,
} as const;
const RESULT = {
  schemaVersion: "1.0.0",
  artifactType: "skillopt-bridge-result",
  runId: REQUEST.runId,
  batchId: REQUEST.batchId,
  requestHash: "" as string,
  rows: [
    {
      id: "usage-train-1",
      hard: 1,
      soft: 1,
      status: "completed",
      failureCategory: null,
      conversationPath: "predictions/usage-train-1/conversation.json",
      evidenceRefs: ["episode/usage-train-1/receipt.json"],
    },
  ],
  checkpoint: { maxSteps: 1, completedSteps: 1, nextStep: 2 },
} as const;

describe("versioned SkillOpt file bridge", () => {
  test("writes atomically and verifies the request hash", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-bridge-test-"));
    try {
      const requestPath = join(root, "request.json");
      const resultPath = join(root, "result.json");
      const request = BridgeRequestSchema.parse(REQUEST);
      await writeBridgeRequest(requestPath, request);
      const resultInput = BridgeResultSchema.parse({
        ...RESULT,
        requestHash: "b".repeat(64),
      });
      const requestHash = await writeBridgeResult(
        resultPath,
        resultInput,
        request,
      );
      expect(requestHash).toHaveLength(64);
      const readResult = await readBridgeResult(resultPath, request);
      expect(BridgeResultSchema.parse(readResult).rows[0]?.hard).toBe(1);
      expect(await readFile(requestPath, "utf8")).toContain(
        "skillopt-bridge-request",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("rejects a held-out task and hidden-root file access", async () => {
    expect(() =>
      BridgeRequestSchema.parse({ ...REQUEST, phase: "held-out" }),
    ).toThrow();
    const bridge = new FileBridge("/tmp/public-bridge", "/tmp/private-bridge");
    expect(() => bridge.resolve("../private.json", "public")).toThrow(
      BridgeVisibilityError,
    );
  });
});
