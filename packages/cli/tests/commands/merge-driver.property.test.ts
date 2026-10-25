import { describe, expect, test } from "bun:test";
import { parse, stringify } from "yaml";
import { mergeKbManifests } from "../../src/commands/merge-driver.js";

/*
 * Property tests for the three-way manifest merge. Each run builds a random
 * base manifest, applies a random edit script on each side, and checks laws
 * every correct merge obeys: no change reproduces the bytes, a one-sided
 * change wins, the result does not depend on which side is ours, edits to
 * different records or fields always merge to both edits applied, an id
 * either side added is never dropped, and two different values for one field
 * always conflict. Runs are seeded, so a failure names the seed that
 * replays it.
 */

const RUNS = 400;
const HEADER = "# symbols.yaml\n# AUTHORED fields (edit freely)\n";
const TITLES = ["alpha", "beta", "gamma", "delta"];
const STATUSES = ["active", "deprecated"];
const TARGETS = ["REQ-a", "REQ-b", "REQ-c", "REQ-d", "REQ-e"];

type Relationship = { type: string; target: string };
type SymbolRecord = {
  id: string;
  title: string;
  sourceFile: string;
  status?: string;
  relationships?: Relationship[];
};

type Edit =
  | { kind: "add"; record: SymbolRecord }
  | { kind: "delete"; id: string }
  | { kind: "set"; id: string; field: "title" | "status"; value: string }
  | { kind: "link"; id: string; target: string }
  | { kind: "unlink"; id: string; target: string };

function generator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)] as T;
}

function randomRecord(random: () => number, id: string): SymbolRecord {
  const record: SymbolRecord = {
    id,
    title: pick(random, TITLES),
    sourceFile: `src/${id}.ts`,
  };
  if (random() < 0.5) record.status = pick(random, STATUSES);
  const targets = TARGETS.filter(() => random() < 0.3);
  if (targets.length > 0) {
    record.relationships = targets.map((target) => ({
      type: "implements",
      target,
    }));
  }
  return record;
}

function render(records: readonly SymbolRecord[]): string {
  return `${HEADER}${stringify({ symbols: records }, { lineWidth: 0 })}`;
}

function clone(records: readonly SymbolRecord[]): SymbolRecord[] {
  return structuredClone(records) as SymbolRecord[];
}

/** Apply one edit; set fields keep set semantics (no duplicate targets). */
function apply(records: SymbolRecord[], edit: Edit): SymbolRecord[] {
  if (edit.kind === "add") return [...records, structuredClone(edit.record)];
  if (edit.kind === "delete") return records.filter((r) => r.id !== edit.id);
  return records.map((record) => {
    if (record.id !== edit.id) return record;
    const next = structuredClone(record);
    if (edit.kind === "set") next[edit.field] = edit.value;
    else {
      const current = next.relationships ?? [];
      const linked = current.some((rel) => rel.target === edit.target);
      if (edit.kind === "link" && !linked) {
        next.relationships = [
          ...current,
          { type: "implements", target: edit.target },
        ];
      } else if (edit.kind === "unlink") {
        next.relationships = current.filter(
          (rel) => rel.target !== edit.target,
        );
        if (next.relationships.length === 0) next.relationships = undefined;
      }
    }
    return next;
  });
}

/** A random edit script for one side; ids it adds carry the side's name. */
function randomEdits(
  random: () => number,
  base: readonly SymbolRecord[],
  side: string,
  allowed: (id: string, field: string) => boolean,
): Edit[] {
  let state = clone(base);
  const edits: Edit[] = [];
  // One edit per relationship target, so the script is its net change: a
  // link undone later on the same side is no change at all.
  const linkedTargets = new Set<string>();
  const count = Math.floor(random() * 4);
  for (let index = 0; index < count; index++) {
    const roll = random();
    const existing = state.filter((record) =>
      base.some((b) => b.id === record.id),
    );
    let edit: Edit | undefined;
    if (roll < 0.25) {
      edit = {
        kind: "add",
        record: randomRecord(random, `SYM-${side}-${index}`),
      };
    } else if (existing.length > 0) {
      const record = pick(random, existing);
      if (roll < 0.35) {
        if (allowed(record.id, "*")) edit = { kind: "delete", id: record.id };
      } else if (roll < 0.65) {
        const field = pick(random, ["title", "status"] as const);
        if (allowed(record.id, field)) {
          edit = {
            kind: "set",
            id: record.id,
            field,
            value: `${pick(random, TITLES)}-${side}`,
          };
        }
      } else if (allowed(record.id, "relationships")) {
        const target = pick(random, TARGETS);
        if (linkedTargets.has(`${record.id}/${target}`)) continue;
        linkedTargets.add(`${record.id}/${target}`);
        const linked = (record.relationships ?? []).some(
          (rel) => rel.target === target,
        );
        edit = linked
          ? { kind: "unlink", id: record.id, target }
          : { kind: "link", id: record.id, target };
      }
    }
    if (edit) {
      edits.push(edit);
      state = apply(state, edit);
    }
  }
  return edits;
}

/** id -> record, with relationships as a sorted set, so order is ignored. */
function semantic(content: string): Map<string, string> {
  const records = (parse(content)?.symbols ?? []) as SymbolRecord[];
  return new Map(
    records.map((record) => {
      const normalized = {
        ...record,
        relationships: (record.relationships ?? [])
          .map((rel) => `${rel.type}:${rel.target}`)
          .sort(),
      };
      const keys = Object.keys(normalized).sort();
      return [
        record.id,
        JSON.stringify(normalized, keys as (keyof typeof normalized)[]),
      ];
    }),
  );
}

function sameRecords(left: string, right: string, label = ""): void {
  expect([...semantic(left).entries()].sort(), label).toEqual(
    [...semantic(right).entries()].sort(),
  );
}

function touched(edits: readonly Edit[]): Set<string> {
  const keys = new Set<string>();
  for (const edit of edits) {
    if (edit.kind === "add") keys.add(`${edit.record.id}/*`);
    else if (edit.kind === "delete") keys.add(`${edit.id}/*`);
    else if (edit.kind === "set") keys.add(`${edit.id}/${edit.field}`);
    else keys.add(`${edit.id}/relationships`);
  }
  return keys;
}

function scenario(seed: number) {
  const random = generator(seed);
  const base = Array.from({ length: 1 + Math.floor(random() * 5) }, (_, i) =>
    randomRecord(random, `SYM-${i}`),
  );
  return { random, base };
}

describe("mergeKbManifests properties", () => {
  test("merging three identical sides reproduces the bytes", () => {
    for (let seed = 1; seed <= RUNS; seed++) {
      const { base } = scenario(seed);
      const text = render(base);
      expect(mergeKbManifests(text, text, text), `seed ${seed}`).toEqual({
        status: "merged",
        content: text,
      });
    }
  }, 60_000);

  test("a change made on one side only is the result", () => {
    for (let seed = 1; seed <= RUNS; seed++) {
      const { random, base } = scenario(seed);
      const edits = randomEdits(random, base, "ours", () => true);
      const changed = render(edits.reduce(apply, clone(base)));
      const text = render(base);
      for (const result of [
        mergeKbManifests(text, changed, text),
        mergeKbManifests(text, text, changed),
      ]) {
        expect(result.status, `seed ${seed}`).toBe("merged");
        if (result.status === "merged") sameRecords(result.content, changed);
      }
    }
  }, 60_000);

  test("both sides making the same change merge to that change", () => {
    for (let seed = 1; seed <= RUNS; seed++) {
      const { random, base } = scenario(seed);
      const edits = randomEdits(random, base, "both", () => true);
      const changed = render(edits.reduce(apply, clone(base)));
      const result = mergeKbManifests(render(base), changed, changed);
      expect(result.status, `seed ${seed}`).toBe("merged");
      if (result.status === "merged") sameRecords(result.content, changed);
    }
  }, 60_000);

  test("the result does not depend on which side is ours", () => {
    for (let seed = 1; seed <= RUNS; seed++) {
      const { random, base } = scenario(seed);
      const ours = render(
        randomEdits(random, base, "ours", () => true).reduce(
          apply,
          clone(base),
        ),
      );
      const theirs = render(
        randomEdits(random, base, "theirs", () => true).reduce(
          apply,
          clone(base),
        ),
      );
      const text = render(base);
      const forward = mergeKbManifests(text, ours, theirs);
      const backward = mergeKbManifests(text, theirs, ours);
      expect(forward.status, `seed ${seed}`).toBe(backward.status);
      if (forward.status === "merged" && backward.status === "merged") {
        sameRecords(forward.content, backward.content);
      }
    }
  }, 60_000);

  test("edits to different records or fields merge to both edits applied", () => {
    let merges = 0;
    for (let seed = 1; seed <= RUNS; seed++) {
      const { random, base } = scenario(seed);
      const ourEdits = randomEdits(random, base, "ours", () => true);
      const ourKeys = touched(ourEdits);
      const theirEdits = randomEdits(random, base, "theirs", (id, field) => {
        if (ourKeys.has(`${id}/*`)) return false;
        if (field === "*")
          return ![...ourKeys].some((k) => k.startsWith(`${id}/`));
        // Set-valued relationships union, so both sides may edit them.
        return field === "relationships" || !ourKeys.has(`${id}/${field}`);
      });
      const ours = ourEdits.reduce(apply, clone(base));
      const theirs = theirEdits.reduce(apply, clone(base));
      const expected = theirEdits.reduce(apply, clone(ours));
      const result = mergeKbManifests(
        render(base),
        render(ours),
        render(theirs),
      );
      expect(result.status, `seed ${seed}`).toBe("merged");
      if (result.status === "merged") {
        sameRecords(result.content, render(expected), `seed ${seed}`);
        merges++;
      }
    }
    expect(merges).toBe(RUNS);
  }, 60_000);

  test("an id either side added is never dropped", () => {
    for (let seed = 1; seed <= RUNS; seed++) {
      const { random, base } = scenario(seed);
      const ours = randomEdits(random, base, "ours", () => true).reduce(
        apply,
        clone(base),
      );
      const theirs = randomEdits(random, base, "theirs", () => true).reduce(
        apply,
        clone(base),
      );
      // Both sides add the same new id, with bodies that may differ.
      const shared = randomRecord(random, "SYM-shared");
      const theirShared =
        random() < 0.5 ? shared : randomRecord(random, "SYM-shared");
      const result = mergeKbManifests(
        render(base),
        render([...ours, shared]),
        render([...theirs, theirShared]),
      );
      if (result.status !== "merged") continue;
      const merged = semantic(result.content);
      const baseIds = new Set(base.map((record) => record.id));
      for (const record of [...ours, ...theirs, shared])
        if (!baseIds.has(record.id))
          expect(merged.has(record.id), `seed ${seed}: ${record.id}`).toBe(
            true,
          );
    }
  }, 60_000);

  test("two different values for one field always conflict", () => {
    for (let seed = 1; seed <= RUNS; seed++) {
      const { random, base } = scenario(seed);
      const record = pick(random, base);
      const field = pick(random, ["title", "status"] as const);
      const set = (value: string) =>
        render(
          apply(clone(base), { kind: "set", id: record.id, field, value }),
        );
      const result = mergeKbManifests(
        render(base),
        set("ours-value"),
        set("theirs-value"),
      );
      expect(result.status, `seed ${seed}`).toBe("conflict");
      if (result.status === "conflict") {
        expect(result.conflicts).toContain(
          `${record.id}: both sides changed ${field}`,
        );
      }
    }
  }, 60_000);
});
