import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PreflightDependencies } from "../preflight";
import {
  RequiredMcpStartupError,
  RuntimePrerequisiteError,
} from "../runtime/canary-runtime";

export type LegacyPreflightFixture = Readonly<{
  root: string;
  artifactRoot: string;
  env: NodeJS.ProcessEnv;
}>;

export async function createLegacyPreflightFixture(): Promise<LegacyPreflightFixture> {
  const root = await mkdtemp(join(tmpdir(), "skillopt-preflight-test-"));
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

export function legacyPreflightDependencies(
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
      if (options?.bwrap === false)
        throw new RuntimePrerequisiteError("missing_bwrap");
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
      if (options?.mcp === false)
        throw new RequiredMcpStartupError("connection_closed");
      return { toolNames: ["kb_search", "kb_query", "kb_check"] };
    },
    probeSandbox: async (probeOptions) => {
      if (options?.sandbox === false)
        throw new RuntimePrerequisiteError("sandbox_probe_failed");
      if (options?.sourceIsolation === false && "probe" in probeOptions)
        throw new RuntimePrerequisiteError("source_isolation_probe_failed");
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
