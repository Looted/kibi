import { existsSync } from "node:fs";
import {
  chmod,
  cp,
  mkdir,
  readFile,
  realpath,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
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
    external: [...EXTERNAL_RUNTIME_PACKAGES],
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

/**
 * Packages the bundled server loads at runtime with `require` instead of
 * importing statically, so `Bun.build` cannot inline them. Each entry names the
 * package and the source package whose dependency it is.
 */
const RUNTIME_REQUIRED_PACKAGES = [
  // Symbol extraction loads the TypeScript compiler on first use.
  { name: "ts-morph", from: "packages/plugin-builtin" },
  // The builtin plugin reads its own package.json for its version, and impact
  // review identifies the trusted source analyzer by that manifest. Bundled,
  // `../package.json` would resolve to the MCP server's manifest instead.
  { name: "kibi-plugin-builtin", from: "packages/cli" },
] as const;

/** Packages kept out of the bundle and loaded from the staged node_modules. */
const EXTERNAL_RUNTIME_PACKAGES = ["kibi-plugin-builtin"] as const;

function packageDirectory(name: string, fromDirectory: string): string {
  let directory = fromDirectory;
  for (;;) {
    const candidate = join(directory, "node_modules", name);
    if (existsSync(join(candidate, "package.json"))) return candidate;
    const parent = dirname(directory);
    if (parent === directory) {
      throw new RuntimePrerequisiteError("missing_runtime_package");
    }
    directory = parent;
  }
}

function manifestDependencies(manifest: unknown): readonly string[] {
  if (typeof manifest !== "object" || manifest === null) return [];
  const names = new Set<string>();
  for (const field of [
    "dependencies",
    "optionalDependencies",
    "peerDependencies",
  ] as const) {
    const entries = (manifest as Record<string, unknown>)[field];
    if (typeof entries !== "object" || entries === null) continue;
    for (const name of Object.keys(entries)) names.add(name);
  }
  return [...names];
}

/**
 * Copies a package and its installed dependency closure into the staged
 * `node_modules`, resolving each dependency from its real install location the
 * way Node would. A dependency is hoisted to the staged root unless another
 * version already occupies that name, in which case it is nested beside the
 * package that needs it. Optional and peer dependencies that are not installed
 * are skipped, as Node would fail to resolve them too.
 */
// implements REQ-skillopt-codex-optimization
export async function stageRuntimePackage(
  name: string,
  fromDirectory: string,
  stagedRoot: string,
): Promise<void> {
  const hoisted = new Map<string, string>();
  const stagedDestinations = new Set<string>();
  const visit = async (
    packageName: string,
    resolveFrom: string,
    parentDestination: string,
    required: boolean,
  ): Promise<void> => {
    let source: string;
    try {
      source = await realpath(packageDirectory(packageName, resolveFrom));
    } catch (error) {
      if (!required) return;
      throw error;
    }
    let destination: string;
    const occupant = hoisted.get(packageName);
    if (occupant === source) return;
    if (occupant === undefined) {
      hoisted.set(packageName, source);
      destination = join(stagedRoot, "node_modules", packageName);
    } else {
      destination = join(parentDestination, "node_modules", packageName);
    }
    if (stagedDestinations.has(destination)) return;
    stagedDestinations.add(destination);
    await cp(source, destination, {
      recursive: true,
      dereference: true,
      // Dependencies are staged explicitly below; never copy an install's own
      // nested node_modules or development links.
      filter: (path) =>
        !path.slice(source.length).split("/").includes("node_modules"),
    });
    const manifest: unknown = JSON.parse(
      await readFile(join(source, "package.json"), "utf8"),
    );
    const requiredDependencies = new Set(
      Object.keys(
        (manifest as { dependencies?: Record<string, unknown> }).dependencies ??
          {},
      ),
    );
    for (const dependency of manifestDependencies(manifest)) {
      await visit(
        dependency,
        source,
        destination,
        requiredDependencies.has(dependency),
      );
    }
  };
  await visit(name, fromDirectory, stagedRoot, true);
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
  for (const { name, from } of RUNTIME_REQUIRED_PACKAGES) {
    await stageRuntimePackage(name, resolve(sourceWorktree, from), stagedRoot);
  }
}

// implements REQ-skillopt-codex-optimization
export async function stageKibiMcpRuntime(
  workspace: Pick<IsolationWorkspace, "target" | "privateEvidence">,
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
  // kb_skills must serve the variant under evaluation, not the shipped text:
  // the cell assembles baseline or candidate bodies into .agents/skills first.
  const assembledSkills = resolve(workspace.target, ".agents/skills");
  if (existsSync(assembledSkills)) {
    await cp(assembledSkills, resolve(stagedRoot, "dist/skills"), {
      recursive: true,
      force: true,
    });
  }
  return {
    command: stagedCommand,
    args: [bundlePath, "--diagnostic-mode"],
    cwd: workspace.target,
    cliRoot: resolve(stagedRoot, "node_modules/kibi-cli"),
  };
}
