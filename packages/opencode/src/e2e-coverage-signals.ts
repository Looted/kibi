import { readFileSync } from "node:fs";
import * as path from "node:path";
import { getFileLinkedTargetsByType } from "./file-entity-links.js";

// ── Types ───────────────────────────────────────────────────────

export interface E2eCoverageSignal {
  level: "exact" | "heuristic" | "none";
  evidence: string[];
  reminderText: string | null;
}

type TestDocMeta = {
  /** Whether `e2e` is one of the frontmatter tags. */
  e2eTagged?: boolean;
  source?: string;
  body: string;
};

// ── TEST doc reader ──────────────────────────────────────────────
//
// Reads a TEST-*.md file from .kb/tests/ and extracts
// frontmatter tags, source, and body.

function readTestDocText(worktree: string, testId: string): string | undefined {
  // Try common locations for TEST docs
  for (const rel of [
    `.kb/tests/${testId}.md`,
    `.kb/tests/${testId.toLowerCase()}.md`,
  ]) {
    try {
      return readFileSync(path.join(worktree, rel), "utf8");
    } catch (error) {
      // Missing or unreadable: try the next location.
      if (!(error instanceof Error)) throw error;
    }
  }
  return undefined;
}

function readTestDoc(worktree: string, testId: string): TestDocMeta | null {
  const content = readTestDocText(worktree, testId);
  return content === undefined ? null : parseTestDoc(content);
}

function parseTestDoc(content: string): TestDocMeta {
  // Extract frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) {
    return { body: content };
  }

  // The capture group always participates when the pattern matches.
  const frontmatter = fmMatch[1] as string;
  // Everything after the closing fence is body.
  const result: TestDocMeta = { body: content.slice(fmMatch[0].length) };

  // Parse source (trim() also drops the space after the colon)
  const sourceMatch = /^source:(.+)/m.exec(frontmatter);
  if (sourceMatch) {
    result.source = (sourceMatch[1] as string).trim();
  }

  // Parse tags: the list items directly under a bare `tags:` line
  const lines = frontmatter.split("\n");
  const tagsLine = lines.findIndex((line) => /^tags:\s*$/.test(line));
  if (tagsLine !== -1) {
    for (const line of lines.slice(tagsLine + 1)) {
      const item = /^\s+-(.+)/.exec(line);
      if (!item) break;
      if ((item[1] as string).trim() === "e2e") result.e2eTagged = true;
    }
  }

  return result;
}

// ── E2e detection predicates ─────────────────────────────────────

const E2E_SOURCE_PREFIXES = [
  "documentation/tests/e2e/",
  "documentation/tests/e2e/packed/",
];

function isExactE2eEvidence(doc: TestDocMeta): boolean {
  // (a) has e2e tag
  if (doc.e2eTagged) return true;

  // (b) source points into e2e directories
  if (doc.source) {
    for (const prefix of E2E_SOURCE_PREFIXES) {
      if (doc.source.startsWith(prefix)) return true;
    }
  }

  return false;
}

function isPackageLevelUmbrellaDoc(testId: string): boolean {
  // Package-level umbrella docs like TEST-opencode-kibi-plugin-v1
  // These are broad test manifests, not file-specific e2e evidence.
  // Callers only pass TEST- ids, so the start needs no anchor.
  return /TEST-opencode-.*-plugin-v\d+$/.test(testId);
}

function docNamesPath(
  doc: TestDocMeta,
  queryRelPath: string,
  srcCorrespondingPath: string | null,
): boolean {
  // For dist/ files the query path is the dist path itself.
  return (
    doc.body.includes(queryRelPath) ||
    (srcCorrespondingPath !== null && doc.body.includes(srcCorrespondingPath))
  );
}

// ── Main exported function ───────────────────────────────────────

const EXACT_REMINDER =
  "- This file has existing e2e coverage. Check whether the e2e tests and linked TEST entities need updates.";

const HEURISTIC_REMINDER =
  "- This file may have related e2e coverage. Check the linked e2e tests if this change affects behavior.";

export function getE2eCoverageSignal(
  worktree: string,
  filePath: string,
): E2eCoverageSignal {
  // Compute relative paths for heuristic matching
  const srcRelPath = path
    .relative(worktree, filePath)
    .split(path.sep)
    .join("/");

  // For dist/ files, compute the matching src/ path
  let srcCorrespondingPath: string | null = null;
  if (srcRelPath.startsWith("packages/opencode/dist/")) {
    // Derive the src/ path: packages/opencode/dist/toast.js → packages/opencode/src/toast.ts
    const distSuffix = srcRelPath.slice("packages/opencode/dist/".length);
    const baseName = distSuffix.replace(/\.js$/, ".ts");
    srcCorrespondingPath = `packages/opencode/src/${baseName}`;
  }

  // Step 1: Get linked TEST-* targets via symbols.yaml relationships
  // Try the actual file path first, then also try the src/ corresponding path for dist/ files
  let linkedTargets = getFileLinkedTargetsByType(worktree, filePath, [
    "covered_by",
    "executable_for",
  ]);

  if (linkedTargets.length === 0 && srcCorrespondingPath) {
    const srcAbsPath = path.join(worktree, srcCorrespondingPath);
    linkedTargets = getFileLinkedTargetsByType(worktree, srcAbsPath, [
      "covered_by",
      "executable_for",
    ]);
  }

  // Track exact and heuristic evidence
  const exactEvidence: string[] = [];
  const heuristicEvidence: string[] = [];

  for (const targetId of linkedTargets) {
    if (!targetId.startsWith("TEST-")) continue;

    const doc = readTestDoc(worktree, targetId);
    if (!doc) continue;

    const isUmbrella = isPackageLevelUmbrellaDoc(targetId);
    const hasExactE2e = isExactE2eEvidence(doc);
    const namesPath = docNamesPath(doc, srcRelPath, srcCorrespondingPath);

    if (isUmbrella) {
      // Package-level umbrella docs are demoted to heuristic at most
      // and only if they explicitly name the path
      if (namesPath) {
        heuristicEvidence.push(
          `${targetId} (umbrella doc names path: ${srcRelPath})`,
        );
      }
      // Never exact for umbrella docs
      continue;
    }

    if (hasExactE2e) {
      exactEvidence.push(targetId);
    } else if (namesPath) {
      // Heuristic: non-e2e doc that explicitly names the source path
      heuristicEvidence.push(`${targetId} (doc names path: ${srcRelPath})`);
    }
  }

  // Only linked docs are inspected: there is no extra path scanning.
  // Step 3: Resolve level
  if (exactEvidence.length > 0) {
    return {
      level: "exact",
      evidence: exactEvidence,
      reminderText: EXACT_REMINDER,
    };
  }

  if (heuristicEvidence.length > 0) {
    return {
      level: "heuristic",
      evidence: heuristicEvidence,
      reminderText: HEURISTIC_REMINDER,
    };
  }

  return {
    level: "none",
    evidence: [],
    reminderText: null,
  };
}
