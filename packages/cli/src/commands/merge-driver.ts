import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { type Document, type YAMLMap, isMap, isSeq, parseDocument } from "yaml";
import type { CommandResult } from "../cli-command.js";

/**
 * Same serialization options as authored manifest writes, so a merge that
 * changes nothing reproduces the input bytes and edits never refold rows.
 */
const AUTHORED_YAML_OPTIONS = { lineWidth: 0 } as const;

/**
 * Top-level lists Kibi keeps keyed by `id`: `.kb/symbols.yaml` and the
 * `.kb/relationships/*.yaml` shards.
 */
const ID_KEYED_LISTS = ["symbols", "relationships"] as const;

/** Record fields whose values are sets: concurrent additions union instead of conflicting. */
const SET_FIELDS = new Set(["relationships", "links"]);

export type KbManifestMergeResult =
  | { readonly status: "merged"; readonly content: string }
  | { readonly status: "conflict"; readonly conflicts: readonly string[] };

interface ParsedManifest {
  readonly doc: Document;
  readonly listKey: string | undefined;
  readonly records: Map<string, { node: YAMLMap; value: unknown }>;
  readonly order: readonly string[];
  readonly rest: Record<string, unknown>;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

function same(left: unknown, right: unknown): boolean {
  return canonical(left) === canonical(right);
}

function parseManifest(
  label: string,
  content: string,
  conflicts: string[],
): ParsedManifest | null {
  const doc = parseDocument(content);
  if (doc.errors.length > 0) {
    conflicts.push(`${label}: not valid YAML (${doc.errors[0]?.message})`);
    return null;
  }
  const top = doc.toJS() ?? {};
  if (typeof top !== "object" || Array.isArray(top)) {
    conflicts.push(`${label}: top level is not a mapping`);
    return null;
  }
  const listKeys = ID_KEYED_LISTS.filter((key) => key in top);
  if (listKeys.length > 1) {
    conflicts.push(`${label}: holds both ${listKeys.join(" and ")}`);
    return null;
  }
  const listKey = listKeys[0];
  const rest = { ...(top as Record<string, unknown>) };
  if (listKey) delete rest[listKey];
  const records = new Map<string, { node: YAMLMap; value: unknown }>();
  const order: string[] = [];
  const seq = listKey ? doc.get(listKey, true) : undefined;
  if (seq === undefined || seq === null) {
    return { doc, listKey, records, order, rest };
  }
  if (!isSeq(seq)) {
    conflicts.push(`${label}: ${listKey} is not a list`);
    return null;
  }
  for (const item of seq.items) {
    const id = isMap(item) ? item.get("id") : undefined;
    if (!isMap(item) || typeof id !== "string" || !id) {
      conflicts.push(`${label}: ${listKey} entry without a string id`);
      return null;
    }
    if (records.has(id)) {
      conflicts.push(`${label}: duplicate id ${id}`);
      return null;
    }
    records.set(id, { node: item, value: item.toJS(doc) });
    order.push(id);
  }
  return { doc, listKey, records, order, rest };
}

/** Three-way merge of a set-valued field: keep ours, drop their removals, add their additions. */
function mergeSet(base: unknown, ours: unknown, theirs: unknown): unknown[] {
  const list = (value: unknown) => (Array.isArray(value) ? value : []);
  const baseKeys = new Set(list(base).map(canonical));
  const theirKeys = new Set(list(theirs).map(canonical));
  const merged = list(ours).filter((entry) => {
    const key = canonical(entry);
    return !(baseKeys.has(key) && !theirKeys.has(key));
  });
  const mergedKeys = new Set(merged.map(canonical));
  for (const entry of list(theirs)) {
    const key = canonical(entry);
    if (baseKeys.has(key) || mergedKeys.has(key)) continue;
    merged.push(entry);
    mergedKeys.add(key);
  }
  return merged;
}

function mergeRecord(
  id: string,
  base: Record<string, unknown> | undefined,
  ours: Record<string, unknown>,
  theirs: Record<string, unknown>,
  conflicts: string[],
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  const keys = [
    ...Object.keys(ours),
    ...Object.keys(theirs).filter((key) => !(key in ours)),
  ];
  for (const key of keys) {
    const baseValue = base?.[key];
    const ourValue = ours[key];
    const theirValue = theirs[key];
    let value: unknown;
    if (same(ourValue, theirValue) || same(theirValue, baseValue)) {
      value = ourValue;
    } else if (same(ourValue, baseValue)) {
      value = theirValue;
    } else if (
      SET_FIELDS.has(key) &&
      [baseValue, ourValue, theirValue].every(
        (entry) => entry === undefined || Array.isArray(entry),
      )
    ) {
      value = mergeSet(baseValue, ourValue, theirValue);
    } else {
      conflicts.push(`${id}: both sides changed ${key}`);
      continue;
    }
    if (value !== undefined) merged[key] = value;
  }
  return merged;
}

/**
 * Three-way merge of an id-keyed Kibi manifest (`.kb/symbols.yaml` or a
 * `.kb/relationships/*.yaml` shard).
 *
 * Both sides usually append new records at the end of the list, which Git
 * reports as a conflict although the additions are independent. This merge
 * keeps every record either side added, applies edits made on only one
 * side, honors a deletion made on one side when the other left the record
 * unchanged, and unions concurrent relationship and link additions on one
 * symbol. Anything else both sides changed differently is a real conflict
 * and is reported rather than guessed.
 */
// implements REQ-cli-kb-merge-driver
export function mergeKbManifests(
  baseContent: string,
  oursContent: string,
  theirsContent: string,
): KbManifestMergeResult {
  const conflicts: string[] = [];
  const base = parseManifest("base", baseContent, conflicts);
  const ours = parseManifest("ours", oursContent, conflicts);
  const theirs = parseManifest("theirs", theirsContent, conflicts);
  if (!base || !ours || !theirs) return { status: "conflict", conflicts };

  const listKeys = new Set(
    [base.listKey, ours.listKey, theirs.listKey].filter(Boolean),
  );
  if (listKeys.size > 1) {
    return {
      status: "conflict",
      conflicts: [`sides hold different lists: ${[...listKeys].join(", ")}`],
    };
  }
  const listKey = ours.listKey ?? theirs.listKey;

  if (!same(ours.rest, theirs.rest) && !same(theirs.rest, base.rest)) {
    if (!same(ours.rest, base.rest)) {
      return {
        status: "conflict",
        conflicts: ["both sides changed top-level manifest fields"],
      };
    }
    for (const key of Object.keys(ours.rest)) {
      if (!(key in theirs.rest)) ours.doc.delete(key);
    }
    for (const [key, value] of Object.entries(theirs.rest)) {
      ours.doc.set(key, value);
    }
  }
  if (!listKey) {
    return {
      status: "merged",
      content: ours.doc.toString(AUTHORED_YAML_OPTIONS),
    };
  }

  const items: unknown[] = [];
  for (const id of ours.order) {
    const ourRecord = ours.records.get(id);
    if (!ourRecord) continue;
    const baseRecord = base.records.get(id);
    const theirRecord = theirs.records.get(id);
    if (!theirRecord) {
      if (!baseRecord) items.push(ourRecord.node);
      else if (!same(ourRecord.value, baseRecord.value)) {
        conflicts.push(`${id}: changed on ours but deleted on theirs`);
      }
      continue;
    }
    if (
      same(ourRecord.value, theirRecord.value) ||
      (baseRecord && same(theirRecord.value, baseRecord.value))
    ) {
      items.push(ourRecord.node);
    } else if (baseRecord && same(ourRecord.value, baseRecord.value)) {
      items.push(theirRecord.node.clone());
    } else {
      const merged = mergeRecord(
        id,
        baseRecord?.value as Record<string, unknown> | undefined,
        ourRecord.value as Record<string, unknown>,
        theirRecord.value as Record<string, unknown>,
        conflicts,
      );
      items.push(ours.doc.createNode(merged));
    }
  }
  for (const id of theirs.order) {
    if (ours.records.has(id)) continue;
    const theirRecord = theirs.records.get(id);
    if (!theirRecord) continue;
    const baseRecord = base.records.get(id);
    if (!baseRecord) items.push(theirRecord.node.clone());
    else if (!same(theirRecord.value, baseRecord.value)) {
      conflicts.push(`${id}: deleted on ours but changed on theirs`);
    }
  }
  if (conflicts.length > 0) return { status: "conflict", conflicts };

  const seq = ours.doc.get(listKey, true);
  if (isSeq(seq)) seq.items = items;
  else ours.doc.set(listKey, ours.doc.createNode(items));
  return {
    status: "merged",
    content: ours.doc.toString(AUTHORED_YAML_OPTIONS),
  };
}

function readOptional(filePath: string): string {
  try {
    return readFileSync(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }
}

/**
 * Git merge driver entry point: `kibi merge-driver %O %A %B`.
 *
 * Writes the merged manifest to the current (`%A`) file and exits 0. On a
 * real conflict it prints each one and falls back to Git's textual merge so
 * the file carries ordinary conflict markers, then exits 1 so Git keeps the
 * path unmerged.
 */
// implements REQ-cli-kb-merge-driver
export async function mergeDriverCommand(
  basePath: string,
  currentPath: string,
  otherPath: string,
): Promise<CommandResult> {
  const result = mergeKbManifests(
    readOptional(basePath),
    readFileSync(currentPath, "utf8"),
    readFileSync(otherPath, "utf8"),
  );
  if (result.status === "merged") {
    writeFileSync(currentPath, result.content);
    return { exitCode: 0 };
  }
  for (const conflict of result.conflicts) {
    console.error(`kibi merge-driver: ${conflict}`);
  }
  spawnSync(
    "git",
    [
      "merge-file",
      "-L",
      "ours",
      "-L",
      "base",
      "-L",
      "theirs",
      currentPath,
      basePath,
      otherPath,
    ],
    { stdio: "inherit" },
  );
  return { exitCode: 1 };
}
