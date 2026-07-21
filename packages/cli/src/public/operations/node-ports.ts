import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import { promisify } from "node:util";
import fg from "fast-glob";

import { createRepoIgnorePolicy } from "../ignore-policy.js";
import type {
  FilesystemPort,
  GitPort,
  NetworkPort,
} from "./runtime-types.js";

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

export const nodeFilesystem: NodeFilesystemPort = {
  readFile: (filePath) => fs.readFile(filePath, "utf8"),
  writeFile: async (filePath, data) => {
    await fs.writeFile(filePath, data, "utf8");
  },
  mkdir: async (directoryPath) => {
    await fs.mkdir(directoryPath, { recursive: true });
  },
  stat: (filePath) => fs.stat(filePath),
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
  ignoredPaths: async (workspaceRoot, paths) => {
    const policy = createRepoIgnorePolicy(workspaceRoot);
    return paths.filter((candidate) => policy.isIgnored(candidate));
  },
};

export const nodeNetwork: NetworkPort = {
  fetch: (input, init) => globalThis.fetch(input, init),
};
