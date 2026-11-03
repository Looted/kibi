import { afterEach, describe, expect, test } from "bun:test";
import {
  buildWhatIfAnalysisGoal,
  buildWhatIfContradictionGoal,
} from "../../../src/operations/mutation/contradictions.js";
import {
  acquireWorkspaceMutationLock,
  releaseWorkspaceMutationLock,
  withWorkspaceMutationLock,
} from "../../../src/operations/mutation/workspace-mutation-lock.js";
import { scratch } from "../helpers.js";

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

describe("buildWhatIfContradictionGoal", () => {
  test("stages the same entries as the analysis goal and asks for witnesses", () => {
    for (const inputs of [
      [],
      [
        {
          entity: { type: "req", id: "REQ-1" },
          relationships: [{ type: "verified_by", from: "REQ-1", to: "SCEN-1" }],
          relationshipsOnly: true,
        },
      ],
    ] as unknown as Parameters<typeof buildWhatIfContradictionGoal>[0][]) {
      const analysis = buildWhatIfAnalysisGoal(inputs);
      expect(buildWhatIfContradictionGoal(inputs)).toBe(
        analysis.replace(
          "call(checks:what_if_analysis_json(",
          "call(checks:what_if_contradiction_witnesses_json(",
        ),
      );
    }
  });
});

describe("withWorkspaceMutationLock", () => {
  test("returns the operation's result and releases the lock", async () => {
    const workspace = scratch();
    cleanups.push(workspace.cleanup);
    expect(
      await withWorkspaceMutationLock(workspace.root, async () => "done"),
    ).toBe("done");
    releaseWorkspaceMutationLock(
      await acquireWorkspaceMutationLock(workspace.root),
    );
  });

  test("rethrows the operation's failure and still releases the lock", async () => {
    const workspace = scratch();
    cleanups.push(workspace.cleanup);
    const failure = new Error("operation failed");
    await expect(
      withWorkspaceMutationLock(workspace.root, async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);
    releaseWorkspaceMutationLock(
      await acquireWorkspaceMutationLock(workspace.root),
    );
  });
});
