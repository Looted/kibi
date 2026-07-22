// implements REQ-opencode-file-context-guidance-v1
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { getFileLinkedTargetsByType } from "./file-entity-links.js";

// ── Types ───────────────────────────────────────────────────────

export interface E2eCoverageSignal {
  level: "exact" | "heuristic" | "none";
  evidence: string[];
  reminderText: string | null;
}

type TestDocMeta = {
  id: string;
  title: string;
  status?: string;
  tags?: string[];
  source?: string;
  body?: string;
};

// ── TEST doc reader ──────────────────────────────────────────────
//
// Reads a TEST-*.md file from documentation/tests/ and extracts
// frontmatter tags, source, and body.

function readTestDoc(worktree: string, testId: string): TestDocMeta | null {
  // Try common locations for TEST docs
  const candidates = [
    `documentation/tests/${testId}.md`,
    `documentation/tests/${testId.toLowerCase()}.md`,
  ];

  for (const rel of candidates) {
    const fullPath = path.join(worktree, rel);
    if (existsSync(fullPath)) {
      try {
        const content = readFileSync(fullPath, "utf8");
        return parseTestDoc(content, testId);
      } catch (error) {
        if (!(error instanceof Error)) throw error;
      }
    }
  }

  return null;
}

function parseTestDoc(content: string, id: string): TestDocMeta {
  const result: TestDocMeta = { id, title: id };

  // Extract frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch || fmMatch[1] === undefined) {
    result.body = content;
    return result;
  }

  const frontmatter = fmMatch[1];

  // Parse title
  const titleMatch = frontmatter.match(/^title:\s*(.+)$/m);
  if (titleMatch && titleMatch[1] !== undefined) {
    result.title = titleMatch[1].trim();
  }

  // Parse status
  const statusMatch = frontmatter.match(/^status:\s*(.+)$/m);
  if (statusMatch && statusMatch[1] !== undefined) {
    result.status = statusMatch[1].trim();
  }

  // Parse source
  const sourceMatch = frontmatter.match(/^source:\s*(.+)$/m);
  if (sourceMatch && sourceMatch[1] !== undefined) {
    result.source = sourceMatch[1].trim();
  }

  // Parse tags
  const tagsMatch = frontmatter.match(/^tags:\s*$/m);
  if (tagsMatch) {
    const afterTags = frontmatter.slice(
      frontmatter.indexOf("tags:") + "tags:".length,
    );
    const tagLines = afterTags.match(/^\s+-\s+(.+)$/gm);
    if (tagLines) {
      result.tags = tagLines.map((l) => l.replace(/^\s+-\s+/, "").trim());
    }
  }

  // Extract body (after frontmatter)
  const bodyMatch = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  if (bodyMatch && bodyMatch[1] !== undefined) {
    result.body = bodyMatch[1];
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
  if (doc.tags?.includes("e2e")) return true;

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
  // These are broad test manifests, not file-specific e2e evidence
  return /^TEST-opencode-.*-plugin-v\d+$/.test(testId);
}

function docNamesPath(
  doc: TestDocMeta,
  queryRelPath: string,
  distRelPath: string | null,
  srcCorrespondingPath: string | null,
): boolean {
  const body = doc.body ?? "";
  return (
    body.includes(queryRelPath) ||
    (distRelPath !== null && body.includes(distRelPath)) ||
    (srcCorrespondingPath !== null && body.includes(srcCorrespondingPath))
  );
}

// ── Main exported function ───────────────────────────────────────

const EXACT_REMINDER =
  "- This file has existing e2e coverage. Check whether the e2e tests and linked TEST entities need updates.";

const HEURISTIC_REMINDER =
  "- This file may have related e2e coverage. Check the linked e2e tests if this change affects behavior.";

// implements REQ-opencode-file-context-guidance-v1
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
  let distRelPath: string | null = null;
  let srcCorrespondingPath: string | null = null;
  if (srcRelPath.startsWith("packages/opencode/dist/")) {
    distRelPath = srcRelPath;
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
    const namesPath = docNamesPath(
      doc,
      srcRelPath,
      distRelPath,
      srcCorrespondingPath,
    );

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

  // Step 2: Also check heuristic path rules when no exact evidence
  if (exactEvidence.length === 0 && heuristicEvidence.length === 0) {
    // Narrow heuristic: file under packages/opencode/src/ and a test doc body names it
    // This is already covered by the linked targets loop above since we check docNamesPath
    // No additional scanning needed - we only inspect linked docs
  }

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
