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
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../../");


/**
 * Run npm pack for all packages and return tarball paths
 * @returns {Promise<{core: string, cli: string, mcp: string}>}
 */
export async function packAll() {
  console.log("📦 Packing packages...");

  const packages = ["core", "cli", "mcp"];
  const tarballs = {};

  for (const pkg of packages) {
    const pkgDir = join(REPO_ROOT, "packages", pkg);
    console.log(`  Packing packages/${pkg}...`);

    const result = execFileSync("npm", ["pack", "--json"], {
      cwd: pkgDir,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    const packResult = JSON.parse(result);
    const filename = packResult[0].filename;
    tarballs[pkg] = join(pkgDir, filename);

    console.log(`    → ${filename}`);
  }

  return tarballs;
}

/**
 * Create a completely isolated test sandbox
 * @returns {TestSandbox}
 */
export function createSandbox() {
  const baseDir = mkdtempSync(join(tmpdir(), "kibi-e2e-"));

  // Create isolated directories
  const repoDir = join(baseDir, "repo");
  const npmPrefix = join(baseDir, "npm-prefix");
  const npmCache = join(baseDir, "npm-cache");
  const homeDir = join(baseDir, "home");

  mkdirSync(repoDir, { recursive: true });
  mkdirSync(join(npmPrefix, "bin"), { recursive: true });
  mkdirSync(join(npmPrefix, "lib"), { recursive: true });
  mkdirSync(npmCache, { recursive: true });
  mkdirSync(homeDir, { recursive: true });

  // Build isolated environment
  const env = {
    ...process.env,
    HOME: homeDir,
    USERPROFILE: homeDir, // Windows
    npm_config_prefix: npmPrefix,
    npm_config_cache: npmCache,
    npm_config_userconfig: join(baseDir, "npmrc"), // Empty config
    PATH: `${join(npmPrefix, "bin")}:${process.env.PATH}`,
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
  writeFileSync(env.GIT_CONFIG_GLOBAL, "", "utf8");

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
    baseDir,
    repoDir,
    npmPrefix,
    npmCache,
    homeDir,
    env,

    /**
     * Install packages from tarballs into this sandbox
     * @param {{core: string, cli: string, mcp: string}} tarballs
     */
    async install(tarballs) {
      console.log("📥 Installing packages into sandbox...");

      // Install kibi-core first (dependency of cli)
      await run(
        "npm",
        ["install", "-g", "--prefix", npmPrefix, tarballs.core],
        {
          cwd: baseDir,
          env,
        },
      );

      // Install kibi-cli
      await run("npm", ["install", "-g", "--prefix", npmPrefix, tarballs.cli], {
        cwd: baseDir,
        env,
      });

      // Install kibi-mcp
      await run("npm", ["install", "-g", "--prefix", npmPrefix, tarballs.mcp], {
        cwd: baseDir,
        env,
      });

      // Note: We use `node <bin>` to execute instead of relying on shebang/permissions
      // This avoids permission issues when npm installs as root in Docker
      console.log("  ✓ Packages installed");
    },


    /**
     * Initialize a git repository in the sandbox
     */
    async initGitRepo() {
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

    /**
     * Cleanup sandbox
     */
    async cleanup() {
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
 * Run a command with timeout and output capture
 * @param {string} cmd - Command to run
 * @param {string[]} args - Arguments
 * @param {{cwd: string, env: object, timeoutMs?: number}} options
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>}
 */
export function run(cmd, args, options = {}) {
  const { cwd, env, timeoutMs = 30000 } = options;

  return new Promise((resolve, reject) => {
    console.log(`  $ ${cmd} ${args.join(" ")}`);

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

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    child.on("close", (exitCode) => {
      clearTimeout(timeout);

      if (killed) {
        reject(new Error(`Command timed out after ${timeoutMs}ms`));
        return;
      }

      // Log output for debugging
      if (stdout) console.log("  stdout:", stdout.slice(0, 500));
      if (stderr) console.log("  stderr:", stderr.slice(0, 500));

      resolve({ stdout, stderr, exitCode: exitCode ?? 0 });
    });
  });
}

/**
 * Run kibi command in sandbox
 * @param {TestSandbox} sandbox
 * @param {string[]} args
 * @param {{timeoutMs?: number}} options
 */
export async function kibi(sandbox, args, options = {}) {
  // Use node to execute the bin file directly (bypass shebang permission issues in Docker)
  return run("node", [sandbox.kibiBin, ...args], {
    cwd: sandbox.repoDir,
    env: sandbox.env,
    timeoutMs: options.timeoutMs ?? 30000,
  });
}

/**
 * Run kibi-mcp command in sandbox
 * @param {TestSandbox} sandbox
 * @param {string[]} args
 * @param {{timeoutMs?: number}} options
 */
export async function kibiMcp(sandbox, args, options = {}) {
  // Use node to execute the bin file directly (bypass shebang permission issues in Docker)
  return run("node", [sandbox.kibiMcpBin, ...args], {
    cwd: sandbox.repoDir,
    env: sandbox.env,
    timeoutMs: options.timeoutMs ?? 30000,
  });
}

/**
 * Create a test markdown file with frontmatter
 * @param {TestSandbox} sandbox
 * @param {string} relativePath - Path relative to repo root (e.g., "requirements/req1.md")
 * @param {object} frontmatter
 * @param {string} content
 */
export function createMarkdownFile(
  sandbox,
  relativePath,
  frontmatter,
  content,
) {
  const fullPath = join(sandbox.repoDir, relativePath);
  mkdirSync(join(fullPath, ".."), { recursive: true });

  const fmLines = Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? `[${v.join(", ")}]` : v}`)
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
 * @param {string} filePath
 */
export function assertExecutable(filePath) {
  try {
    // Check file exists
    const stats = execFileSync("stat", ["-f", "%Lp", filePath], {
      encoding: "utf8",
    }).trim();
    const mode = Number.parseInt(stats, 8);
    const isExecutable = (mode & constants.S_IXUSR) !== 0;

    if (!isExecutable) {
      throw new Error(`File ${filePath} is not executable (mode: ${stats})`);
    }
  } catch (err) {
    throw new Error(
      `Failed to check executable status of ${filePath}: ${err.message}`,
    );
  }
}

/**
 * Check if Prolog is available in environment
 * @returns {boolean}
 */
export function checkPrologAvailable() {
  try {
    execFileSync("swipl", ["--version"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}
