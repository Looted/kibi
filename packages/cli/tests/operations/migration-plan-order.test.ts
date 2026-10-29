import { describe, expect, test } from "bun:test";
import {
  type MigrationAction,
  buildMigrationPlan,
  compareReadyActionIds,
  migrationAction,
} from "../../src/public/operations/migration-plan.js";

/**
 * The plan's dependency order used to rescan every remaining action per
 * emitted one and re-sort the ready queue on every push. The indexed order
 * must put the same actions in the same places on every graph shape:
 * duplicate ids, diamonds, cycles, dependencies on ids outside the plan,
 * and several actions freed at once that sort as equals.
 */

function actionSort(left: MigrationAction, right: MigrationAction): number {
  return (
    left.state.localeCompare(right.state) ||
    left.safety.localeCompare(right.safety) ||
    left.category.localeCompare(right.category) ||
    left.id.localeCompare(right.id)
  );
}

/** The scan-and-resort order the indexed one replaced. */
function scanningDependencyOrder(
  actions: readonly MigrationAction[],
): MigrationAction[] {
  const byId = new Map(actions.map((action) => [action.id, action]));
  const remaining = new Map(
    actions.map((action) => [
      action.id,
      new Set(action.dependsOn.filter((dependency) => byId.has(dependency))),
    ]),
  );
  const ordered: MigrationAction[] = [];
  const ready = actions
    .filter((action) => (remaining.get(action.id)?.size ?? 0) === 0)
    .sort(actionSort)
    .map((action) => action.id);
  const queued = new Set(ready);
  while (ready.length > 0) {
    const id = ready.shift();
    if (id === undefined) break;
    queued.delete(id);
    const action = byId.get(id);
    if (action === undefined) continue;
    ordered.push(action);
    for (const [candidateId, dependencies] of remaining) {
      if (
        !dependencies.delete(id) ||
        dependencies.size !== 0 ||
        queued.has(candidateId)
      ) {
        continue;
      }
      ready.push(candidateId);
      queued.add(candidateId);
      ready.sort((left, right) => compareReadyActionIds(left, right, byId));
    }
  }
  if (ordered.length !== actions.length) {
    const emitted = new Set(ordered.map((action) => action.id));
    ordered.push(
      ...actions.filter((action) => !emitted.has(action.id)).sort(actionSort),
    );
  }
  return ordered;
}

const STATES = ["ready", "blocked"] as const;
const SAFETIES = ["automatic", "review", "operator", "execution"] as const;
const CATEGORIES = ["schema", "semantic", "quality", "freshness"] as const;

type Spec = {
  id: string;
  dependsOn?: readonly string[];
  state?: (typeof STATES)[number];
  safety?: (typeof SAFETIES)[number];
  category?: (typeof CATEGORIES)[number];
};

function action(spec: Spec): MigrationAction {
  return migrationAction({
    id: spec.id,
    code: "predicate_schema_alignment",
    category: spec.category ?? "semantic",
    state: spec.state ?? "ready",
    safety: spec.safety ?? "automatic",
    autoApplicable: true,
    dependsOn: [...(spec.dependsOn ?? [])],
    invocation: { kind: "operation", name: "kb_upsert", input: {} },
  });
}

function orderedIds(actions: readonly MigrationAction[]): string[] {
  return buildMigrationPlan({ actions }).actions.map((item) => item.id);
}

/** One action per id, the later definition winning, like a merged plan. */
function uniqueById(actions: readonly MigrationAction[]): MigrationAction[] {
  return [...new Map(actions.map((item) => [item.id, item])).values()];
}

function expectedIds(actions: readonly MigrationAction[]): string[] {
  return scanningDependencyOrder(uniqueById(actions).sort(actionSort)).map(
    (item) => item.id,
  );
}

/** A small deterministic generator so a failing graph can be replayed. */
function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function randomGraph(seed: number): MigrationAction[] {
  const random = makeRandom(seed);
  const pick = <T>(values: readonly T[]): T =>
    values[Math.floor(random() * values.length)] as T;
  const count = 2 + Math.floor(random() * 12);
  // A small id pool makes duplicate ids and dense dependency webs common.
  const pool = Array.from({ length: 8 }, (_, index) => `act-${index}`);
  const actions: MigrationAction[] = [];
  for (let index = 0; index < count; index += 1) {
    const dependencies = new Set<string>();
    const edges = Math.floor(random() * 4);
    for (let edge = 0; edge < edges; edge += 1) {
      dependencies.add(random() < 0.15 ? `outside-${edge}` : pick(pool));
    }
    actions.push(
      action({
        id: pick(pool),
        dependsOn: [...dependencies],
        state: pick(STATES),
        safety: pick(SAFETIES),
        category: pick(CATEGORIES),
      }),
    );
  }
  return actions;
}

describe("migration plan dependency order", () => {
  test("a diamond frees both branches before the join", () => {
    const actions = [
      action({ id: "join", dependsOn: ["left", "right"] }),
      action({ id: "right", dependsOn: ["root"] }),
      action({ id: "left", dependsOn: ["root"] }),
      action({ id: "root" }),
    ];
    expect(orderedIds(actions)).toEqual(["root", "left", "right", "join"]);
    expect(orderedIds(actions)).toEqual(expectedIds(actions));
  });

  test("freed actions take their sorted place among the ones still waiting", () => {
    // `late` is ready from the start but sorts after everything `root`
    // frees, so the freed actions are emitted before it.
    const actions = [
      action({ id: "zz-late", safety: "review" }),
      action({ id: "root", safety: "automatic" }),
      action({ id: "freed-b", dependsOn: ["root"], safety: "automatic" }),
      action({ id: "freed-a", dependsOn: ["root"], safety: "automatic" }),
      action({ id: "freed-review", dependsOn: ["root"], safety: "review" }),
    ];
    expect(orderedIds(actions)).toEqual([
      "root",
      "freed-a",
      "freed-b",
      "freed-review",
      "zz-late",
    ]);
    expect(orderedIds(actions)).toEqual(expectedIds(actions));
  });

  test("a cycle and a dependency outside the plan keep canonical order at the end", () => {
    const actions = [
      action({ id: "cycle-b", dependsOn: ["cycle-a"] }),
      action({ id: "cycle-a", dependsOn: ["cycle-b"] }),
      action({ id: "waits-on-cycle", dependsOn: ["cycle-a"] }),
      action({ id: "waits-outside", dependsOn: ["not-in-plan"] }),
      action({ id: "free" }),
    ];
    expect(orderedIds(actions)).toEqual([
      "free",
      "waits-outside",
      "cycle-a",
      "cycle-b",
      "waits-on-cycle",
    ]);
    expect(orderedIds(actions)).toEqual(expectedIds(actions));
  });

  test("a freed ready action is emitted before a ready action that sorts later", () => {
    // Blocked actions sort before ready ones, so the blocked prerequisite
    // goes first and the action it frees jumps ahead of `other`.
    const actions = [
      action({ id: "needs-blocked", dependsOn: ["blocked"], state: "ready" }),
      action({ id: "blocked", state: "blocked" }),
      action({ id: "other", state: "ready" }),
    ];
    expect(orderedIds(actions)).toEqual(["blocked", "needs-blocked", "other"]);
    expect(orderedIds(actions)).toEqual(expectedIds(actions));
  });

  test("freed actions whose ids collate equal keep their plan order", () => {
    // Canonically equivalent ids compare equal under localeCompare, so the
    // ready queue must place the second one after the first like a stable
    // sort, in either plan order.
    const composed = "freed-\u00e9";
    const decomposed = "freed-e\u0301";
    expect(composed.localeCompare(decomposed)).toBe(0);
    const forward = [
      action({ id: "root" }),
      action({ id: composed, dependsOn: ["root"] }),
      action({ id: decomposed, dependsOn: ["root"] }),
    ];
    expect(orderedIds(forward)).toEqual(["root", composed, decomposed]);
    expect(orderedIds(forward)).toEqual(expectedIds(forward));
    const backward = [
      action({ id: "root" }),
      action({ id: decomposed, dependsOn: ["root"] }),
      action({ id: composed, dependsOn: ["root"] }),
    ];
    expect(orderedIds(backward)).toEqual(["root", decomposed, composed]);
    expect(orderedIds(backward)).toEqual(expectedIds(backward));
  });

  test("an id given twice is ordered once, by its later definition", () => {
    const actions = [
      action({ id: "dup" }),
      action({ id: "root" }),
      action({ id: "dup", dependsOn: ["root"] }),
      action({ id: "after-dup", dependsOn: ["dup"] }),
    ];
    expect(orderedIds(actions)).toEqual(["root", "dup", "after-dup"]);
    expect(orderedIds(actions)).toEqual(expectedIds(actions));
    // The last definition wins even when it is the one without dependencies.
    const reversed = [
      action({ id: "dup", dependsOn: ["root"] }),
      action({ id: "root" }),
      action({ id: "dup" }),
      action({ id: "after-dup", dependsOn: ["dup"] }),
    ];
    expect(orderedIds(reversed)).toEqual(["dup", "after-dup", "root"]);
    expect(orderedIds(reversed)).toEqual(expectedIds(reversed));
  });

  test("random graphs with duplicates, diamonds, cycles and ties order identically", () => {
    for (let seed = 1; seed <= 500; seed += 1) {
      const actions = randomGraph(seed);
      const expected = expectedIds(actions);
      const actual = orderedIds(actions);
      if (actual.join(",") !== expected.join(",")) {
        throw new Error(
          `seed ${seed}: expected ${expected.join(",")} got ${actual.join(",")}\n${JSON.stringify(
            actions.map((item) => ({
              id: item.id,
              dependsOn: item.dependsOn,
              state: item.state,
              safety: item.safety,
              category: item.category,
            })),
          )}`,
        );
      }
      expect(actual).toHaveLength(expected.length);
    }
  });
});
