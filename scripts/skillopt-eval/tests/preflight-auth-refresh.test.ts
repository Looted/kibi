import { expect, test } from "bun:test";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { runPreflight } from "../preflight";
import {
  createLegacyPreflightFixture,
  legacyPreflightDependencies,
} from "./preflight-legacy-fixture";

test("persists a synthetic refreshed auth file after preflight probes", async () => {
  const testFixture = await createLegacyPreflightFixture();
  try {
    const refreshed = JSON.stringify({
      auth_mode: "chatgpt",
      tokens: {
        access_token: "refreshed-session-token",
        refresh_token: "refresh-2",
      },
    });
    const deps = legacyPreflightDependencies();
    const receipt = await runPreflight(
      {
        runId: "preflight-auth-refresh",
        sourceWorktree: testFixture.root,
        artifactRoot: testFixture.artifactRoot,
        env: testFixture.env,
      },
      {
        ...deps,
        run: async (argv, cwd, childEnv, timeoutMs, stdin) => {
          if (argv[0] === "/staged/codex" && argv[1] === "--strict-config") {
            const privateCodexHome = childEnv.CODEX_HOME;
            if (privateCodexHome === undefined)
              throw new Error("missing private CODEX_HOME");
            await writeFile(join(privateCodexHome, "auth.json"), refreshed, {
              mode: 0o600,
            });
          }
          return deps.run(argv, cwd, childEnv, timeoutMs, stdin);
        },
      },
    );

    expect(receipt.verdict).toBe("pass");
    expect(
      await readFile(join(testFixture.root, "real-codex", "auth.json"), "utf8"),
    ).toBe(refreshed);
  } finally {
    await rm(testFixture.root, { recursive: true, force: true });
  }
});
