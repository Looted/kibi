/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * Split `kibi prove --all` over parallel CI runners and join the results.
 *
 * Each shard runs `kibi prove --all --shard K/N`, then `collect` saves what it
 * selected (`list.json`), its prove output (`prove.log`) and every file the
 * run changed. The join job downloads all shards and `join` refuses unless:
 *   - shards 1..N of one N each reported once;
 *   - the shards' selections are disjoint and together equal the join's own
 *     `kibi prove --all --list`;
 *   - every selected test has a passed result in its shard's prove summary;
 *   - every changed file is the receipt file of a test in that shard.
 * Only then does it copy the receipts into the checkout, so the evidence-floor
 * gate that follows sees exactly what one full run would have written.
 *
 * Usage:
 *   bun scripts/ci-proof-shards.ts collect <out-dir>
 *   bun scripts/ci-proof-shards.ts join <shards-dir> <all-list.json>
 */

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type ShardOutput = Readonly<{
  /** Directory name, for messages. */
  name: string;
  /** `kibi prove --list` output of the shard. */
  list: unknown;
  /** Full stdout of the shard's `kibi prove`. */
  proveLog: string;
  /** Repository-relative paths the shard's prove run changed. */
  changed: unknown;
}>;

export type ShardCopy = Readonly<{ shard: string; file: string }>;

const RECEIPT_FILE = /^\.kb\/tests\/([^/]+)\.md$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringList(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? (value as string[])
    : null;
}

/** The test ids of a `kibi prove --list` output, or null when malformed. */
export function listedTests(list: unknown): string[] | null {
  return isRecord(list) ? stringList(list.tests) : null;
}

/** The `K/N` of a shard's list, or null when it names none. */
export function listedShard(
  list: unknown,
): { index: number; count: number } | null {
  if (!isRecord(list) || typeof list.shard !== "string") return null;
  const match = /^([1-9]\d*)\/([1-9]\d*)$/.exec(list.shard);
  if (!match) return null;
  const index = Number(match[1]);
  const count = Number(match[2]);
  return index <= count ? { index, count } : null;
}

/** Test ids with a passed result in the JSON summary that ends a prove log. */
export function passedTests(proveLog: string): Set<string> | null {
  const last = proveLog
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("{"))
    .at(-1);
  if (last === undefined) return null;
  let summary: unknown;
  try {
    summary = JSON.parse(last);
  } catch {
    return null;
  }
  if (
    !isRecord(summary) ||
    summary.failed !== 0 ||
    !Array.isArray(summary.runs)
  )
    return null;
  const passed = new Set<string>();
  for (const run of summary.runs) {
    if (!isRecord(run) || !Array.isArray(run.results)) return null;
    for (const result of run.results)
      if (
        isRecord(result) &&
        typeof result.testId === "string" &&
        result.outcome === "passed"
      )
        passed.add(result.testId);
  }
  return passed;
}

/**
 * Check the shards against the full selection and return the receipt files
 * to copy. Throws with every problem found, so one failed join names them all.
 */
export function verifyShards(
  expected: readonly string[],
  shards: readonly ShardOutput[],
): ShardCopy[] {
  const problems: string[] = [];
  const owner = new Map<string, string>();
  const indexes = new Map<number, string>();
  const counts = new Set<number>();
  const copies: ShardCopy[] = [];
  const copied = new Map<string, string>();
  for (const shard of shards) {
    const tests = listedTests(shard.list);
    const position = listedShard(shard.list);
    if (tests === null || position === null) {
      problems.push(
        `${shard.name}: list.json is not a kibi prove --shard --list output`,
      );
      continue;
    }
    counts.add(position.count);
    const label = `${shard.name} (${position.index}/${position.count})`;
    const twin = indexes.get(position.index);
    if (twin !== undefined)
      problems.push(
        `${label}: shard ${position.index} also reported by ${twin}`,
      );
    indexes.set(position.index, shard.name);
    for (const id of tests) {
      const other = owner.get(id);
      if (other !== undefined)
        problems.push(`${id}: selected by ${other} and ${shard.name}`);
      owner.set(id, shard.name);
    }
    const passed = passedTests(shard.proveLog);
    if (passed === null)
      problems.push(`${label}: prove.log has no summary with zero failures`);
    else
      for (const id of tests)
        if (!passed.has(id))
          problems.push(`${id}: no passed result in ${label}`);
    const changed = stringList(shard.changed);
    if (changed === null) {
      problems.push(`${label}: changed.json is not a list of paths`);
      continue;
    }
    const mine = new Set(tests);
    for (const file of changed) {
      const id = RECEIPT_FILE.exec(file)?.[1];
      if (id === undefined || !mine.has(id)) {
        problems.push(
          `${label}: changed ${file}, which is not the receipt file of one of its tests`,
        );
        continue;
      }
      const other = copied.get(file);
      if (other !== undefined)
        problems.push(`${file}: changed by ${other} and ${shard.name}`);
      copied.set(file, shard.name);
      copies.push({ shard: shard.name, file });
    }
  }
  const [count] = counts;
  if (counts.size > 1)
    problems.push(
      `shards disagree on the shard count: ${[...counts].sort().join(", ")}`,
    );
  else if (count === undefined) problems.push("no shard reported");
  else
    for (let index = 1; index <= count; index += 1)
      if (!indexes.has(index))
        problems.push(`shard ${index}/${count} did not report`);
  for (const id of expected)
    if (!owner.has(id))
      problems.push(`${id}: selected by kibi prove --all but by no shard`);
  const all = new Set(expected);
  for (const id of owner.keys())
    if (!all.has(id))
      problems.push(`${id}: selected by a shard but not by kibi prove --all`);
  if (problems.length > 0)
    throw new Error(
      `proof shards do not add up to one full run:\n${problems.join("\n")}`,
    );
  return copies;
}

async function readJson(file: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return undefined;
  }
}

/** Paths the working tree changed or added, ignoring ignored files. */
export async function changedPaths(root: string): Promise<string[]> {
  const { stdout } = await execFileAsync(
    "git",
    ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
    { cwd: root, maxBuffer: 64 * 1024 * 1024 },
  );
  const paths: string[] = [];
  const entries = stdout.split("\0");
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index] as string;
    if (entry.length < 4) continue;
    paths.push(entry.slice(3));
    // A rename or copy carries its source path as the next entry.
    if (entry[0] === "R" || entry[0] === "C") index += 1;
  }
  return paths.sort();
}

export async function collect(root: string, out: string): Promise<number> {
  const changed = await changedPaths(root);
  await mkdir(path.join(out, "files"), { recursive: true });
  for (const file of changed) {
    // A deleted path has nothing to copy; join still refuses it by name.
    if (!existsSync(path.join(root, file))) continue;
    await mkdir(path.dirname(path.join(out, "files", file)), {
      recursive: true,
    });
    await copyFile(path.join(root, file), path.join(out, "files", file));
  }
  await writeFile(
    path.join(out, "changed.json"),
    `${JSON.stringify(changed)}\n`,
  );
  return changed.length;
}

export async function join(
  root: string,
  shardsDir: string,
  allListFile: string,
): Promise<ShardCopy[]> {
  const expected = listedTests(await readJson(allListFile));
  if (expected === null)
    throw new Error(`${allListFile} is not a kibi prove --list output`);
  const names = (await readdir(shardsDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const shards: ShardOutput[] = [];
  for (const name of names) {
    const dir = path.join(shardsDir, name);
    shards.push({
      name,
      list: await readJson(path.join(dir, "list.json")),
      proveLog: await readFile(path.join(dir, "prove.log"), "utf8").catch(
        () => "",
      ),
      changed: await readJson(path.join(dir, "changed.json")),
    });
  }
  const copies = verifyShards(expected, shards);
  for (const copy of copies)
    await copyFile(
      path.join(shardsDir, copy.shard, "files", copy.file),
      path.join(root, copy.file),
    );
  return copies;
}

export async function main(argv: readonly string[]): Promise<number> {
  const [command, ...args] = argv;
  try {
    if (command === "collect" && args.length === 1) {
      const count = await collect(process.cwd(), args[0] as string);
      process.stdout.write(`collected ${count} changed file(s)\n`);
      return 0;
    }
    if (command === "join" && args.length === 2) {
      const copies = await join(
        process.cwd(),
        args[0] as string,
        args[1] as string,
      );
      process.stdout.write(
        `joined ${copies.length} receipt file(s) from the proof shards\n`,
      );
      return 0;
    }
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n`);
    return 1;
  }
  process.stderr.write(
    "usage: ci-proof-shards.ts collect <out-dir> | join <shards-dir> <all-list.json>\n",
  );
  return 2;
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
