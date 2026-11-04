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

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const GITHUB_REPORT_WORKFLOW_RELPATH =
  ".github/workflows/kibi-report.yml";
export const GITHUB_BADGE_WORKFLOW_RELPATH = ".github/workflows/kibi-badge.yml";
// implements REQ-kibi-fresh-clone-setup
export const GITHUB_CHECK_WORKFLOW_RELPATH = ".github/workflows/kibi-check.yml";
export const GITHUB_PAGES_NAMESPACE = "kibi-report";
export const KIBI_BADGE_ALT = "Kibi requirement health";
export const KIBI_METRIC_DOCS_URL =
  "https://looted.github.io/kibi/guide/github-integration.html#what-the-badge-means";
export const PLACEHOLDER_OWNER = "OWNER";
export const PLACEHOLDER_REPO = "REPOSITORY";

const README_CANDIDATES = ["README.md", "readme.md", "Readme.md"] as const;
const BADGE_OR_IMAGE_LINE =
  /^\s*(?:\[!\[[^\]]*\]\([^)]+\)\]\([^)]+\)|!\[[^\]]*\]\([^)]+\))\s*$/;

export type GitHubRepo = Readonly<{
  owner: string;
  repo: string;
}>;

export type GitRemote = Readonly<{
  name: string;
  url: string;
}>;

export type GitHubPagesUrls = Readonly<{
  siteUrl: string;
  badgeUrl: string;
}>;

export type GitHubWorkflowKind = "report" | "badge" | "check";

export type WorkflowWriteStatus = "created" | "unchanged" | "conflict";
export type ReadmeWriteStatus =
  | "updated"
  | "unchanged"
  | "printed"
  | "skipped-unknown-repo";
export type GitIgnoreWriteStatus = "updated" | "unchanged";

export type GitHubScaffoldOptions = Readonly<{
  cwd: string;
  badgeOnly: boolean;
}>;

export type GitHubInitDeps = Readonly<{
  listRemotes?: (cwd: string) => GitRemote[];
  log?: (message: string) => void;
  error?: (message: string) => void;
}>;

export type GitHubScaffoldResult = Readonly<{
  exitCode: number;
  workflow: WorkflowWriteStatus;
  readme: ReadmeWriteStatus;
  gitignore: GitIgnoreWriteStatus;
  repo: GitHubRepo | undefined;
}>;

// implements REQ-kibi-github-report-integration
export function githubTemplateDir(): string {
  return path.resolve(__dirname, "..", "..", "templates", "github");
}

const WORKFLOW_PATHS: Readonly<Record<GitHubWorkflowKind, string>> = {
  report: GITHUB_REPORT_WORKFLOW_RELPATH,
  badge: GITHUB_BADGE_WORKFLOW_RELPATH,
  check: GITHUB_CHECK_WORKFLOW_RELPATH,
};

export function githubWorkflowTemplateFileName(
  kind: GitHubWorkflowKind,
): string {
  return path.basename(WORKFLOW_PATHS[kind]);
}

export function loadGitHubWorkflowTemplate(kind: GitHubWorkflowKind): string {
  const templatePath = path.join(
    githubTemplateDir(),
    githubWorkflowTemplateFileName(kind),
  );
  if (!existsSync(templatePath)) {
    throw new Error(`Kibi GitHub workflow template missing: ${templatePath}`);
  }
  return readFileSync(templatePath, "utf8");
}

export function parseGitHubRemote(url: string): GitHubRepo | undefined {
  const trimmed = url.trim();

  const patterns: RegExp[] = [
    /^https?:\/\/(?:[^/@]+@)?(?:www\.)?github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/i,
    /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?\/?$/i,
    /^ssh:\/\/(?:git@)?github\.com(?::\d+)?\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/i,
    /^git:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(trimmed);
    if (!match) {
      continue;
    }
    // Both groups match at least one character.
    const [, owner, repoRaw] = match as unknown as [string, string, string];
    if (owner.includes(":") || repoRaw.includes(" ")) {
      return undefined;
    }
    const repo = repoRaw.replace(/\.git$/i, "");
    return repo.length === 0 ? undefined : { owner, repo };
  }

  return undefined;
}

export function githubPagesUrls(repo: GitHubRepo): GitHubPagesUrls {
  // The *.github.io host is case-insensitive, but the project-site path is
  // case-sensitive, so the repository segment keeps its exact case.
  const owner = repo.owner.toLowerCase();
  const name = repo.repo;
  const isUserSite = name.toLowerCase() === `${owner}.github.io`;
  const origin = isUserSite
    ? `https://${owner}.github.io/`
    : `https://${owner}.github.io/${name}/`;
  const siteUrl = `${origin}${GITHUB_PAGES_NAMESPACE}/`;
  const badgeUrl = `${siteUrl}badge.svg`;
  return { siteUrl, badgeUrl };
}

export function formatKibiBadgeMarkdown(
  badgeUrl: string,
  linkUrl: string,
): string {
  return `[![${KIBI_BADGE_ALT}](${badgeUrl})](${linkUrl})`;
}

export function placeholderPagesUrls(): GitHubPagesUrls {
  return {
    siteUrl: `https://${PLACEHOLDER_OWNER}.github.io/${PLACEHOLDER_REPO}/${GITHUB_PAGES_NAMESPACE}/`,
    badgeUrl: `https://${PLACEHOLDER_OWNER}.github.io/${PLACEHOLDER_REPO}/${GITHUB_PAGES_NAMESPACE}/badge.svg`,
  };
}

export function placeholderBadgeMarkdown(badgeOnly: boolean): string {
  const urls = placeholderPagesUrls();
  return formatKibiBadgeMarkdown(
    urls.badgeUrl,
    badgeOnly ? KIBI_METRIC_DOCS_URL : urls.siteUrl,
  );
}

export function hasKibiBadge(content: string): boolean {
  return /\[!\[Kibi requirement health\]/i.test(content);
}

export function detectReadmePath(cwd: string): string | undefined {
  let entries: Set<string>;
  try {
    entries = new Set(readdirSync(cwd));
  } catch {
    return undefined;
  }
  for (const name of README_CANDIDATES) {
    const candidate = path.join(cwd, name);
    if (entries.has(name) && existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

export function insertKibiBadge(
  content: string,
  badgeMarkdown: string,
): string {
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  const h1Index = lines.findIndex((line) => /^#\s+\S/.test(line));

  // The badge cluster starts after the title, or at the top without one; it
  // never ends before where it starts, so a title always puts it past 0.
  const clusterEnd = findBadgeClusterEnd(lines, h1Index + 1);
  if (clusterEnd > 0) {
    return insertLine(lines, clusterEnd, badgeMarkdown, newline);
  }
  if (content.length === 0) {
    return `${badgeMarkdown}${newline}`;
  }
  return `${badgeMarkdown}${newline}${newline}${content}`;
}

export function listGitRemotes(cwd: string): GitRemote[] {
  try {
    const output = execFileSync("git", ["-C", cwd, "remote", "-v"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const remotes: GitRemote[] = [];
    for (const line of output.split("\n")) {
      const match = /^(\S+)\s+(\S+)\s+\(fetch\)$/.exec(line);
      if (match) {
        // Both groups match at least one character.
        const [, name, url] = match as unknown as [string, string, string];
        remotes.push({ name, url });
      }
    }
    return remotes;
  } catch {
    return [];
  }
}

export function resolveGitHubRepo(
  remotes: readonly GitRemote[],
): GitHubRepo | undefined {
  const parsed = remotes
    .map((remote) => ({ remote, repo: parseGitHubRemote(remote.url) }))
    .filter(
      (entry): entry is { remote: GitRemote; repo: GitHubRepo } =>
        entry.repo !== undefined,
    );
  const origin = parsed.find((entry) => entry.remote.name === "origin");
  return origin?.repo ?? parsed[0]?.repo;
}

export function writeGitHubWorkflow(
  cwd: string,
  kind: GitHubWorkflowKind,
  template: string,
): WorkflowWriteStatus {
  const dest = path.join(cwd, WORKFLOW_PATHS[kind]);
  const normalizedTemplate = normalizeNewlines(template);
  if (existsSync(dest)) {
    const existing = normalizeNewlines(readFileSync(dest, "utf8"));
    return existing === normalizedTemplate ? "unchanged" : "conflict";
  }
  mkdirSync(path.dirname(dest), { recursive: true });
  writeFileSync(dest, normalizedTemplate);
  return "created";
}

export function ensureKibiReportGitIgnore(cwd: string): GitIgnoreWriteStatus {
  const gitignorePath = path.join(cwd, ".gitignore");
  const current = existsSync(gitignorePath)
    ? readFileSync(gitignorePath, "utf8")
    : "";
  if (/(?:^|\n)kibi-report\/(?:\n|$)/.test(current)) {
    return "unchanged";
  }
  const next = current
    ? `${current.replace(/\s*$/, "")}\nkibi-report/\n`
    : "kibi-report/\n";
  writeFileSync(gitignorePath, next);
  return "updated";
}

// implements REQ-kibi-github-report-integration
export function scaffoldGitHubIntegration(
  options: GitHubScaffoldOptions,
  deps: GitHubInitDeps = {},
): GitHubScaffoldResult {
  const log = deps.log ?? ((message: string) => console.log(message));
  const error = deps.error ?? ((message: string) => console.error(message));
  const listRemotes = deps.listRemotes ?? listGitRemotes;
  const kind: GitHubWorkflowKind = options.badgeOnly ? "badge" : "report";
  const workflowPath = WORKFLOW_PATHS[kind];
  const siblingPath = WORKFLOW_PATHS[options.badgeOnly ? "report" : "badge"];
  const template = loadGitHubWorkflowTemplate(kind);
  const workflow = writeGitHubWorkflow(options.cwd, kind, template);
  const gitignore = ensureKibiReportGitIgnore(options.cwd);
  const repo = resolveGitHubRepo(listRemotes(options.cwd));

  if (existsSync(path.join(options.cwd, siblingPath))) {
    error(
      `Warning: ${siblingPath} already exists. GitHub Pages can host one site; keep a single Kibi workflow.`,
    );
  }

  if (workflow === "created") {
    log(`✓ Added ${workflowPath}`);
  } else if (workflow === "unchanged") {
    log(`✓ ${workflowPath} already configured`);
  } else {
    error(
      `Warning: ${workflowPath} already exists and differs from the Kibi template.`,
    );
    error(
      `Left the existing file in place. Compare it with https://github.com/Looted/kibi/blob/develop/docs/examples/github/${githubWorkflowTemplateFileName(kind)}.`,
    );
  }

  if (gitignore === "updated") {
    log("✓ Added kibi-report/ to .gitignore");
  }

  const readme = updateReadmeBadge(options, repo, log, error);

  log("");
  log("Manual step required:");
  log("GitHub → Settings → Pages → Source → GitHub Actions");

  return {
    exitCode: 0,
    workflow,
    readme,
    gitignore,
    repo,
  };
}

function updateReadmeBadge(
  options: GitHubScaffoldOptions,
  repo: GitHubRepo | undefined,
  log: (message: string) => void,
  error: (message: string) => void,
): ReadmeWriteStatus {
  const markdown = repo
    ? formatKibiBadgeMarkdown(
        githubPagesUrls(repo).badgeUrl,
        options.badgeOnly
          ? KIBI_METRIC_DOCS_URL
          : githubPagesUrls(repo).siteUrl,
      )
    : placeholderBadgeMarkdown(options.badgeOnly);
  const readmePath = detectReadmePath(options.cwd);

  if (!repo) {
    error(
      "Warning: Could not determine a github.com owner/repository from git remotes.",
    );
    error(
      "Did not invent a badge URL. Add this Markdown after replacing OWNER/REPOSITORY:",
    );
    log(markdown);
    if (!readmePath) {
      return "printed";
    }
    return "skipped-unknown-repo";
  }

  if (!readmePath) {
    log("No README found. Add this badge Markdown manually:");
    log(markdown);
    return "printed";
  }

  const existing = readFileSync(readmePath, "utf8");
  if (hasKibiBadge(existing)) {
    log("✓ README already contains the Kibi requirement-health badge");
    return "unchanged";
  }

  writeFileSync(readmePath, insertKibiBadge(existing, markdown));
  log(`✓ Added Kibi requirement-health badge to ${path.basename(readmePath)}`);
  return "updated";
}

function normalizeNewlines(value: string): string {
  const unix = value.replace(/\r\n/g, "\n");
  return unix.endsWith("\n") ? unix : `${unix}\n`;
}

export function skipBlankLines(
  lines: readonly string[],
  start: number,
): number {
  let peek = start;
  while (peek < lines.length && (lines[peek] as string).trim() === "") {
    peek += 1;
  }
  return peek;
}

/** A line past the end reads as "undefined", which is no badge. */
function isBadgeLine(line: string | undefined): boolean {
  return BADGE_OR_IMAGE_LINE.test(line as string);
}

function findBadgeClusterEnd(lines: readonly string[], start: number): number {
  let index = skipBlankLines(lines, start);
  if (!isBadgeLine(lines[index])) {
    return start;
  }
  while (isBadgeLine(lines[index])) {
    index += 1;
    // A blank gap between badges keeps the cluster going.
    const peek = skipBlankLines(lines, index);
    if (isBadgeLine(lines[peek])) index = peek;
  }
  return index;
}

/**
 * Insert after the title or the last badge, so the line before is never
 * blank and always gets a blank line between.
 */
function insertLine(
  lines: string[],
  index: number,
  badgeMarkdown: string,
  newline: string,
): string {
  const before = lines.slice(0, index);
  const after = lines.slice(index);
  const suffixBlank = (after[0] ?? "").trim() === "" ? [] : [""];
  return [...before, "", badgeMarkdown, ...suffixBlank, ...after].join(newline);
}

/**
 * The pull-request gate workflow (`kibi init --ci-gate`): `kibi check` on
 * every pull request, the one gate that does not depend on what a
 * contributor's checkout has installed. Never overwrites a workflow the
 * project changed.
 */
// implements REQ-kibi-fresh-clone-setup
export function scaffoldCheckWorkflow(
  cwd: string,
  deps: Pick<GitHubInitDeps, "log" | "error"> = {},
): WorkflowWriteStatus {
  const log = deps.log ?? ((message: string) => console.log(message));
  const error = deps.error ?? ((message: string) => console.error(message));
  const status = writeGitHubWorkflow(
    cwd,
    "check",
    loadGitHubWorkflowTemplate("check"),
  );
  if (status === "created")
    log(
      `✓ Added ${GITHUB_CHECK_WORKFLOW_RELPATH}: pull requests must pass kibi check`,
    );
  else if (status === "conflict")
    error(
      `Warning: ${GITHUB_CHECK_WORKFLOW_RELPATH} already exists and differs from the Kibi template; left untouched.`,
    );
  return status;
}
