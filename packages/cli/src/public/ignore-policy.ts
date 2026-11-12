import { type Dirent, readFileSync, readdirSync } from "node:fs";
import * as path from "node:path";
import ignore from "ignore";
import { DERIVED_KB_PREFIXES, isDerivedKbPath } from "../utils/kb-paths.js";

const HARD_DENYLIST = [
  ".git",
  "node_modules",
  "vendor",
  "third_party",
  ".sisyphus",
  ".opencode",
];

export interface IgnorePolicy {
  isIgnored(inputPath: string): boolean;
  getFastGlobIgnoreGlobs(): string[];
  explain(inputPath: string): { ignored: boolean; reason?: string };
}

function readIgnoreFileLines(filePath: string): string[] {
  try {
    // A missing or unreadable file contributes no patterns.
    const content = readFileSync(filePath, "utf8");
    return content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("#"));
  } catch {
    return [];
  }
}

function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}

/**
 * Fast-glob forms of gitignore lines, relative to `prefix`. Negations cannot
 * be expressed as ignore globs, so they are left out; a leading slash only
 * anchors the pattern to its directory.
 */
function patternGlobs(prefix: string, patterns: readonly string[]): string[] {
  return patterns
    .filter((pattern) => !pattern.startsWith("!"))
    .map((pattern) => `**/${prefix}${pattern.replace(/^\//, "")}`);
}

export function createRepoIgnorePolicy(workspaceRoot: string): IgnorePolicy {
  const root = path.resolve(workspaceRoot);

  // Load root .gitignore
  const rootGitPatterns = readIgnoreFileLines(path.join(root, ".gitignore"));

  // Load .git/info/exclude
  const gitInfoPatterns = readIgnoreFileLines(
    path.join(root, ".git", "info", "exclude"),
  );

  // Find nested .gitignore files (skip scanning inside hard denylist
  // directories, which include .git, and the .kb tree), keyed by their
  // workspace-relative POSIX directory.
  const nestedPatterns = new Map<string, string[]>();

  function walk(dirAbs: string) {
    let entries: Dirent[];
    try {
      entries = readdirSync(dirAbs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const name = String(ent.name);
      const abs = path.join(dirAbs, name);
      if (ent.isDirectory()) {
        // avoid descending into common heavy or control directories
        if (HARD_DENYLIST.includes(name)) continue;
        if (name === ".kb") continue;
        walk(abs);
      } else if (ent.isFile() && name === ".gitignore") {
        // skip root .gitignore (we already loaded it)
        if (dirAbs === root) continue;
        nestedPatterns.set(
          toPosix(path.relative(root, dirAbs)),
          readIgnoreFileLines(abs),
        );
      }
    }
  }

  walk(root);

  // Create ignore instances
  const rootIgnore = ignore().add(rootGitPatterns);
  const gitInfoIgnore = ignore().add(gitInfoPatterns);
  const nestedIgnoreMap = new Map(
    [...nestedPatterns].map(([dirRel, pats]) => [dirRel, ignore().add(pats)]),
  );

  function isPathOutsideWorkspace(absPath: string): boolean {
    // path.relative starts with a '..' segment for outside paths
    return path.relative(root, absPath).split(path.sep)[0] === "..";
  }

  function matchesHardDeny(relPosix: string): boolean {
    if (isDerivedKbPath(relPosix)) return true;
    const segments = relPosix.split("/");
    return HARD_DENYLIST.some((deny) => segments.includes(deny));
  }

  /** ignore() throws on paths it cannot judge, such as the root itself. */
  function ignores(ig: ReturnType<typeof ignore>, relPosix: string): boolean {
    try {
      return ig.ignores(relPosix);
    } catch {
      // judged as not ignored
    }
    return false;
  }

  function isIgnoredInternal(inputPath: string): {
    ignored: boolean;
    reason?: string;
  } {
    // Resolve to absolute and relative path inside workspace
    const abs = path.resolve(root, inputPath);

    if (path.isAbsolute(inputPath) && isPathOutsideWorkspace(abs)) {
      return { ignored: true, reason: "outside_workspace" };
    }

    const relPosix = toPosix(path.relative(root, abs));

    // Hard denylist always wins
    if (matchesHardDeny(relPosix))
      return { ignored: true, reason: "hard_deny" };

    if (ignores(rootIgnore, relPosix)) {
      return { ignored: true, reason: "gitignored" };
    }

    if (ignores(gitInfoIgnore, relPosix)) {
      return { ignored: true, reason: "git_info_exclude" };
    }

    // Nested .gitignore (apply relative to their directory); any of them
    // ignoring the path ignores it.
    for (const [dirRel, ig] of nestedIgnoreMap) {
      if (
        relPosix.startsWith(`${dirRel}/`) &&
        ignores(ig, relPosix.slice(dirRel.length + 1))
      ) {
        return { ignored: true, reason: "gitignored" };
      }
    }

    return { ignored: false };
  }

  function getFastGlobIgnoreGlobs(): string[] {
    // Hard denylist globs: match directory and its contents anywhere
    const globs = [...HARD_DENYLIST, ...DERIVED_KB_PREFIXES].flatMap((d) => [
      `**/${d}/**`,
      `**/${d}`,
    ]);
    globs.push(...patternGlobs("", rootGitPatterns));
    globs.push(...patternGlobs("", gitInfoPatterns));
    // Nested patterns are scoped to their directory instead of ignoring the
    // entire directory.
    for (const [dirRel, patterns] of nestedPatterns) {
      globs.push(...patternGlobs(`${dirRel}/`, patterns));
    }
    return Array.from(new Set(globs));
  }

  return {
    isIgnored(inputPath: string) {
      return isIgnoredInternal(inputPath).ignored;
    },
    getFastGlobIgnoreGlobs,
    explain(inputPath: string) {
      return isIgnoredInternal(inputPath);
    },
  };
}
