import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative } from "node:path";
import { type PreflightDependencies, runPreflight } from "../preflight";
import {
  RequiredMcpStartupError,
  RuntimePrerequisiteError,
} from "../runtime/canary-runtime";

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
  await writeFile(
    join(codexHome, "auth.json"),
    JSON.stringify({
      auth_mode: "chatgpt",
      tokens: { access_token: "session-token" },
    }),
    { mode: 0o600 },
  );
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
    mcp?: boolean;
    sandbox?: boolean;
    sourceIsolation?: boolean;
    doctorExit?: number;
  }>,
): PreflightDependencies {
  return {
    sourceClean: async () => options?.sourceClean ?? true,
    stageRuntime: async (workspace) => {
      if (options?.bwrap === false) {
        throw new RuntimePrerequisiteError("missing_bwrap");
      }
      return {
        schemaPath: join(workspace.privateEvidence, "schema.json"),
        codexCommand: "/staged/codex",
        bwrapExecutable: "/staged/codex-resources/bwrap",
        mcpServer: {
          command: "/bin/node",
          args: ["/source/packages/mcp/bin/kibi-mcp"],
          cwd: workspace.target,
          bundlePath: "/staged/mcp-broker/broker.js",
          tracePath: join(workspace.privateEvidence, "broker-trace.jsonl"),
          downstream: {
            command: "/staged/kibi-mcp/bun",
            args: ["/staged/kibi-mcp/server.js"],
            cwd: workspace.target,
          },
        },
      };
    },
    probeRequiredMcp: async () => {
      if (options?.mcp === false) {
        throw new RequiredMcpStartupError("connection_closed");
      }
      return { toolNames: ["kb_search", "kb_query", "kb_check"] };
    },
    probeSandbox: async (probeOptions) => {
      if (options?.sandbox === false) {
        throw new RuntimePrerequisiteError("sandbox_probe_failed");
      }
      if (options?.sourceIsolation === false && "probe" in probeOptions) {
        throw new RuntimePrerequisiteError("source_isolation_probe_failed");
      }
    },
    run: async (argv) => {
      const command = argv.join(" ");
      if (command === "/staged/codex --version") {
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
  test("characterizes source rejection before runtime staging", async () => {
    // Given
    const testFixture = await fixture();
    let staged = false;
    const deps = dependencies({ sourceClean: false });

    // When
    const receipt = await runPreflight(
      {
        runId: "preflight-characterization",
        sourceWorktree: testFixture.root,
        artifactRoot: testFixture.artifactRoot,
        env: testFixture.env,
      },
      {
        ...deps,
        stageRuntime: async (workspace, sourceWorktree) => {
          staged = true;
          return deps.stageRuntime(workspace, sourceWorktree);
        },
      },
    );

    // Then
    expect(receipt).toMatchObject({
      verdict: "no-go",
      reason: "source_not_clean",
      paidModelCalls: 0,
    });
    expect(staged).toBe(false);
  });

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

  test("fails closed for each runtime prerequisite before paid calls", async () => {
    // Given
    const testFixture = await fixture();
    const cases = [
      [dependencies({ bwrap: false }), "missing_isolation:bwrap"],
      [dependencies({ mcp: false }), "required_mcp_startup:connection_closed"],
      [dependencies({ sandbox: false }), "isolation_probe_failed"],
      [
        dependencies({ sourceIsolation: false }),
        "source_isolation_probe_failed",
      ],
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

  test("places the default preflight runtime outside the source worktree", async () => {
    // Given
    const testFixture = await fixture();
    let stagedRoot = "";
    const deps = dependencies();

    // When
    const receipt = await runPreflight(
      {
        runId: "external-preflight-runtime",
        sourceWorktree: testFixture.root,
        env: testFixture.env,
      },
      {
        ...deps,
        stageRuntime: async (workspace, sourceWorktree) => {
          stagedRoot = workspace.root;
          return deps.stageRuntime(workspace, sourceWorktree);
        },
      },
    );

    // Then
    const sourceRelative = relative(testFixture.root, stagedRoot);
    expect(receipt.verdict).toBe("pass");
    expect(
      sourceRelative === "" ||
        (!sourceRelative.startsWith("..") && !isAbsolute(sourceRelative)),
    ).toBe(false);
  });
});
