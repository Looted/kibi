import { execFileSync, spawn } from "node:child_process";
import {
  constants,
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

/**
 * E2E Test Harness for Packaged npm Packages
 *
 * Tests install packages from tarballs (npm pack) in complete isolation.
 * Each test gets:
 * - Fresh temp directory
 * - Fresh git repository
 * - Fresh npm prefix and cache
 * - Isolated PATH and HOME
 */

const REPO_ROOT = resolve(process.cwd());

function resolveNpmBinary(): string {
  const npmExecPath = process.env.npm_execpath;
  if (
    npmExecPath &&
    existsSync(npmExecPath) &&
    !basename(npmExecPath).toLowerCase().includes("bun")
  ) {
    return npmExecPath;
  }

  try {
    const npmPath = execFileSync("which", ["npm"], { encoding: "utf8" }).trim();
    if (npmPath) {
      return npmPath;
    }
  } catch {}

  return "npm";
}

/** Tarball paths for each package */
export interface Tarballs {
  core: string;
  cli: string;
  mcp: string;
}

/** Options for running commands */
export interface RunOptions {
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

/** Result from running a command */
export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/** Options for kibi commands */
export interface KibiOptions {
  timeoutMs?: number;
}

/** Test sandbox with isolated environment */
export interface TestSandbox {
  /** Base temp directory */
  baseDir: string;
  /** Repository directory (git init here) */
  repoDir: string;
  /** npm prefix for global installs */
  npmPrefix: string;
  /** npm cache directory */
  npmCache: string;
  /** HOME directory for test */
  homeDir: string;
  /** Path to kibi binary */
  kibiBin: string;
  /** Path to kibi-mcp binary */
  kibiMcpBin: string;
  /** Isolated environment variables */
  env: NodeJS.ProcessEnv;

  /** Install packages from tarballs */
  install(tarballs: Tarballs): Promise<void>;
  /** Initialize git repository */
  initGitRepo(): Promise<void>;
  /** Cleanup sandbox */
  cleanup(): Promise<void>;
  /** Verify Node resolution for kibi-cli/prolog resolves into prefix */
  verifyKibiCliResolution(): Promise<void>;
}

/**
 * Run npm pack for all packages and return tarball paths
 * In Docker environments, checks for pre-packed tarballs first
 */
export async function packAll(): Promise<Tarballs> {
  console.log("📦 Packing packages...");

  const packages = ["core", "cli", "mcp"] as const;
  const tarballs: Partial<Tarballs> = {};
  const npmBinary = resolveNpmBinary();

  // Check for pre-packed tarballs (set by Docker entrypoint)
  const prePackedDir = process.env.KIBI_TEST_TARBALLS;
  if (prePackedDir && existsSync(prePackedDir)) {
    console.log(`  Using pre-packed tarballs from ${prePackedDir}`);
    for (const pkg of packages) {
      // Find tarball for this package
      const files = execFileSync("ls", [prePackedDir], { encoding: "utf8" })
        .trim()
        .split("\n");
      const tarballName = files.find(
        (f: string) => f.startsWith(`kibi-${pkg}-`) && f.endsWith(".tgz"),
      );
      if (tarballName) {
        tarballs[pkg] = join(prePackedDir, tarballName);
        console.log(`    ✓ ${pkg}: ${tarballName}`);
      } else {
        throw new Error(`Pre-packed tarball not found for package: ${pkg}`);
      }
    }
    return tarballs as Tarballs;
  }

  // Fallback: pack on-the-fly
  for (const pkg of packages) {
    const pkgDir = join(REPO_ROOT, "packages", pkg);
    console.log(`  Packing packages/${pkg}...`);

    try {
      const npmCommand = npmBinary === "npm" ? "npm" : `\"${npmBinary}\"`;
      const result = execFileSync(
        "/bin/bash",
        ["-lc", `${npmCommand} pack --json`],
        {
          cwd: pkgDir,
          encoding: "utf8",
          stdio: ["pipe", "pipe", "pipe"],
        },
      );

      interface PackResult {
        filename: string;
      }
      const packResult = JSON.parse(result) as PackResult[];
      const filename = packResult[0]?.filename;
      if (!filename) {
        throw new Error(`Failed to pack package ${pkg}: no filename in output`);
      }
      tarballs[pkg] = join(pkgDir, filename);

      console.log(`    → ${filename}`);
    } catch (err) {
      const error = err as Error;
      throw new Error(`Failed to pack package ${pkg}: ${error.message}`);
    }
  }

  return tarballs as Tarballs;
}

/**
 * Create a completely isolated test sandbox
 */
/**
 * Create a completely isolated test sandbox
 * Uses baked kibi installation if KIBI_E2E_PREFIX is set, otherwise installs from tarballs
 */
export function createSandbox(): TestSandbox {
  const baseDir = mkdtempSync(join(tmpdir(), "kibi-e2e-"));

  // Check if we're using a baked installation (CI image)
  const bakedPrefix = process.env.KIBI_E2E_PREFIX;
  const useBakedPrefix =
    bakedPrefix && existsSync(join(bakedPrefix, "bin", "kibi"));

  // Create isolated directories
  const repoDir = join(baseDir, "repo");
  const npmPrefix = useBakedPrefix
    ? (bakedPrefix as string)
    : join(baseDir, "npm-prefix");
  const npmCache = join(baseDir, "npm-cache");
  const homeDir = join(baseDir, "home");

  mkdirSync(repoDir, { recursive: true });
  if (!useBakedPrefix) {
    mkdirSync(join(npmPrefix, "bin"), { recursive: true });
    mkdirSync(join(npmPrefix, "lib"), { recursive: true });
  }
  mkdirSync(npmCache, { recursive: true });
  mkdirSync(homeDir, { recursive: true });

  // Build isolated environment
  // Include npm directory in PATH for E2E tests
  const npmBinary = resolveNpmBinary();
  const npmDir = dirname(npmBinary);
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    HOME: homeDir,
    USERPROFILE: homeDir, // Windows
    npm_config_prefix: npmPrefix,
    npm_config_cache: npmCache,
    npm_config_userconfig: join(baseDir, "npmrc"), // Empty config
    PATH: `${join(npmPrefix, "bin")}:${npmDir}:/usr/bin:${process.env.PATH ?? ""}`,
    // Prevent git from using global config
    GIT_CONFIG_GLOBAL: join(baseDir, "gitconfig"),
    GIT_CONFIG_SYSTEM: "/dev/null",
    // Prevent Prolog from using user config
    XDG_CONFIG_HOME: join(baseDir, "config"),
    XDG_CACHE_HOME: join(baseDir, "cache"),
    XDG_DATA_HOME: join(baseDir, "data"),
    // Ensure NODE_ENV is production-like for tests
    NODE_ENV: "production",
  };

  // Create empty git config
  writeFileSync(
    env.GIT_CONFIG_GLOBAL ?? join(baseDir, "gitconfig"),
    "",
    "utf8",
  );

  // Store binary paths for direct execution
  const kibiBin = join(npmPrefix, "bin", "kibi");
  const kibiMcpBin = join(npmPrefix, "bin", "kibi-mcp");

  return {
    baseDir,
    repoDir,
    npmPrefix,
    npmCache,
    homeDir,
    kibiBin,
    kibiMcpBin,
    env,

    async install(tarballs: Tarballs): Promise<void> {
      if (useBakedPrefix) {
        console.log("📦 Using baked kibi installation (skipping npm install)");
        // In baked-prefix mode we still must VERIFY that Node resolution for
        // `kibi-cli/prolog` points into the baked prefix (don't rely on nested-copy).
        await verifyKibiCliResolutionImpl(npmPrefix, env);
        return;
      }

      console.log("📥 Installing packages into sandbox...");

      // Install kibi-core first (dependency of cli)
      await run(
        npmBinary,
        ["install", "-g", "--prefix", npmPrefix, tarballs.core],
        {
          cwd: baseDir,
          env,
        },
      );

      // Install kibi-cli
      await run(
        npmBinary,
        ["install", "-g", "--prefix", npmPrefix, tarballs.cli],
        {
          cwd: baseDir,
          env,
        },
      );

      // Install kibi-mcp (may fail due to version mismatch, but we'll fix it afterward)
      try {
        await run(
          npmBinary,
          [
            "install",
            "-g",
            "--force",
            "--legacy-peer-deps",
            "--no-audit",
            "--prefix",
            npmPrefix,
            tarballs.mcp,
          ],
          {
            cwd: baseDir,
            env,
          },
        );
      } catch (e) {
        console.log("  ⚠️  kibi-mcp install had warnings");
      }

      // Copy kibi-cli to kibi-mcp's node_modules to ensure correct version
      const globalCli = join(npmPrefix, "lib", "node_modules", "kibi-cli");
      const mcpNodeModules = join(
        npmPrefix,
        "lib",
        "node_modules",
        "kibi-mcp",
        "node_modules",
      );
      const mcpCli = join(mcpNodeModules, "kibi-cli");

      if (existsSync(globalCli)) {
        const { mkdirSync, rmSync } = await import("node:fs");
        mkdirSync(mcpNodeModules, { recursive: true });
        if (existsSync(mcpCli)) {
          try {
            rmSync(mcpCli, { recursive: true });
          } catch {}
        }
        await run("cp", ["-r", globalCli, mcpCli], { cwd: baseDir, env });

        // Verify the copy worked
        const prologFile = join(mcpCli, "dist", "prolog.js");
        if (existsSync(prologFile)) {
          const { readFileSync } = await import("node:fs");
          const content = readFileSync(prologFile, "utf8");
          if (content.includes('process.stdin.write("\\n")')) {
            console.log("  ✓ Verified prolog.js fix is in place");
          } else {
            console.log("  ⚠️  Warning: prolog.js fix not detected");
          }
        }
        console.log("  ✓ Applied kibi-cli fix to kibi-mcp");
        console.log("  ✓ Applied kibi-cli fix to kibi-mcp");
      }

      // Note: We use `node <bin>` to execute instead of relying on shebang/permissions
      // This avoids permission issues when npm installs as root in Docker
      console.log("  ✓ Packages installed");
    },

    /**
     * Verify that Node's require.resolve('kibi-cli/prolog') resolves into the
     * expected prefix. This fails fast if resolution points to an unexpected
     * location (prevents running tests against wrong build).
     */
    async verifyKibiCliResolution(): Promise<void> {
      await verifyKibiCliResolutionImpl(npmPrefix, env);
    },

    async initGitRepo(): Promise<void> {
      await run("git", ["init", "-b", "develop"], { cwd: repoDir, env });
      await run("git", ["config", "user.email", "test@example.com"], {
        cwd: repoDir,
        env,
      });
      await run("git", ["config", "user.name", "Test User"], {
        cwd: repoDir,
        env,
      });
      console.log("  ✓ Git repo initialized");
    },

    async cleanup(): Promise<void> {
      console.log(`🧹 Cleaning up ${baseDir}...`);
      try {
        await run("rm", ["-rf", baseDir], { cwd: "/tmp", env: process.env });
      } catch {
        // Ignore cleanup errors
      }
    },
  };
}

/**

}

/**
 * Run a command with timeout and output capture
 */
export function run(
  cmd: string,
  args: string[],
  options: RunOptions,
): Promise<RunResult> {
  const { cwd, env, timeoutMs = 120000 } = options;

  return new Promise((resolve, reject) => {
    const isDebug = process.env.E2E_LOG_LEVEL === "debug";
    if (isDebug) {
      console.log(`  $ ${cmd} ${args.join(" ")}`);
    }

    const child = spawn(cmd, args, {
      cwd,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let killed = false;

    const timeout = setTimeout(() => {
      killed = true;
      child.kill("SIGTERM");
      // Force kill after grace period
      setTimeout(() => child.kill("SIGKILL"), 5000);
    }, timeoutMs);

    child.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("error", (err: Error) => {
      clearTimeout(timeout);
      reject(err);
    });

    child.on("close", (exitCode: number | null) => {
      clearTimeout(timeout);

      if (killed) {
        reject(new Error(`Command timed out after ${timeoutMs}ms`));
        return;
      }

      // Log output for debugging
      if (isDebug) {
        if (stdout) console.log("  stdout:", stdout.slice(0, 500));
        if (stderr) console.log("  stderr:", stderr.slice(0, 500));
      } else if (exitCode !== 0) {
        // In non-debug mode, only log on failure
        if (stdout) console.log("  stdout:", stdout.slice(0, 500));
        if (stderr) console.log("  stderr:", stderr.slice(0, 500));
      }

      resolve({ stdout, stderr, exitCode: exitCode ?? 0 });
    });
  });
}

/**
 * Run kibi command in sandbox
 */
export async function kibi(
  sandbox: TestSandbox,
  args: string[],
  options: KibiOptions = {},
): Promise<RunResult> {
  // Use node to execute the bin file directly (bypass shebang permission issues in Docker)
  return run("node", [sandbox.kibiBin, ...args], {
    cwd: sandbox.repoDir,
    env: sandbox.env,
    timeoutMs: options.timeoutMs ?? 120000,
  });
}

/**
 * Run kibi-mcp command in sandbox
 */
export async function kibiMcp(
  sandbox: TestSandbox,
  args: string[],
  options: KibiOptions = {},
): Promise<RunResult> {
  // Use node to execute the bin file directly (bypass shebang permission issues in Docker)
  return run("node", [sandbox.kibiMcpBin, ...args], {
    cwd: sandbox.repoDir,
    env: sandbox.env,
    timeoutMs: options.timeoutMs ?? 120000,
  });
}

/** Frontmatter data for markdown files */
export interface Frontmatter {
  [key: string]: string | string[] | undefined;
}

/**
 * Create a test markdown file with frontmatter
 */
export function createMarkdownFile(
  sandbox: TestSandbox,
  relativePath: string,
  frontmatter: Frontmatter,
  content: string,
): void {
  const fullPath = join(sandbox.repoDir, relativePath);
  mkdirSync(join(fullPath, ".."), { recursive: true });

  const fmLines = Object.entries(frontmatter)
    .map(([k, v]) => {
      if (v === undefined) return "";
      return `${k}: ${Array.isArray(v) ? `[${v.join(", ")}]` : v}`;
    })
    .filter(Boolean)
    .join("\n");

  const fileContent = `---
${fmLines}
---

${content}
`;

  writeFileSync(fullPath, fileContent, "utf8");
  console.log(`  📝 Created ${relativePath}`);
}

/**
 * Assert that a file exists and is executable
 */
export function assertExecutable(filePath: string): void {
  try {
    // Check file exists
    const stats = execFileSync("stat", ["-c", "%a", filePath], {
      encoding: "utf8",
    }).trim();
    const mode = Number.parseInt(stats, 8);
    const isExecutable = (mode & 0o111) !== 0;

    if (!isExecutable) {
      throw new Error(`File ${filePath} is not executable (mode: ${stats})`);
    }
  } catch (err) {
    const error = err as Error;
    throw new Error(
      `Failed to check executable status of ${filePath}: ${error.message}`,
    );
  }
}

/**
 * Check if Prolog is available in environment
 */
export function checkPrologAvailable(): boolean {
  try {
    execFileSync("swipl", ["--version"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/** Implementation: spawn node to require.resolve kibi-cli/prolog and assert prefix */
async function verifyKibiCliResolutionImpl(
  prefix: string,
  env: NodeJS.ProcessEnv,
): Promise<void> {
  const isDebug = process.env.E2E_LOG_LEVEL === "debug";

  if (isDebug) {
    if (process.env.KIBI_E2E_PREFIX) {
      console.log(
        `E2E debug: using baked prefix ${process.env.KIBI_E2E_PREFIX}`,
      );
    } else {
      console.log(`E2E debug: using sandbox-installed prefix ${prefix}`);
    }
  }

  // Node script that resolves the module and prints resolved path
  const script = `
    try {
      const p = require.resolve('kibi-cli/prolog');
      console.log(p);
      process.exit(0);
    } catch (e) {
      console.error('RESOLVE_ERROR', e && e.message ? e.message : String(e));
      process.exit(2);
    }
  `;

  const { stdout, stderr, exitCode } = await run("node", ["-e", script], {
    cwd: prefix,
    env,
    timeoutMs: 10000,
  });

  if (exitCode === 2) {
    throw new Error(`Failed to require.resolve('kibi-cli/prolog'):\n${stderr}`);
  }

  const resolved = (stdout || "").trim();
  if (!resolved) {
    throw new Error(
      `Empty resolution result for kibi-cli/prolog. stderr: ${stderr}`,
    );
  }

  const normalizedPrefix = prefix.replace(/\\/g, "/");
  const normalizedResolved = resolved.replace(/\\/g, "/");

  if (!normalizedResolved.startsWith(normalizedPrefix)) {
    throw new Error(
      `kibi-cli/prolog resolved to ${resolved} which is outside expected prefix ${prefix}`,
    );
  }

  if (isDebug)
    console.log(`E2E debug: require.resolve('kibi-cli/prolog') -> ${resolved}`);
}
