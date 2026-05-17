import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import * as path from "node:path";
import ignore from "ignore";

const HARD_DENYLIST = [
  ".kb",
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
  if (!existsSync(filePath)) return [];
  try {
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

// implements REQ-001
export function createRepoIgnorePolicy(workspaceRoot: string): IgnorePolicy {
  const root = path.resolve(workspaceRoot);

  // Load root .gitignore
  const rootGitignorePath = path.join(root, ".gitignore");
  const rootGitPatterns = readIgnoreFileLines(rootGitignorePath);

  // Load .git/info/exclude
  const gitInfoExcludePath = path.join(root, ".git", "info", "exclude");
  const gitInfoPatterns = readIgnoreFileLines(gitInfoExcludePath);

  // Find nested .gitignore files (skip scanning inside hard denylist directories)
  const nestedPatterns = new Map<string, string[]>();

  function walk(dirAbs: string) {
    let entries;
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
        // also avoid .git itself to prevent reading internal excludes as nested
        if (name === ".git") continue;
        walk(abs);
      } else if (ent.isFile()) {
        if (name === ".gitignore") {
          // skip root .gitignore (we already loaded it)
          if (path.resolve(dirAbs) === root) continue;
          const patterns = readIgnoreFileLines(abs);
          const relDir = path.relative(root, dirAbs) || ".";
          nestedPatterns.set(toPosix(relDir), patterns);
        }
      }
    }
  }

  walk(root);

  // Create ignore instances
  const rootIgnore = ignore();
  if (rootGitPatterns.length > 0) rootIgnore.add(rootGitPatterns);

  const gitInfoIgnore = ignore();
  if (gitInfoPatterns.length > 0) gitInfoIgnore.add(gitInfoPatterns);

  const nestedIgnoreMap = new Map<string, ReturnType<typeof ignore>>();
  for (const [dirRel, pats] of nestedPatterns.entries()) {
    const ig = ignore();
    if (pats.length > 0) ig.add(pats);
    nestedIgnoreMap.set(dirRel, ig);
  }

  // Prepare nested directories sorted by specificity (longest first)
  const nestedDirsSorted = Array.from(nestedIgnoreMap.keys()).sort((a, b) => b.length - a.length);

  function isPathOutsideWorkspace(absPath: string): boolean {
    const rel = path.relative(root, absPath);
    // path.relative returns paths starting with '..' for outside
    return rel === "" ? false : rel.split(path.sep)[0] === "..";
  }

  function matchesHardDeny(relPosix: string): boolean {
    const segments = relPosix.split("/").filter(Boolean);
    for (const deny of HARD_DENYLIST) {
      if (segments.includes(deny)) return true;
    }
    return false;
  }

  function isIgnoredInternal(inputPath: string): { ignored: boolean; reason?: string } {
    // Resolve to absolute and relative path inside workspace
    const abs = path.isAbsolute(inputPath) ? path.resolve(inputPath) : path.resolve(root, inputPath);

    if (path.isAbsolute(inputPath) && isPathOutsideWorkspace(abs)) {
      return { ignored: true, reason: "outside_workspace" };
    }

    const rel = path.relative(root, abs) || ".";
    const relPosix = toPosix(rel);

    // Hard denylist always wins
    if (matchesHardDeny(relPosix)) return { ignored: true, reason: "hard_deny" };

    // Root .gitignore
    try {
      if (rootGitPatterns.length > 0 && rootIgnore.ignores(relPosix)) {
        return { ignored: true, reason: "gitignored" };
      }
    } catch (e) {
      // ignore errors from library usage; continue
    }

    // .git/info/exclude
    try {
      if (gitInfoPatterns.length > 0 && gitInfoIgnore.ignores(relPosix)) {
        return { ignored: true, reason: "git_info_exclude" };
      }
    } catch (e) {
      // noop
    }

    // Nested .gitignore (apply relative to their directory)
    for (const dirRel of nestedDirsSorted) {
      // dirRel is '.' for nested at root which we skipped, so dirRel will be like 'docs'
      if (dirRel === ".") continue;
      if (relPosix === dirRel || relPosix.startsWith(dirRel + "/")) {
        const sub = relPosix === dirRel ? "." : relPosix.slice(dirRel.length + 1);
        const ig = nestedIgnoreMap.get(dirRel)!;
        try {
          if (ig && ig.ignores(sub)) return { ignored: true, reason: "gitignored" };
        } catch (e) {
          // noop
        }
      }
    }

    return { ignored: false };
  }

  function getFastGlobIgnoreGlobs(): string[] {
    const globs: string[] = [];

    // Hard denylist globs
    for (const d of HARD_DENYLIST) {
      // match directory and its contents anywhere
      globs.push(`**/${d}/**`);
      globs.push(`**/${d}`);
    }

    // Root .gitignore patterns (convert to simple globs)
    for (const p of rootGitPatterns) {
      if (!p || p.startsWith("#") || p.startsWith("!")) continue;
      let pat = p;
      if (pat.startsWith("/")) pat = pat.slice(1);
      if (pat.includes("/")) {
        // anchored path
        globs.push(`**/${toPosix(pat)}`);
      } else {
        globs.push(`**/${pat}`);
      }
    }

    // .git/info/exclude patterns
    for (const p of gitInfoPatterns) {
      if (!p || p.startsWith("#") || p.startsWith("!")) continue;
      let pat = p;
      if (pat.startsWith("/")) pat = pat.slice(1);
      if (pat.includes("/")) {
        globs.push(`**/${toPosix(pat)}`);
      } else {
        globs.push(`**/${pat}`);
      }
    }

    // Nested .gitignore patterns - prefix with directory path
    // Use the raw patterns collected in nestedPatterns so we scope patterns
    // to the nested directory instead of ignoring the entire directory.
    // Debug: print nested patterns and the computed globs to help diagnosing test failures.
    for (const [dirRel, patterns] of nestedPatterns.entries()) {
      for (const p of patterns) {
        if (!p || p.startsWith("#") || p.startsWith("!")) continue;
        let pat = p;
        if (pat.startsWith("/")) pat = pat.slice(1);
        const prefix = dirRel === "." ? "" : `${dirRel}/`;
        if (pat.includes("/")) {
          globs.push(`**/${prefix}${toPosix(pat)}`);
        } else {
          globs.push(`**/${prefix}${pat}`);
        }
      }
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
