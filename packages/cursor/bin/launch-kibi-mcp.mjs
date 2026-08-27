#!/usr/bin/env node

/**
 * Consumer-side entrypoint for Cursor's MCP process launcher.
 */

/**
 * Launch the kibi-mcp package installed by the consumer project.
 *
 * Cursor starts plugin MCP commands with the plugin directory as their cwd.
 * This adapter deliberately knows nothing about the Kibi source tree: it only
 * resolves a consumer workspace, finds that workspace's kibi-mcp package, and
 * runs its declared bin with the consumer as both cwd and KIBI_WORKSPACE.
 */

import { spawn } from "node:child_process";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_NAME = "kibi-mcp";
const PLACEHOLDER_PATTERN = /\$\{[^}]+\}/;
const SIGNAL_EXIT_CODES = {
  SIGHUP: 129,
  SIGINT: 130,
  SIGTERM: 143,
  SIGBREAK: 148,
};

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function isDirectory(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function isPlaceholder(value) {
  return PLACEHOLDER_PATTERN.test(value.trim());
}

function normalizeWorkspacePath(value, baseDirectory) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed || isPlaceholder(trimmed)) return null;
  const candidate = isAbsolute(trimmed)
    ? trimmed
    : resolve(baseDirectory, trimmed);
  return isDirectory(candidate) ? resolve(candidate) : null;
}

/**
 * Cursor has used both a platform-delimited string and a JSON-like list for
 * workspace-folder environment values. Accept both without treating a
 * literal unresolved placeholder as a path relative to the plugin directory.
 */
export function parseWorkspaceFolderPaths(value) {
  if (typeof value !== "string" || !value.trim()) return [];
  const trimmed = value.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => typeof item === "string");
      }
    } catch {
      // Fall through to the platform-delimited form.
    }
  }

  const separator = process.platform === "win32" ? ";" : ":";
  const separated = trimmed.split(separator);
  const values =
    separated.length === 1 && trimmed.includes(",")
      ? trimmed.split(",")
      : separated;
  return values
    .flatMap((item) =>
      process.platform === "win32" ? item.split(",") : [item],
    )
    .map((item) => item.trim())
    .filter(Boolean);
}

function packageJsonForResolvedFile(startPath) {
  let current = resolve(startPath);
  try {
    if (!statSync(current).isDirectory()) current = dirname(current);
  } catch {
    current = dirname(current);
  }

  while (true) {
    const packageJsonPath = join(current, "package.json");
    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = readJson(packageJsonPath);
        if (packageJson.name === PACKAGE_NAME) {
          return { packageJsonPath, packageRoot: current, packageJson };
        }
      } catch {
        // Keep walking if a parent package manifest is malformed.
      }
    }
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function isWithinRoot(rootPath, candidatePath) {
  const relativePath = relative(resolve(rootPath), resolve(candidatePath));
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !isAbsolute(relativePath))
  );
}

function hasConsumerNodeModulesLink(workspaceRoot, packageRoot) {
  try {
    const linkPath = join(workspaceRoot, "node_modules", PACKAGE_NAME);
    const linkedRoot = realpathSync(linkPath);
    return (
      isWithinRoot(linkedRoot, packageRoot) ||
      isWithinRoot(packageRoot, linkedRoot)
    );
  } catch {
    return false;
  }
}

function isProjectScopedPackage(workspaceRoot, packageRoot) {
  if (isWithinRoot(workspaceRoot, packageRoot)) return true;

  // pnpm can expose a package through a symlink whose realpath is outside the
  // workspace. Require that the consumer's node_modules entry points to it;
  // this rejects arbitrary NODE_PATH/global packages while retaining that
  // package-manager layout. Yarn PnP has no node_modules entry, so only its
  // active resolver hook may authorize an out-of-tree package.
  return (
    hasConsumerNodeModulesLink(workspaceRoot, packageRoot) ||
    Boolean(process.versions.pnp)
  );
}

/**
 * Resolve the consumer's package through Node's project-scoped resolver. This
 * works with npm, pnpm, Yarn, and Bun layouts, unlike a hard-coded .bin path.
 */
export function resolveProjectLocalMcp(workspaceRoot) {
  const root = resolve(workspaceRoot);
  const consumerRequire = createRequire(join(root, "package.json"));
  let packageInfo;

  try {
    packageInfo = packageJsonForResolvedFile(
      consumerRequire.resolve(`${PACKAGE_NAME}/package.json`),
    );
  } catch {
    try {
      packageInfo = packageJsonForResolvedFile(
        consumerRequire.resolve(PACKAGE_NAME),
      );
    } catch {
      packageInfo = null;
    }
  }

  if (!packageInfo) {
    throw new Error(
      `[KIBI-CURSOR] No project-local ${PACKAGE_NAME} package was found for ${root}. ` +
        `Install it in that workspace (for example: npm install --save-dev ${PACKAGE_NAME}) and reload Cursor.`,
    );
  }

  if (!isProjectScopedPackage(root, packageInfo.packageRoot)) {
    throw new Error(
      `[KIBI-CURSOR] Resolved ${PACKAGE_NAME} outside the consumer workspace: ${packageInfo.packageRoot}. Install it in ${root}; global, plugin-local, and ambient NODE_PATH packages are not supported.`,
    );
  }

  const declaredBin = packageInfo.packageJson.bin;
  const binEntry =
    typeof declaredBin === "string"
      ? declaredBin
      : declaredBin && typeof declaredBin === "object"
        ? declaredBin[PACKAGE_NAME]
        : undefined;
  if (typeof binEntry !== "string" || !binEntry) {
    throw new Error(
      `[KIBI-CURSOR] Project-local ${PACKAGE_NAME} does not declare a ${PACKAGE_NAME} executable.`,
    );
  }

  const binPath = resolve(packageInfo.packageRoot, binEntry);
  if (!existsSync(binPath)) {
    throw new Error(
      `[KIBI-CURSOR] Project-local ${PACKAGE_NAME} declares a missing executable: ${binPath}. Reinstall the workspace dependency and reload Cursor.`,
    );
  }

  return {
    packageRoot: packageInfo.packageRoot,
    packageJsonPath: packageInfo.packageJsonPath,
    packageJson: packageInfo.packageJson,
    binPath,
  };
}

function hasDeclaredProjectDependency(workspaceRoot) {
  const packageJsonPath = join(workspaceRoot, "package.json");
  if (!existsSync(packageJsonPath)) return false;
  try {
    const packageJson = readJson(packageJsonPath);
    return [
      packageJson.dependencies,
      packageJson.devDependencies,
      packageJson.optionalDependencies,
      packageJson.peerDependencies,
    ].some((dependencies) =>
      Boolean(
        dependencies &&
          typeof dependencies === "object" &&
          dependencies[PACKAGE_NAME],
      ),
    );
  } catch {
    return false;
  }
}

function isDemonstrablyProjectWorkspace(workspaceRoot) {
  return (
    existsSync(join(workspaceRoot, ".git")) ||
    existsSync(join(workspaceRoot, ".kb")) ||
    hasDeclaredProjectDependency(workspaceRoot)
  );
}

function usableWorkspaceCandidates(values, baseDirectory) {
  return values
    .map((value) => normalizeWorkspacePath(value, baseDirectory))
    .filter((value, index, all) => value && all.indexOf(value) === index)
    .filter((value) => {
      try {
        resolveProjectLocalMcp(value);
        return true;
      } catch {
        return false;
      }
    });
}

function chooseSingleWorkspace(candidates, source) {
  if (candidates.length > 1) {
    throw new Error(
      `[KIBI-CURSOR] ${source} names multiple workspaces with project-local ${PACKAGE_NAME}: ${candidates.join(", ")}. Open a single-root workspace or set KIBI_WORKSPACE to one root.`,
    );
  }
  return candidates[0];
}

/** Resolve the consumer workspace without ever defaulting to the plugin root. */
export function resolveWorkspaceRoot(explicitWorkspace, options = {}) {
  const cwd = resolve(options.cwd ?? process.cwd());
  const env = options.env ?? process.env;

  if (typeof explicitWorkspace === "string" && explicitWorkspace.trim()) {
    const explicit = normalizeWorkspacePath(explicitWorkspace, cwd);
    // Cursor can leave ${workspaceFolder} unresolved. It is invalid, so allow
    // the environment fallbacks below rather than resolving it under cwd.
    if (explicit) return explicit;
  }

  const folderCandidates = chooseSingleWorkspace(
    usableWorkspaceCandidates(
      parseWorkspaceFolderPaths(env.WORKSPACE_FOLDER_PATHS),
      cwd,
    ),
    "WORKSPACE_FOLDER_PATHS",
  );
  if (folderCandidates) return folderCandidates;

  for (const name of ["KIBI_WORKSPACE", "CURSOR_WORKSPACE"]) {
    const candidate = chooseSingleWorkspace(
      usableWorkspaceCandidates([env[name]], cwd),
      name,
    );
    if (candidate) return candidate;
  }

  // A plugin installation is commonly the current cwd. Only use it when
  // project markers make it demonstrably a consumer project and its local
  // package can be resolved; never use an ambient/plugin-local package merely
  // because it happens to be on disk.
  if (isDemonstrablyProjectWorkspace(cwd)) {
    try {
      resolveProjectLocalMcp(cwd);
      return cwd;
    } catch {
      // Continue to the actionable error below.
    }
  }

  throw new Error(
    `[KIBI-CURSOR] Unable to determine a consumer workspace. Cursor must provide \${workspaceFolder}, WORKSPACE_FOLDER_PATHS, KIBI_WORKSPACE, or CURSOR_WORKSPACE; the selected workspace must contain project-local ${PACKAGE_NAME}.`,
  );
}

function signalExitCode(signal) {
  return SIGNAL_EXIT_CODES[signal] ?? 1;
}

/** Spawn the project-local MCP server and mirror its transport and exit state. */
export function launchKibiMcp(argv = process.argv.slice(2), env = process.env) {
  const [explicitWorkspace, ...childArgs] = argv;
  let workspaceRoot;
  let projectLocal;
  try {
    workspaceRoot = resolveWorkspaceRoot(explicitWorkspace, {
      cwd: process.cwd(),
      env,
    });
    projectLocal = resolveProjectLocalMcp(workspaceRoot);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    return Promise.resolve(1);
  }

  const child = spawn(process.execPath, [projectLocal.binPath, ...childArgs], {
    cwd: workspaceRoot,
    env: { ...env, KIBI_WORKSPACE: workspaceRoot },
    stdio: ["inherit", "inherit", "inherit"],
  });

  return new Promise((resolveExit) => {
    let finished = false;
    const signalHandlers = new Map();
    const finish = (exitCode) => {
      if (finished) return;
      finished = true;
      for (const [signal, handler] of signalHandlers) {
        process.removeListener(signal, handler);
      }
      resolveExit(exitCode);
    };

    for (const signal of ["SIGHUP", "SIGINT", "SIGTERM", "SIGBREAK"]) {
      if (process.platform === "win32" && signal !== "SIGBREAK") continue;
      const handler = () => {
        if (!child.killed) child.kill(signal);
      };
      signalHandlers.set(signal, handler);
      process.once(signal, handler);
    }

    child.once("error", (error) => {
      process.stderr.write(
        `[KIBI-CURSOR] Failed to start project-local ${PACKAGE_NAME}: ${error.message}\n`,
      );
      finish(1);
    });
    child.once("close", (code, signal) => {
      finish(signal ? signalExitCode(signal) : (code ?? 1));
    });
  });
}

const entrypoint = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (entrypoint === resolve(fileURLToPath(import.meta.url))) {
  const exitCode = await launchKibiMcp(process.argv.slice(2));
  process.exitCode = exitCode;
}
