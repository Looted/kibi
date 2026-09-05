import { chmod, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { IsolationWorkspace } from "./isolation-workspace";
import { McpBrokerError } from "./mcp-broker";
import { type StagedMcpLaunch, stageKibiMcpRuntime } from "./staged-mcp";

export type StagedBrokerLaunch = Readonly<{
  command: string;
  args: readonly string[];
  cwd: string;
  bundlePath: string;
  tracePath: string;
  downstream: StagedMcpLaunch;
}>;

export type BrokerStageOptions = Readonly<{
  nodeCommand?: string;
}>;

// implements REQ-skillopt-codex-optimization
export async function stageKibiMcpBroker(
  workspace: IsolationWorkspace,
  sourceWorktree: string,
  options: BrokerStageOptions = {},
): Promise<StagedBrokerLaunch> {
  const runtimeRoot = resolve(workspace.target, ".runtime/mcp");
  const brokerRoot = resolve(runtimeRoot, "broker");
  const downstreamRoot = resolve(runtimeRoot, "kibi");
  await mkdir(brokerRoot, { recursive: true, mode: 0o700 });
  const downstream = await stageKibiMcpRuntime(workspace, sourceWorktree, {
    stagedRoot: downstreamRoot,
    ...(options.nodeCommand === undefined
      ? {}
      : { nodeCommand: options.nodeCommand }),
  });
  const tracePath = resolve(workspace.privateEvidence, "broker-trace.jsonl");
  const entryPath = resolve(brokerRoot, "entry.ts");
  const bundlePath = resolve(brokerRoot, "broker.js");
  const stagedPaths = [
    downstream.command,
    ...downstream.args,
    downstream.cwd,
    tracePath,
  ];
  const stagedPathTokens = stagedPaths.map(
    (_, index) => `__SKILLOPT_STAGED_PATH_${index}__`,
  );
  let nextPathToken = 0;
  const pathToken = (): string => {
    const token = stagedPathTokens[nextPathToken];
    if (token === undefined) throw new McpBrokerError("startup");
    nextPathToken += 1;
    return token;
  };
  const downstreamForBundle = {
    command: pathToken(),
    args: downstream.args.map(() => pathToken()),
    cwd: pathToken(),
  };
  const traceToken = pathToken();
  await writeFile(
    entryPath,
    `import { runMcpBroker } from ${JSON.stringify(fileURLToPath(new URL("./mcp-broker-process.ts", import.meta.url)))};\nawait runMcpBroker(${JSON.stringify({ downstream: downstreamForBundle, tracePath: traceToken, startupTimeoutMs: 15_000, toolTimeoutMs: 120_000, killGraceMs: 2_000 })});\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  const build = await Bun.build({
    entrypoints: [entryPath],
    outdir: brokerRoot,
    naming: "broker.js",
    target: "bun",
    format: "esm",
    packages: "bundle",
    minify: false,
    sourcemap: "none",
  });
  if (!build.success) throw new McpBrokerError("startup");
  const sourceRoots = new Set<string>([sourceWorktree, resolve(sourceWorktree)]);
  try {
    sourceRoots.add(await realpath(sourceWorktree));
  } catch {
    // Replacement still runs for the unresolved worktree path.
  }
  let bundled = await readFile(bundlePath, "utf8");
  for (const root of sourceRoots) {
    bundled = bundled.replaceAll(root, workspace.privateEvidence);
  }
  for (const [index, stagedPath] of stagedPaths.entries()) {
    bundled = bundled.replaceAll(stagedPathTokens[index] ?? "", stagedPath);
  }
  await writeFile(bundlePath, bundled, { encoding: "utf8", mode: 0o500 });
  const command = resolve(brokerRoot, "bun");
  await Bun.write(
    command,
    Bun.file(await realpath(options.nodeCommand ?? process.execPath)),
  );
  await chmod(command, 0o500);
  return {
    command,
    args: [bundlePath],
    cwd: workspace.target,
    bundlePath,
    tracePath,
    downstream,
  };
}
