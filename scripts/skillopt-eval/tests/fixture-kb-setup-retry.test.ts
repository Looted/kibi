import { describe, expect, test } from "bun:test";
import {
  FIXTURE_BRANCH,
  FixtureSetupError,
  fixtureCliEnv,
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

  test("stops after three exact timeout failures", async () => {
    let calls = 0;
    const error = await runCliWithRetry(
      async () => {
        calls += 1;
        return interactiveTimeout;
      },
      "import sync",
      { retryOnInteractivePrologTimeout: true, retryDelayMs: 0 },
    ).catch((caught: unknown) => caught);

    expect(calls).toBe(3);
    expect(error).toBeInstanceOf(FixtureSetupError);
    expect((error as Error).message).toBe(
      `import sync failed after 3 attempts: ${interactiveTimeout.stderr}`,
    );
  });

  test("pins workspace env so a parent KIBI_WORKSPACE cannot leak", () => {
    const previousWorkspace = process.env.KIBI_WORKSPACE;
    const previousRoot = process.env.KIBI_ROOT;
    process.env.KIBI_WORKSPACE = "/tmp/parent-kibi";
    process.env.KIBI_ROOT = "/tmp/parent-kibi";
    try {
      const env = fixtureCliEnv("/tmp/fixture-ws");
      expect(env.KIBI_WORKSPACE).toBe("/tmp/fixture-ws");
      expect(env.KIBI_PROJECT_ROOT).toBe("/tmp/fixture-ws");
      expect(env.KIBI_ROOT).toBe("/tmp/fixture-ws");
      expect(env.KIBI_BRANCH).toBe(FIXTURE_BRANCH);
    } finally {
      if (previousWorkspace === undefined) {
        Reflect.deleteProperty(process.env, "KIBI_WORKSPACE");
      } else {
        process.env.KIBI_WORKSPACE = previousWorkspace;
      }
      if (previousRoot === undefined) {
        Reflect.deleteProperty(process.env, "KIBI_ROOT");
      } else {
        process.env.KIBI_ROOT = previousRoot;
      }
    }
  });
});
