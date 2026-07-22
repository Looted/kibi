import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type PreflightDependencies, runPreflight } from "../preflight";

const temporaryRoots: string[] = [];

afterEach(async () => {
  for (const root of temporaryRoots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

async function fixture(): Promise<
  Readonly<{
    root: string;
    artifactRoot: string;
    env: NodeJS.ProcessEnv;
  }>
> {
  const root = await mkdtemp(join(tmpdir(), "skillopt-preflight-test-"));
  temporaryRoots.push(root);
  const codexHome = join(root, "real-codex");
  await mkdir(codexHome);
  await writeFile(join(codexHome, "auth.json"), "{}", { mode: 0o600 });
  return {
    root,
    artifactRoot: join(root, "artifacts"),
    env: { PATH: process.env.PATH, CODEX_HOME: codexHome },
  };
}

function dependencies(
  options?: Readonly<{
    sourceClean?: boolean;
    bwrap?: boolean;
    doctorExit?: number;
  }>,
): PreflightDependencies {
  return {
    executable: async () => options?.bwrap ?? true,
    sourceClean: async () => options?.sourceClean ?? true,
    run: async (argv) => {
      const command = argv.join(" ");
      if (command === "codex --version") {
        return {
          argv,
          stdout: "codex-cli 0.144.6\n",
          stderr: "",
          exitCode: 0,
          signal: null,
        };
      }
      if (command === "codex login status") {
        return {
          argv,
          stdout: "",
          stderr: "Logged in using ChatGPT\n",
          exitCode: 0,
          signal: null,
        };
      }
      return {
        argv,
        stdout: "{}\n",
        stderr: "",
        exitCode: options?.doctorExit ?? 0,
        signal: null,
      };
    },
  };
}

describe("SkillOpt Codex preflight", () => {
  test("passes without a paid call when login and strict config are usable", async () => {
    // Given
    const testFixture = await fixture();

    // When
    const receipt = await runPreflight(
      {
        runId: "preflight-pass",
        sourceWorktree: testFixture.root,
        artifactRoot: testFixture.artifactRoot,
        env: testFixture.env,
      },
      dependencies(),
    );

    // Then
    expect(receipt).toMatchObject({
      verdict: "pass",
      authMode: "file",
      bwrap: true,
      sourceClean: true,
      configValid: true,
      codexVersion: "codex-cli 0.144.6",
      paidModelCalls: 0,
    });
  });

  test("rejects provider credentials before config validation", async () => {
    // Given
    const testFixture = await fixture();

    // When
    const receipt = await runPreflight(
      {
        runId: "preflight-key-rejected",
        sourceWorktree: testFixture.root,
        artifactRoot: testFixture.artifactRoot,
        env: { ...testFixture.env, OPENAI_API_KEY: "forbidden" },
      },
      dependencies(),
    );

    // Then
    expect(receipt).toMatchObject({
      verdict: "no-go",
      reason: "codex_auth_forbidden_env",
      paidModelCalls: 0,
    });
  });

  test("fails closed for missing bwrap, dirty source, and invalid config", async () => {
    // Given
    const testFixture = await fixture();
    const cases = [
      [dependencies({ bwrap: false }), "missing_isolation:bwrap"],
      [dependencies({ sourceClean: false }), "source_not_clean"],
      [dependencies({ doctorExit: 1 }), "config_invalid"],
    ] as const;

    // When
    const receipts = await Promise.all(
      cases.map(([deps], index) =>
        runPreflight(
          {
            runId: `preflight-failure-${index}`,
            sourceWorktree: testFixture.root,
            artifactRoot: testFixture.artifactRoot,
            env: testFixture.env,
          },
          deps,
        ),
      ),
    );

    // Then
    expect(receipts.map((receipt) => receipt.reason)).toEqual(
      cases.map((entry) => entry[1]),
    );
  });
});
