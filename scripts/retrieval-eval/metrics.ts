/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import type { ReplayCase } from "./cases.js";

export type CaseResult = Readonly<{
  case: ReplayCase;
  /** 1-based rank of the first expected id among the rows, Infinity if absent. */
  rank: number;
  rows: readonly string[];
  /** Characters of the answer the agent would read, when the retriever reports it. */
  chars?: number;
  ms: number;
}>;

export type Summary = Readonly<{
  n: number;
  r1: number;
  r5: number;
  r10: number;
  mrr: number;
  /** Share of cases whose expected decision is not among the rows at all. */
  missing: number;
  /** The weakest group's top-ten rate (an arc, or a decision). */
  weakestR10: number;
  weakestGroup: string;
  p50ms: number;
  p95ms: number;
  meanChars: number | null;
}>;

export function rankOf(rows: readonly string[], expected: readonly string[]) {
  const index = rows.findIndex((id) => expected.includes(id));
  return index < 0 ? Number.POSITIVE_INFINITY : index + 1;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return (
    sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0
  );
}

export function summarize(results: readonly CaseResult[]): Summary {
  const n = results.length;
  const share = (k: number) =>
    n === 0 ? 0 : results.filter((r) => r.rank <= k).length / n;
  const groups = new Map<string, CaseResult[]>();
  for (const result of results) {
    const rows = groups.get(result.case.group) ?? [];
    rows.push(result);
    groups.set(result.case.group, rows);
  }
  let weakestR10 = 1;
  let weakestGroup = "";
  // Only groups with a few cases say anything about a weakest group.
  for (const [group, rows] of groups) {
    if (rows.length < 3) continue;
    const rate = rows.filter((r) => r.rank <= 10).length / rows.length;
    if (rate < weakestR10) {
      weakestR10 = rate;
      weakestGroup = group;
    }
  }
  const chars = results.flatMap((r) =>
    r.chars === undefined ? [] : [r.chars],
  );
  return {
    n,
    r1: share(1),
    r5: share(5),
    r10: share(10),
    mrr:
      n === 0
        ? 0
        : results.reduce(
            (sum, r) => sum + (Number.isFinite(r.rank) ? 1 / r.rank : 0),
            0,
          ) / n,
    missing:
      n === 0 ? 0 : results.filter((r) => !Number.isFinite(r.rank)).length / n,
    weakestR10,
    weakestGroup,
    p50ms: percentile(
      results.map((r) => r.ms),
      0.5,
    ),
    p95ms: percentile(
      results.map((r) => r.ms),
      0.95,
    ),
    meanChars:
      chars.length === 0
        ? null
        : chars.reduce((a, b) => a + b, 0) / chars.length,
  };
}

const pct = (value: number) => `${Math.round(value * 100)}%`;

export function formatSummary(label: string, summary: Summary): string {
  return [
    label.padEnd(44),
    `n=${String(summary.n).padStart(3)}`,
    `top1 ${pct(summary.r1).padStart(4)}`,
    `top5 ${pct(summary.r5).padStart(4)}`,
    `top10 ${pct(summary.r10).padStart(4)}`,
    `missing ${pct(summary.missing).padStart(4)}`,
    `weakest ${pct(summary.weakestR10).padStart(4)}`,
    `p50 ${summary.p50ms.toFixed(0).padStart(5)}ms`,
    summary.meanChars === null
      ? ""
      : `chars ${summary.meanChars.toFixed(0).padStart(6)}`,
  ].join("  ");
}
