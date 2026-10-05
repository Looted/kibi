import {
  chmod,
  cp,
  mkdir,
  readFile,
  realpath,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";
import { RuntimePrerequisiteError } from "./canary-errors";
import type { IsolationWorkspace } from "./isolation-workspace";

export type StagedMcpLaunch = Readonly<{
  command: string;
  args: readonly string[];
  cwd: string;
  /** Staged kibi-cli root: bin/kibi + node_modules for evaluator-owned setup. */
  readonly cliRoot?: string;
}>;

export type StagedMcpOptions = Readonly<{
  nodeCommand?: string;
  stagedRoot?: string;
}>;

const bundleCache = new Map<string, Promise<Uint8Array>>();

export function throwIfBundleFailed(success: boolean): void {
  if (!success) throw new RuntimePrerequisiteError("mcp_bundle_failed");
}

async function buildRuntimeBundle(
  sourceWorktree: string,
  privateRoot: string,
): Promise<Uint8Array> {
  const entryPath = resolve(privateRoot, "kibi-mcp-entry.ts");
  const outputRoot = resolve(privateRoot, "kibi-mcp-bundle");
  await writeFile(
    entryPath,
    `import { fileURLToPath } from "node:url";\nimport { startServer } from ${JSON.stringify(resolve(sourceWorktree, "packages/mcp/dist/server.js"))};\nprocess.env.KIBI_NODE_PATH = fileURLToPath(new URL("../node", import.meta.url));\nawait startServer();\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  const build = await Bun.build({
    entrypoints: [entryPath],
    outdir: outputRoot,
    naming: "server.js",
    target: "bun",
    format: "esm",
    packages: "bundle",
    minify: false,
    sourcemap: "none",
  });
  throwIfBundleFailed(build.success);
  return new Uint8Array(await readFile(resolve(outputRoot, "server.js")));
}

function runtimeBundle(
  sourceWorktree: string,
  privateRoot: string,
): Promise<Uint8Array> {
  const cached = bundleCache.get(sourceWorktree);
  if (cached !== undefined) return cached;
  const pending = buildRuntimeBundle(sourceWorktree, privateRoot);
  bundleCache.set(sourceWorktree, pending);
  return pending;
}

async function copyRuntimeResources(
  sourceWorktree: string,
  stagedRoot: string,
): Promise<void> {
  await Promise.all([
    cp(
      resolve(sourceWorktree, "packages/mcp/package.json"),
      resolve(stagedRoot, "package.json"),
    ),
    cp(
      resolve(sourceWorktree, "packages/cli/package.json"),
      resolve(stagedRoot, "node_modules/kibi-cli/package.json"),
    ),
    cp(
      resolve(sourceWorktree, "packages/cli/dist"),
      resolve(stagedRoot, "node_modules/kibi-cli/dist"),
      { recursive: true },
    ),
    cp(
      resolve(sourceWorktree, "packages/core/package.json"),
      resolve(stagedRoot, "node_modules/kibi-core/package.json"),
    ),
    cp(
      resolve(sourceWorktree, "packages/core/src"),
      resolve(stagedRoot, "node_modules/kibi-core/src"),
      { recursive: true },
    ),
    cp(
      resolve(sourceWorktree, "packages/core/schema"),
      resolve(stagedRoot, "node_modules/kibi-core/schema"),
      { recursive: true },
    ),
    // The staged CLI imports the resolver package by name; without it the
    // engine daemon cannot start. Platform packages are not staged, so the
    // evaluation runtime resolves swipl from PATH.
    cp(
      resolve(sourceWorktree, "packages/swipl/package.json"),
      resolve(stagedRoot, "node_modules/kibi-swipl/package.json"),
    ),
    cp(
      resolve(sourceWorktree, "packages/swipl/index.js"),
      resolve(stagedRoot, "node_modules/kibi-swipl/index.js"),
    ),
    cp(
      resolve(sourceWorktree, "packages/cli/dist/public/skills"),
      resolve(stagedRoot, "dist/skills"),
      { recursive: true },
    ),
  ]);
}

// implements REQ-skillopt-codex-optimization
export async function stageKibiMcpRuntime(
  workspace: IsolationWorkspace,
  sourceWorktree: string,
  options: StagedMcpOptions = {},
): Promise<StagedMcpLaunch> {
  const stagedRoot = resolve(
    options.stagedRoot ?? resolve(workspace.target, ".runtime/kibi-mcp"),
  );
  const bundlePath = resolve(stagedRoot, "dist/server.js");
  const stagedCommand = resolve(stagedRoot, "bun");
  const daemonNode = Bun.which("node");
  if (daemonNode === null) {
    throw new RuntimePrerequisiteError("missing_node_executable");
  }
  await Promise.all([
    mkdir(resolve(stagedRoot, "dist"), { recursive: true, mode: 0o700 }),
    mkdir(resolve(stagedRoot, "node_modules/kibi-cli"), {
      recursive: true,
      mode: 0o700,
    }),
    mkdir(resolve(stagedRoot, "node_modules/kibi-core"), {
      recursive: true,
      mode: 0o700,
    }),
  ]);
  await cp(
    await realpath(options.nodeCommand ?? process.execPath),
    stagedCommand,
  );
  await chmod(stagedCommand, 0o500);
  // MCP runs under Bun, but the Kibi engine daemon requires Node. Stage it
  // independently so the restricted runtime PATH needs no host installation.
  const stagedNode = resolve(stagedRoot, "node");
  await cp(await realpath(daemonNode), stagedNode);
  await chmod(stagedNode, 0o500);
  const sourceRoots = new Set<string>([
    sourceWorktree,
    resolve(sourceWorktree),
  ]);
  try {
    sourceRoots.add(await realpath(sourceWorktree));
  } catch {
    // Replacement still runs for the unresolved worktree path.
  }
  let bundled = new TextDecoder().decode(
    await runtimeBundle(sourceWorktree, workspace.privateEvidence),
  );
  for (const root of sourceRoots) {
    bundled = bundled.replaceAll(root, stagedRoot);
  }
  await writeFile(bundlePath, bundled, { encoding: "utf8", mode: 0o400 });
  await copyRuntimeResources(sourceWorktree, stagedRoot);
  return {
    command: stagedCommand,
    args: [bundlePath, "--diagnostic-mode"],
    cwd: workspace.target,
    cliRoot: resolve(stagedRoot, "node_modules/kibi-cli"),
  };
}
