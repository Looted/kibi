import { execSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import * as path from "node:path";

interface DoctorCheck {
  name: string;
  check: () => { passed: boolean; message: string; remediation?: string };
}

export async function doctorCommand(): Promise<void> {
  const checks: DoctorCheck[] = [
    {
      name: "SWI-Prolog",
      check: checkSWIProlog,
    },
    {
      name: ".kb/ directory",
      check: checkKbDirectory,
    },
    {
      name: "config.json",
      check: checkConfigJson,
    },
    {
      name: "Git repository",
      check: checkGitRepository,
    },
    {
      name: "Git hooks",
      check: checkGitHooks,
    },
  ];

  console.log("Kibi Environment Diagnostics\n");

  let allPassed = true;

  for (const { name, check } of checks) {
    const result = check();
    const status = result.passed ? "✓" : "✗";
    console.log(`${status} ${name}: ${result.message}`);

    if (!result.passed) {
      allPassed = false;
      if (result.remediation) {
        console.log(`  → ${result.remediation}`);
      }
    }
  }

  console.log();

  if (allPassed) {
    console.log("All checks passed! Your environment is ready.");
    process.exit(0);
  } else {
    console.log("Some checks failed. Please address the issues above.");
    process.exit(1);
  }
}

function checkSWIProlog(): {
  passed: boolean;
  message: string;
  remediation?: string;
} {
  try {
    const output = execSync("swipl --version", { encoding: "utf-8" });
    const versionMatch = output.match(/version\s+(\d+)\.(\d+)/i);

    if (!versionMatch) {
      return {
        passed: false,
        message: "Unable to parse version",
        remediation: "Reinstall SWI-Prolog from https://www.swi-prolog.org/",
      };
    }

    const major = Number.parseInt(versionMatch[1], 10);

    if (major < 9) {
      return {
        passed: false,
        message: `Version ${major}.x found (requires ≥9.0)`,
        remediation:
          "Upgrade SWI-Prolog to version 9.0 or higher from https://www.swi-prolog.org/",
      };
    }

    return {
      passed: true,
      message: `Version ${versionMatch[0]} installed`,
    };
  } catch (error) {
    return {
      passed: false,
      message: "Not installed or not in PATH",
      remediation:
        "Install SWI-Prolog from https://www.swi-prolog.org/ and add to PATH",
    };
  }
}

function checkKbDirectory(): {
  passed: boolean;
  message: string;
  remediation?: string;
} {
  const kbDir = path.join(process.cwd(), ".kb");

  if (!existsSync(kbDir)) {
    return {
      passed: false,
      message: "Not found",
      remediation: "Run: kibi init",
    };
  }

  return {
    passed: true,
    message: "Found",
  };
}

function checkConfigJson(): {
  passed: boolean;
  message: string;
  remediation?: string;
} {
  const configPath = path.join(process.cwd(), ".kb/config.json");

  if (!existsSync(configPath)) {
    return {
      passed: false,
      message: "Not found",
      remediation: "Run: kibi init",
    };
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    JSON.parse(content);

    return {
      passed: true,
      message: "Valid JSON",
    };
  } catch (error) {
    return {
      passed: false,
      message: "Invalid JSON",
      remediation: "Fix .kb/config.json syntax or run: kibi init",
    };
  }
}

function checkGitRepository(): {
  passed: boolean;
  message: string;
  remediation?: string;
} {
  try {
    execSync("git status", { stdio: "pipe", cwd: process.cwd() });

    return {
      passed: true,
      message: "Found",
    };
  } catch (error) {
    return {
      passed: false,
      message: "Not a git repository",
      remediation: "Run: git init",
    };
  }
}

function checkGitHooks(): {
  passed: boolean;
  message: string;
  remediation?: string;
} {
  const postCheckoutPath = path.join(process.cwd(), ".git/hooks/post-checkout");
  const postMergePath = path.join(process.cwd(), ".git/hooks/post-merge");

  const postCheckoutExists = existsSync(postCheckoutPath);
  const postMergeExists = existsSync(postMergePath);

  if (!postCheckoutExists && !postMergeExists) {
    return {
      passed: true,
      message: "Not installed (optional)",
    };
  }

  if (postCheckoutExists && postMergeExists) {
    try {
      const checkoutStats = statSync(postCheckoutPath);
      const mergeStats = statSync(postMergePath);

      const checkoutExecutable = (checkoutStats.mode & 0o111) !== 0;
      const mergeExecutable = (mergeStats.mode & 0o111) !== 0;

      if (checkoutExecutable && mergeExecutable) {
        return {
          passed: true,
          message: "Installed and executable",
        };
      }
      return {
        passed: false,
        message: "Installed but not executable",
        remediation:
          "Run: chmod +x .git/hooks/post-checkout .git/hooks/post-merge",
      };
    } catch (error) {
      return {
        passed: false,
        message: "Unable to check hook permissions",
      };
    }
  }

  return {
    passed: false,
    message: "Partially installed",
    remediation: "Run: kibi init --hooks",
  };
}
