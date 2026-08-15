import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import fg from "fast-glob";

import { createRepoIgnorePolicy } from "../ignore-policy.js";
import type { FilesystemPort, GitPort, NetworkPort } from "./runtime-types.js";

type NodeFilesystemPort = FilesystemPort & {
  readonly glob: (
    patterns: readonly string[],
    options: { readonly cwd: string; readonly includeIgnored?: boolean },
  ) => Promise<readonly string[]>;
};

type NodeGitPort = GitPort & {
  readonly ignoredPaths: (
    workspaceRoot: string,
    paths: readonly string[],
  ) => Promise<readonly string[]>;
};

const execFileAsync = promisify(execFile);
const SNAPSHOT_EXCLUDED_PREFIXES = [".changeset/", ".kb/", "docs/"] as const;
const ALWAYS_IGNORED_GLOBS = [
  "**/.git/**",
  "**/.kb/**",
  "**/node_modules/**",
  "**/vendor/**",
  "**/vendors/**",
  "**/third_party/**",
  "**/third-party/**",
  "**/dist/**",
  "**/build/**",
  "**/coverage/**",
  "**/target/**",
] as const;

function includedSnapshotPath(relativePath: string): boolean {
  return !SNAPSHOT_EXCLUDED_PREFIXES.some(
    (prefix) =>
      relativePath === prefix.slice(0, -1) || relativePath.startsWith(prefix),
  );
}

function withoutVerificationReceiptFrontmatter(content: string): string {
  const lines = content.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  if (lines[0]?.trim() !== "---") return content;
  let inFrontmatter = true;
  let skippingReceipts = false;
  const retained: string[] = [];
  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();
    if (index > 0 && inFrontmatter && trimmed === "---") {
      inFrontmatter = false;
      skippingReceipts = false;
      retained.push(line);
      continue;
    }
    if (inFrontmatter && /^verification_receipts\s*:/.test(line)) {
      skippingReceipts = true;
      continue;
    }
    if (
      inFrontmatter &&
      skippingReceipts &&
      /^[A-Za-z_][A-Za-z0-9_-]*\s*:/.test(line)
    ) {
      skippingReceipts = false;
    }
    if (!skippingReceipts) retained.push(line);
  }
  return retained.join("");
}

function snapshotFileContent(relativePath: string, content: Buffer): Buffer {
  if (relativePath.endsWith(".md")) {
    return Buffer.from(
      withoutVerificationReceiptFrontmatter(content.toString("utf8")),
    );
  }
  return content;
}

async function workspaceSnapshot(workspaceRoot: string) {
  const { stdout: listed } = await execFileAsync(
    "git",
    [
      "-C",
      workspaceRoot,
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "-z",
    ],
    { encoding: "buffer", maxBuffer: 64 * 1024 * 1024 },
  );
  const paths = listed
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .filter(includedSnapshotPath)
    .sort();
  const digest = createHash("sha256");
  digest.update("kibi.workspace-snapshot.v2\0");
  for (const relativePath of paths) {
    digest.update(relativePath);
    digest.update("\0");
    try {
      const content = await fs.readFile(path.join(workspaceRoot, relativePath));
      digest.update(snapshotFileContent(relativePath, content));
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : "unreadable";
      digest.update(`<${code}>`);
    }
    digest.update("\0");
  }
  const { stdout: status } = await execFileAsync(
    "git",
    [
      "-C",
      workspaceRoot,
      "status",
      "--porcelain=v1",
      "--untracked-files=normal",
      "-z",
    ],
    { maxBuffer: 16 * 1024 * 1024 },
  );
  const rawChanges = status.split("\0").filter(Boolean);
  const changes: {
    path: string;
    status: string;
    snapshotRelevant: boolean;
    previousPath?: string;
  }[] = [];
  for (let index = 0; index < rawChanges.length; index++) {
    const entry = rawChanges[index] ?? "";
    const statusCode = entry.slice(0, 2);
    const relativePath = entry.slice(3).replaceAll("\\", "/");
    const previous = rawChanges[index + 1];
    const isRenameOrCopy = statusCode[0] === "R" || statusCode[0] === "C";
    const previousPath =
      isRenameOrCopy && previous ? previous.replaceAll("\\", "/") : undefined;
    changes.push({
      path: relativePath,
      status: statusCode,
      snapshotRelevant:
        includedSnapshotPath(relativePath) ||
        (previousPath !== undefined && includedSnapshotPath(previousPath)),
      ...(previousPath !== undefined ? { previousPath } : {}),
    });
    if (previousPath !== undefined) index++;
  }
  const maxChanges = 200;
  return {
    version: "kibi.workspace-snapshot.v2" as const,
    hash: digest.digest("hex"),
    dirty: changes.length > 0,
    fileCount: paths.length,
    changes: changes.slice(0, maxChanges),
    changeCount: changes.length,
    changesTruncated: changes.length > maxChanges,
  };
}

export const nodeFilesystem: NodeFilesystemPort = {
  readFile: (filePath) => fs.readFile(filePath, "utf8"),
  writeFile: async (filePath, data) => {
    await fs.writeFile(filePath, data, "utf8");
  },
  rename: (from, to) => fs.rename(from, to),
  mkdir: async (directoryPath) => {
    await fs.mkdir(directoryPath, { recursive: true });
  },
  stat: (filePath) => fs.stat(filePath),
  unlink: (filePath) => fs.unlink(filePath),
  glob: (patterns, options) =>
    fg([...patterns], {
      cwd: options.cwd,
      onlyFiles: true,
      unique: true,
      dot: true,
      suppressErrors: true,
      ignore: [...ALWAYS_IGNORED_GLOBS],
    }),
};

export const nodeGit: NodeGitPort = {
  revParse: async (...args) => {
    const { stdout } = await execFileAsync("git", ["rev-parse", ...args]);
    return stdout.trim();
  },
  showToplevel: async () => {
    const { stdout } = await execFileAsync("git", [
      "rev-parse",
      "--show-toplevel",
    ]);
    return stdout.trim();
  },
  workspaceSnapshot,
  ignoredPaths: async (workspaceRoot, paths) => {
    const policy = createRepoIgnorePolicy(workspaceRoot);
    return paths.filter((candidate) => policy.isIgnored(candidate));
  },
};

export const nodeNetwork: NetworkPort = {
  fetch: (input, init) => globalThis.fetch(input, init),
};
