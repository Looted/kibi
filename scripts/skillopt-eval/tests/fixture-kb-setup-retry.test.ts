import { describe, expect, test } from "bun:test";
import {
  FixtureSetupError,
  runCliWithRetry,
} from "../runtime/fixture-kb-setup";

const interactiveTimeout = {
  ok: false,
  stdout: "",
  stderr:
    "Failed to upsert entity REQ-SETUP-BASE: Query timeout after 120s (stage=unknown, pid=1234, killed=no, exitCode=null, goal=kb_assert_entity)",
};

describe("fixture CLI retry", () => {
  test("retries an exact interactive entity timeout and succeeds", async () => {
    let calls = 0;
    const stdout = await runCliWithRetry(
      async () => {
        calls += 1;
        return calls === 1
          ? interactiveTimeout
          : { ok: true, stdout: "imported", stderr: "" };
      },
      "import sync",
      { retryOnInteractivePrologTimeout: true, retryDelayMs: 0 },
    );

    expect(calls).toBe(2);
    expect(stdout).toBe("imported");
  });

  test("does not retry an unrelated failure", async () => {
    let calls = 0;
    const error = await runCliWithRetry(
      async () => {
        calls += 1;
        return {
          ok: false,
          stdout: "",
          stderr:
            "Query timeout after 120s (stage=unknown, pid=1234, killed=no, exitCode=null, goal=kb_commit_upsert)",
        };
      },
      "import sync",
      { retryOnInteractivePrologTimeout: true, retryDelayMs: 0 },
    ).catch((caught: unknown) => caught);

    expect(calls).toBe(1);
    expect(error).toBeInstanceOf(FixtureSetupError);
    expect((error as Error).message).toBe(
      "import sync failed: Query timeout after 120s (stage=unknown, pid=1234, killed=no, exitCode=null, goal=kb_commit_upsert)",
    );
  });

  test("stops after two exact timeout failures", async () => {
    let calls = 0;
    const error = await runCliWithRetry(
      async () => {
        calls += 1;
        return interactiveTimeout;
      },
      "import sync",
      { retryOnInteractivePrologTimeout: true, retryDelayMs: 0 },
    ).catch((caught: unknown) => caught);

    expect(calls).toBe(2);
    expect(error).toBeInstanceOf(FixtureSetupError);
    expect((error as Error).message).toBe(
      `import sync failed after 2 attempts: ${interactiveTimeout.stderr}`,
    );
  });
});
