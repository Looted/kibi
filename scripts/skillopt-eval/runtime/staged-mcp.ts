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
}>;

const bundleCache = new Map<string, Promise<Uint8Array>>();

async function buildRuntimeBundle(
  sourceWorktree: string,
  privateRoot: string,
): Promise<Uint8Array> {
  const entryPath = resolve(privateRoot, "kibi-mcp-entry.ts");
  const outputRoot = resolve(privateRoot, "kibi-mcp-bundle");
  await writeFile(
    entryPath,
    `import { startServer } from ${JSON.stringify(resolve(sourceWorktree, "packages/mcp/dist/server.js"))};\nawait startServer();\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  const build = await Bun.build({
    entrypoints: [entryPath],
    outdir: outputRoot,
    naming: "server.js",
    target: "bun",
    format: "esm",
    minify: false,
    sourcemap: "none",
  });
  if (!build.success) {
    throw new RuntimePrerequisiteError("mcp_bundle_failed");
  }
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
  nodeCommand = process.execPath,
): Promise<StagedMcpLaunch> {
  const stagedRoot = resolve(workspace.target, ".runtime/kibi-mcp");
  const bundlePath = resolve(stagedRoot, "dist/server.js");
  const stagedCommand = resolve(stagedRoot, "bun");
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
  await cp(await realpath(nodeCommand), stagedCommand);
  await chmod(stagedCommand, 0o500);
  await writeFile(
    bundlePath,
    new TextDecoder()
      .decode(await runtimeBundle(sourceWorktree, workspace.privateEvidence))
      .replaceAll(sourceWorktree, stagedRoot),
    { encoding: "utf8", mode: 0o400 },
  );
  await copyRuntimeResources(sourceWorktree, stagedRoot);
  return {
    command: stagedCommand,
    args: [bundlePath],
    cwd: workspace.target,
  };
}
