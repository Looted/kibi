import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";

/** A Prolog atom or string term for the fake store's property lists. */
function term(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(term).join(",")}]`;
  // The store holds numbers and booleans as typed RDF literals.
  if (typeof value === "number")
    return `^^("${value}",'http://www.w3.org/2001/XMLSchema#${Number.isInteger(value) ? "integer" : "double"}')`;
  if (typeof value === "boolean")
    return `^^("${value}",'http://www.w3.org/2001/XMLSchema#boolean')`;
  return JSON.stringify(String(value));
}

export type FakeEntity = Readonly<{
  id: string;
  type: string;
  [key: string]: unknown;
}>;

/**
 * A query port that answers `kb_entity/3` lookups from a fixed list, in the
 * shape the store's findall returns. Every other goal fails.
 */
export function fakeProlog(
  entities: readonly FakeEntity[],
  handle?: (
    goal: string,
  ) => Record<string, unknown> | Promise<Record<string, unknown>> | undefined,
) {
  const goals: string[] = [];
  return {
    goals,
    // Every query is one self-contained goal (module load included).
    oneShotMode: true,
    query: async (goal: string) => {
      goals.push(goal);
      const handled = handle?.(goal);
      if (handled !== undefined) return handled;
      const match = /kb_entity\(('(?:[^']|'')*'|_|[A-Z]\w*),\s*'?(\w+)'?/.exec(
        goal,
      );
      if (match === null)
        return { success: false, bindings: {}, error: "unsupported goal" };
      const id = match[1]?.startsWith("'")
        ? match[1].slice(1, -1).replaceAll("''", "'")
        : undefined;
      const type = match[2];
      const rows = entities.filter(
        (entity) =>
          entity.type === type && (id === undefined || entity.id === id),
      );
      const encoded = rows.map((entity) => {
        const props = Object.entries(entity)
          .filter(([key]) => key !== "id" && key !== "type")
          .map(([key, value]) => `${key}=${term(value)}`);
        return `['${entity.id}',${entity.type},[${props.join(",")}]]`;
      });
      return { success: true, bindings: { Results: `[${encoded.join(",")}]` } };
    },
  };
}

export function context(
  workspaceRoot: string,
  entities: readonly FakeEntity[] = [],
  handle?: (
    goal: string,
  ) => Record<string, unknown> | Promise<Record<string, unknown>> | undefined,
): OperationContext {
  return {
    workspaceRoot,
    prolog: fakeProlog(entities, handle),
  } as unknown as OperationContext;
}

/** A fresh scratch directory with the given files; remove it with `cleanup`. */
export function scratch(
  files: Readonly<Record<string, string>> = {},
  prefix = "kibi-ops-cov-",
  /** Where to create it; inside the repository it resolves the repo's packages. */
  parent: string = tmpdir(),
): {
  root: string;
  write: (relative: string, body: string) => string;
  cleanup: () => void;
} {
  const root = mkdtempSync(path.join(parent, prefix));
  const write = (relative: string, body: string) => {
    const absolute = path.join(root, relative);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, body);
    return absolute;
  };
  for (const [relative, body] of Object.entries(files)) write(relative, body);
  return {
    root,
    write,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}
