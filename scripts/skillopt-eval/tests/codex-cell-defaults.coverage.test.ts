import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { defaultCodexCellDependencies } from "../runtime/codex-cell-defaults";
import { evaluatorManifest } from "./fixtures/evaluator-authority-fixtures";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

function options(env: NodeJS.ProcessEnv = process.env) {
  return {
    request: {
      schemaVersion: "1.0.0" as const,
      artifactType: "episode-request" as const,
      episodeId: "00000000-0000-4000-8000-000000000011",
      runId: "00000000-0000-4000-8000-000000000012",
      runLockHash: "d".repeat(64),
      variant: "baseline" as const,
      skill: "kibi-usage" as const,
      taskId: "fake-task",
      attempt: 1,
      prompt: "Run the fixture task.",
      workspaceFixtureHash: "b".repeat(64),
    },
    fixtureRoot: "/tmp/fixture",
    sourceWorktree: process.cwd(),
    artifactRoot: "/tmp/artifacts",
    targetSkill: "kibi-usage" as const,
    codexExecutable: "/tmp/fake-codex",
    bwrapExecutable: "/tmp/fake-bwrap",
    env,
    finalStateRequests: [{ tool: "kb_status" as const, args: {} }],
    evaluatorManifest: evaluatorManifest("predicate"),
    hiddenMarkers: [],
    pricingHash: "0".repeat(64),
    priceAmount: 0,
    timeoutMs: 1_000,
  };
}

describe("defaultCodexCellDependencies", () => {
  test("builds owned and inherited runners and evaluates sealed evidence", async () => {
    const owned = defaultCodexCellDependencies(options());
    expect(owned.clock()).toBeInstanceOf(Date);
    const result = await owned.run(
      ["bash", "-c", "printf hi"],
      process.cwd(),
      process.env,
      2_000,
    );
    expect(result.stdout).toContain("hi");

    const inherited = defaultCodexCellDependencies(
      options({ ...process.env, KIBI_SKILLOPT_PROCESS_GROUP: "python_bridge" }),
    );
    const echo = await inherited.run(
      ["bash", "-c", "printf ok"],
      process.cwd(),
      process.env,
      2_000,
    );
    expect(echo.stdout).toContain("ok");

    const root = await mkdtemp(join(tmpdir(), "skillopt-cell-dep-"));
    roots.push(root);
    const workspace = {
      target: root,
      privateEvidence: join(root, "evidence"),
      cleanup: async () => undefined,
    };
    await writeFile(join(root, "usage.log"), "");
    const receipt = await owned.diagnosticReceipt(workspace as never);
    expect(receipt === undefined || typeof receipt === "string").toBe(true);

    const sealed = await owned.evaluateSealedEvidence({
      finalState: JSON.stringify({
        schemaVersion: "1.0.0",
        workspaceRoot: "/tmp",
        requests: [],
      }),
      brokerTrace: "",
      diagnosticReceipt: "",
    });
    expect(sealed.codex.complete).toBe(true);
  });
});
