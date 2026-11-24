/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { existsSync, readFileSync } from "node:fs";

/**
 * Measured per-shard wall time used to balance `--partition` jobs.
 * `costSeconds` on a shard is only the fallback when a shard has never been
 * measured. A stale number can unbalance the jobs; it cannot drop a shard.
 */
export const SHARD_COSTS_VERSION = "kibi.unit-coverage-costs.v1";

export type ShardCostSeconds = Readonly<Record<string, number>>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveSeconds(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0)
    return undefined;
  return value;
}

/** Shard label → seconds. An unreadable or foreign file yields nothing. */
export function parseShardCostFile(
  json: unknown,
): ShardCostSeconds | undefined {
  if (
    !isRecord(json) ||
    json.version !== SHARD_COSTS_VERSION ||
    !isRecord(json.shards)
  )
    return undefined;
  const shards: Record<string, number> = {};
  for (const [label, value] of Object.entries(json.shards)) {
    const seconds = positiveSeconds(value);
    if (label !== "" && seconds !== undefined) shards[label] = seconds;
  }
  return Object.keys(shards).length > 0 ? shards : undefined;
}

/**
 * The first readable cost file among `paths`. A missing path is skipped so a
 * cache restore that did not hit falls through to the committed seed.
 */
export function loadShardCosts(
  paths: readonly (string | undefined)[],
): ShardCostSeconds | undefined {
  for (const path of paths) {
    if (path === undefined || path.trim() === "" || !existsSync(path)) continue;
    try {
      const parsed = parseShardCostFile(JSON.parse(readFileSync(path, "utf8")));
      if (parsed !== undefined) return parsed;
    } catch {
      // A corrupt cache must not hide the committed seed behind it.
    }
  }
  return undefined;
}

function filePassed(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    ["tests", "failures", "skipped"].every(
      (key) => Number.isSafeInteger(value[key]) && Number(value[key]) >= 0,
    ) && value.failures === 0
  );
}

/**
 * Seconds measured by a successful shard, rounded up. A shard whose results
 * name a failing file, or that recorded no positive duration, is left out so
 * the previous cost stands.
 */
export function measuredShardCosts(
  results: readonly unknown[],
): ShardCostSeconds {
  const costs: Record<string, number> = {};
  for (const raw of results) {
    if (!isRecord(raw) || typeof raw.shard !== "string" || raw.shard === "")
      continue;
    if (
      typeof raw.durationMs !== "number" ||
      !Number.isSafeInteger(raw.durationMs) ||
      raw.durationMs <= 0
    )
      continue;
    if (!isRecord(raw.files)) continue;
    if (!Object.values(raw.files).every(filePassed)) continue;
    costs[raw.shard] = Math.max(1, Math.ceil(raw.durationMs / 1000));
  }
  return costs;
}

/** Measured seconds replace the previous cost of that shard; other shards stay. */
export function combineShardCosts(
  previous: ShardCostSeconds,
  measured: ShardCostSeconds,
): Record<string, number> {
  const shards: Record<string, number> = {};
  for (const [label, seconds] of Object.entries(previous)) {
    const kept = positiveSeconds(seconds);
    if (kept !== undefined) shards[label] = kept;
  }
  for (const [label, seconds] of Object.entries(measured)) {
    const next = positiveSeconds(seconds);
    if (next !== undefined) shards[label] = next;
  }
  return Object.fromEntries(
    Object.entries(shards).sort(([a], [b]) => a.localeCompare(b)),
  );
}

export function formatShardCostFile(
  shards: ShardCostSeconds,
  source: string,
): string {
  return `${JSON.stringify(
    {
      version: SHARD_COSTS_VERSION,
      source,
      shards: combineShardCosts({}, shards),
    },
    null,
    2,
  )}\n`;
}
