import { closeSync, openSync, readSync, readdirSync } from "node:fs";
import * as path from "node:path";
import type { KibiImpactDiagnostic } from "../../traceability/staged-diagnostics.js";

/**
 * A file `kb_check` was asked about that no symbol links to a requirement.
 * No link is not no rule, so the check says so and names the current
 * requirements whose titles share the file's path words: candidates to
 * confirm, never owners. Kibi's hooks name the same candidates before an edit
 * (kibi-agent-core `requirement-candidates`), with the same word rules.
 */

const REQUIREMENTS_DIR = path.join(".kb", "requirements");
const HEAD_BYTES = 4096;
const MAX_CANDIDATES = 3;
const MAX_TITLE = 100;

/** Path words that name a layout, a language or a role, not a behavior. */
const LAYOUT_WORDS = new Set(
  (
    "src app apps lib libs source page pages component components view views " +
    "screen screens package packages main index shared common core util utils " +
    "helper helpers public static asset assets web client server frontend " +
    "backend module modules feature features internal service services test " +
    "tests spec specs dist build html htm tsx jsx mjs cjs vue svelte css scss " +
    "less json yaml yml java swift php"
  ).split(" "),
);

/** Words of a title or path that carry no topic. */
const FILLER_WORDS = new Set(
  (
    "the and for with must should shall may can are its their that this " +
    "from into when each every all not req auto"
  ).split(" "),
);

const RETIRED_STATUS =
  /supersed|deprecat|reject|obsolete|retired|archived|removed/i;

/** Lowercase word stems of an identifier, path segment or title. */
function words(text: string): string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3 && !/\d/.test(word))
    .map((word) =>
      word.length > 4 && word.endsWith("s") && !word.endsWith("ss")
        ? word.slice(0, -1)
        : word,
    );
}

// implements REQ-kb-unowned-file-candidates
/**
 * The topic words of a workspace path, without layout, language and role
 * words (`src/app/pages/coach-dashboard/coach-dashboard.html` -> `coach`,
 * `dashboard`).
 */
export function pathTopicWords(relativePath: string): string[] {
  const segments = relativePath.split(/[\\/]/).filter(Boolean);
  const last = segments.pop() ?? "";
  const dot = last.indexOf(".");
  const parts = dot >= 0 ? [last.slice(0, dot), last.slice(dot + 1)] : [last];
  const found = [...segments, ...parts]
    .flatMap(words)
    .filter((word) => !LAYOUT_WORDS.has(word) && !FILLER_WORDS.has(word));
  return [...new Set(found)];
}

// implements REQ-kb-unowned-file-candidates
export type RequirementCandidate = {
  readonly id: string;
  readonly title: string;
  readonly status?: string;
};

// implements REQ-kb-unowned-file-candidates
/**
 * Current requirements ranked by how many of the path's topic words their
 * title shares, then by how often the title uses them, then by id; only
 * those sharing at least one word.
 */
export function rankRequirementCandidates(
  relativePath: string,
  requirements: readonly RequirementCandidate[],
  limit: number = MAX_CANDIDATES,
): RequirementCandidate[] {
  const topic = new Set(pathTopicWords(relativePath));
  if (topic.size === 0) return [];
  const scored: {
    requirement: RequirementCandidate;
    shared: number;
    uses: number;
  }[] = [];
  for (const requirement of requirements) {
    if (
      requirement.status !== undefined &&
      RETIRED_STATUS.test(requirement.status)
    )
      continue;
    const matched = words(requirement.title).filter((word) => topic.has(word));
    const shared = new Set(matched).size;
    if (shared > 0) scored.push({ requirement, shared, uses: matched.length });
  }
  scored.sort(
    (a, b) =>
      b.shared - a.shared ||
      b.uses - a.uses ||
      a.requirement.id.localeCompare(b.requirement.id),
  );
  return scored.slice(0, limit).map((entry) => entry.requirement);
}

function unquote(value: string): string {
  const trimmed = value.trim();
  return /^(["']).*\1$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
}

function readRequirementHead(file: string): RequirementCandidate | undefined {
  let head: string;
  try {
    const descriptor = openSync(file, "r");
    try {
      const buffer = Buffer.alloc(HEAD_BYTES);
      const bytes = readSync(descriptor, buffer, 0, buffer.length, 0);
      head = buffer.subarray(0, bytes).toString("utf8");
    } finally {
      closeSync(descriptor);
    }
  } catch {
    return undefined;
  }
  const lines = head.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return undefined;
  const fields: Record<string, string> = {};
  for (const line of lines.slice(1)) {
    if (line.trim() === "---") break;
    const match = /^(id|title|status):\s*(.+)$/.exec(line);
    if (match?.[1] && match[2]) fields[match[1]] = unquote(match[2]);
  }
  if (!fields.id || !fields.title) return undefined;
  return {
    id: fields.id,
    title: fields.title,
    ...(fields.status ? { status: fields.status } : {}),
  };
}

function readRequirementHeads(workspaceRoot: string): RequirementCandidate[] {
  const directory = path.join(workspaceRoot, REQUIREMENTS_DIR);
  let names: string[];
  try {
    names = readdirSync(directory).filter((name) => name.endsWith(".md"));
  } catch {
    return [];
  }
  return names
    .map((name) => readRequirementHead(path.join(directory, name)))
    .filter(
      (requirement): requirement is RequirementCandidate =>
        requirement !== undefined,
    );
}

function truncate(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

/** Files the unowned note does not apply to: the KB itself and prose. */
function isKnowledgeOrProse(file: string): boolean {
  return file.startsWith(".kb/") || /\.mdx?$/i.test(file);
}

// implements REQ-kb-unowned-file-candidates
export type UnownedFileDiagnosticsOptions = {
  readonly workspaceRoot: string;
  /** Workspace-relative files the check was asked about. */
  readonly requestedFiles: readonly string[];
  /** Files where some manifest symbol carries a traceability link. */
  readonly linkedSourceFiles: ReadonlySet<string>;
};

// implements REQ-kb-unowned-file-candidates
/**
 * One `source_file_unowned` note per requested file without a linked symbol,
 * naming the current requirements whose titles share its path words.
 */
export function createUnownedFileDiagnostics(
  options: UnownedFileDiagnosticsOptions,
): KibiImpactDiagnostic[] {
  const files = [...new Set(options.requestedFiles)].filter(
    (file) => !options.linkedSourceFiles.has(file) && !isKnowledgeOrProse(file),
  );
  if (files.length === 0) return [];
  const requirements = readRequirementHeads(options.workspaceRoot);
  return files.map((file) => {
    const candidates = rankRequirementCandidates(file, requirements);
    const named = candidates
      .map(
        (candidate) =>
          `${candidate.id} (${truncate(candidate.title, MAX_TITLE)})`,
      )
      .join("; ");
    const lead = `No symbol in ${file} is linked to a requirement, so this check finds no owner for it; that does not mean no recorded rule covers the behavior it implements.`;
    const record =
      "If none does and the change adds behavior, record a requirement with a scenario and link it with implements as part of this change; if behavior is unchanged, say so in the final report.";
    return {
      id: "source_file_unowned",
      severity: "info",
      blocking: false,
      category: "requirement",
      files: [file],
      docs: ["docs/symbol-traceability-taxonomy.md"],
      message:
        candidates.length > 0
          ? `${lead} Requirements whose titles share its path words: ${named}.`
          : lead,
      suggestion:
        candidates.length > 0
          ? `kb_query each candidate to see whether it describes the changed behavior; when one does, link the symbol that implements it (for markup, the component that renders it) with implements and name the requirement in the final report. ${record}`
          : `kb_search({query:"<the behavior>", sourceLocations:[{path:${JSON.stringify(file)}}]}) for a requirement that already describes it. ${record}`,
      evidence: {
        candidates: candidates.map(({ id, title }) => ({ id, title })),
      },
    };
  });
}
