import { spawnSync } from "node:child_process";
import {
  constants,
  accessSync,
  chmodSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";

/**
 * Make `repo`'s .git, .git/objects or .git/refs unusable so git reports no
 * repository, and return a closure that restores it. chmod 000 is tried
 * first; when the user still has access (root ignores permission bits), the
 * entry is broken another way: .git loses its HEAD, and objects or refs is
 * replaced by a regular file. Either way git stops recognizing the .git
 * directory while the .git entry still exists, which is the case under test.
 */
export function denyGitInternals(
  repo: string,
  internal: ".git" | "objects" | "refs",
): () => void {
  const gitDir = path.join(repo, ".git");
  const target = internal === ".git" ? gitDir : path.join(gitDir, internal);
  chmodSync(target, 0o000);
  let restore = () => chmodSync(target, 0o755);
  if (readable(target)) {
    restore();
    if (internal === ".git") {
      const head = path.join(gitDir, "HEAD");
      renameSync(head, `${head}.denied`);
      restore = () => renameSync(`${head}.denied`, head);
    } else {
      renameSync(target, `${target}.denied`);
      writeFileSync(target, "");
      restore = () => {
        rmSync(target);
        renameSync(`${target}.denied`, target);
      };
    }
  }
  // Precondition: git must no longer see a repository here, otherwise the
  // scenario is not exercised.
  const probe = spawnSync("git", ["rev-parse", "--git-dir"], {
    cwd: repo,
    encoding: "utf8",
    env: { ...process.env, GIT_CEILING_DIRECTORIES: path.dirname(repo) },
  });
  if (probe.status === 0 || !/not a git repository/i.test(probe.stderr)) {
    restore();
    throw new Error(
      `denying ${target} did not stop git from finding the repository: ${probe.stderr || probe.stdout}`,
    );
  }
  return restore;
}

function readable(target: string): boolean {
  try {
    accessSync(target, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}
