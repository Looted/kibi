/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/*
 How to apply this header to source files (examples)

 1) Prepend header to a single file (POSIX shells):

    cat LICENSE_HEADER.txt "$FILE" > "$FILE".with-header && mv "$FILE".with-header "$FILE"

 2) Apply to multiple files (example: the project's main entry files):

    for f in packages/cli/bin/kibi packages/mcp/bin/kibi-mcp packages/cli/src/*.ts packages/mcp/src/*.ts; do
      if [ -f "$f" ]; then
        cp "$f" "$f".bak
        (cat LICENSE_HEADER.txt; echo; cat "$f" ) > "$f".new && mv "$f".new "$f"
      fi
    done

 3) Avoid duplicating the header: run a quick guard to only add if missing

    for f in packages/cli/bin/kibi packages/mcp/bin/kibi-mcp; do
      if [ -f "$f" ]; then
        if ! head -n 5 "$f" | grep -q "Copyright (C) 2026 Piotr Franczyk"; then
          cp "$f" "$f".bak
          (cat LICENSE_HEADER.txt; echo; cat "$f" ) > "$f".new && mv "$f".new "$f"
        fi
      fi
    done

 Notes:
 - Apply the header to the source files (TS/JS/other) in `packages/*/src` before building.
 - For small CLI wrapper scripts (e.g. `packages/*/bin/*`) you can add the header as a block comment directly above the shebang line or below it; if you need the shebang to remain the very first line, place the header after the shebang.
 - Built `dist/` files are generated; prefer to modify source files and rebuild rather than editing `dist/` directly.

*/

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
    {
      name: "pre-commit hook",
      check: checkPreCommitHook,
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

function checkPreCommitHook(): {
  passed: boolean;
  message: string;
  remediation?: string;
} {
  const postCheckoutPath = path.join(process.cwd(), ".git/hooks/post-checkout");
  const postMergePath = path.join(process.cwd(), ".git/hooks/post-merge");
  const preCommitPath = path.join(process.cwd(), ".git/hooks/pre-commit");

  const postCheckoutExists = existsSync(postCheckoutPath);
  const postMergeExists = existsSync(postMergePath);

  if (!postCheckoutExists && !postMergeExists) {
    return {
      passed: true,
      message: "Not installed (optional)",
    };
  }

  const preCommitExists = existsSync(preCommitPath);

  if (!preCommitExists) {
    return {
      passed: false,
      message: "Not installed",
      remediation: "Run: kibi init --hooks",
    };
  }

  try {
    const preCommitStats = statSync(preCommitPath);
    const preCommitExecutable = (preCommitStats.mode & 0o111) !== 0;

    if (preCommitExecutable) {
      return {
        passed: true,
        message: "Installed and executable",
      };
    }
    return {
      passed: false,
      message: "Installed but not executable",
      remediation: "Run: chmod +x .git/hooks/pre-commit",
    };
  } catch (error) {
    return {
      passed: false,
      message: "Unable to check hook permissions",
    };
  }
}
