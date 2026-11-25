/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

// The replay's cases: what an agent asked or changed, and which decision
// governs it. Each fixture is frozen once written; see README.md.

import { readFileSync } from "node:fs";
import path from "node:path";

export type Edit = Readonly<{ path: string; old: string; new: string }>;

export type ReplayCase = Readonly<{
  id: string;
  /** The suite the case belongs to, for reporting. */
  suite: string;
  /** dev cases may guide design; holdout and report cases may not. */
  split: "dev" | "holdout" | "report";
  /** A control case has no governing decision. */
  control: boolean;
  /** Any of these counts as the governing decision. */
  expectedIds: readonly string[];
  query?: string;
  request?: string;
  /** Workspace files the session named before this point. */
  context: readonly string[];
  edits: readonly Edit[];
  /** Group for the weakest-group row (an arc, a decision). */
  group: string;
}>;

const FIXTURES = path.join(
  import.meta.dir,
  "../../documentation/evaluations/retrieval",
);
const CHANGE_TO_PROOF = path.join(
  import.meta.dir,
  "../../documentation/evaluations/change-to-proof",
);

function jsonl(file: string): Record<string, unknown>[] {
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String) : [];

/**
 * Searches agents typed in the Nov 25 crowded run. Every one is about a
 * decision a frozen benchmark arc also probes, so they are a report row and
 * never a tuning target.
 */
function agentSearches(): ReplayCase[] {
  return jsonl(path.join(FIXTURES, "papra-agent-searches.v1.jsonl"))
    .filter((row) => row.kind === "probe" || row.kind === "control")
    .map((row, index) => ({
      id: `agent-${index}`,
      suite: row.kind === "control" ? "agent-controls" : "agent-searches",
      split: "report",
      control: row.kind === "control",
      expectedIds: [String(row.expectedId)],
      query: String(row.query),
      context: strings(row.context),
      edits: [],
      group: String(row.arc),
    }));
}

/** Probe sessions of the same run that edited source, with their edits. */
function editSessions(): ReplayCase[] {
  return jsonl(path.join(FIXTURES, "papra-edit-sessions.v1.jsonl")).map(
    (row, index) => ({
      id: `edit-session-${index}`,
      suite: "edit-sessions",
      split: "report",
      control: false,
      expectedIds: [String(row.expectedId)],
      request: String(row.request),
      context: strings(row.context),
      edits: (row.edits as Edit[]).filter(
        (edit) =>
          /\.(?:ts|tsx|js|mjs)$/.test(edit.path) &&
          !/\.test\.|\.spec\./.test(edit.path),
      ),
      group: String(row.arc),
    }),
  );
}

/** A question in user language for each real Papra decision outside the frozen arcs. */
function decisionQuestions(): ReplayCase[] {
  return jsonl(path.join(FIXTURES, "papra-decision-questions.v1.jsonl")).map(
    (row) => ({
      id: String(row.id),
      suite: "decision-questions",
      split: row.split === "holdout" ? "holdout" : "dev",
      control: false,
      expectedIds: [String(row.expectedId)],
      query: String(row.query),
      context: [],
      edits: [],
      group: String(row.expectedId),
    }),
  );
}

/** A changed line or a new code path that leaves out a check, per linked symbol. */
function syntheticEdits(): ReplayCase[] {
  return jsonl(path.join(FIXTURES, "papra-synthetic-edits.v1.jsonl")).map(
    (row) => ({
      id: String(row.id),
      suite: `synthetic-${String(row.kind)}`,
      split: row.split === "holdout" ? "holdout" : "dev",
      control: false,
      expectedIds: strings(row.expectedIds),
      context: [String(row.path)],
      edits: row.edits as Edit[],
      group: String(row.expectedId),
    }),
  );
}

/** Kibi's own search gold sets, read as they are (they are gate inputs). */
function kibiGold(): ReplayCase[] {
  const sets: Array<[string, string]> = [
    ["repo-search-gold.v4.jsonl", "kibi-repo-gold"],
    ["repo-search-hints-gold.v1.jsonl", "kibi-hints-gold"],
  ];
  return sets.flatMap(([file, suite]) =>
    jsonl(path.join(CHANGE_TO_PROOF, file)).map((row) => ({
      id: String(row.id),
      suite,
      split: "dev" as const,
      control: false,
      expectedIds: strings(row.expectedIds),
      query: String(row.query),
      context: [],
      edits: [],
      group: String(row.id),
    })),
  );
}

/** Every replay case, each tagged with its suite and split. */
export function replayCases(): ReplayCase[] {
  return [
    ...agentSearches(),
    ...editSessions(),
    ...decisionQuestions(),
    ...syntheticEdits(),
    ...kibiGold(),
  ];
}
