/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import { OperationError } from "../../cli-errors.js";
import type {
  KibiResult,
  OperationContent,
  OperationEffect,
  OperationName,
  OperationResult,
} from "./types.js";

/**
 * Characters an operation result's data may take when it is returned over
 * MCP or the CLI JSON route. A host that also receives the data as text gets
 * about twice this, still well under the tool-result limits hosts apply.
 */
export const RESULT_BUDGET_CHARS = 24_000;

/**
 * A read whose data is still larger than this after fitting is refused
 * rather than returned: no host should receive it, and a partial answer the
 * caller cannot tell apart from a whole one is worse than an error.
 */
export const RESULT_CEILING_CHARS = 64_000;

export const RESULT_TRUNCATED = "RESULT_TRUNCATED";
export const RESULT_TOO_LARGE = "RESULT_TOO_LARGE";

/** At most this many ids are named where a cut row lists what it left out. */
const OMITTED_PATHS_SHOWN = 20;

type Data = Record<string, unknown>;

/**
 * How one operation keeps its result within the size budget.
 *
 * - `rows`: the shared fitter cuts the named row array to the budget, at
 *   least one row, cutting that row itself when it alone is too large, and
 *   reports the cut with the offset to call again with.
 * - `fitted`: the operation fits its own result (and reports a cut through
 *   the same `truncation` shape); the shared ceiling still applies.
 * - `bounded`: the result is small by construction; `reason` says why. The
 *   shared ceiling still applies.
 */
export type ResultBudgetDeclaration =
  | Readonly<{
      kind: "rows";
      /** Key of the row array in the operation's data. */
      rows: string;
      /** Rows matching the call's filters before paging, when known. */
      total?: (data: Data) => number | undefined;
      /** Make the data consistent after rows were cut (e.g. graph edges). */
      afterCut?: (data: Data, kept: readonly unknown[]) => Data;
      /** Rebuild the text summary from the fitted data. */
      text?: (data: Data, input: Data) => string;
    }>
  | Readonly<{ kind: "fitted"; reason: string }>
  | Readonly<{ kind: "bounded"; reason: string }>;

/** The standard description of a cut, in the operation's data. */
export type ResultTruncation = Readonly<{
  budgetChars: number;
  returned: number;
  total?: number;
  omitted?: number;
  nextOffset?: number;
  hint: string;
}>;

const sizeOf = (value: unknown): number => JSON.stringify(value ?? null).length;

function isRecord(value: unknown): value is Data {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function integer(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : undefined;
}

/** At most this many ids are named in a cut list's text summary. */
const TEXT_IDS_SHOWN = 20;

/** "Found N <noun>. Showing K: a, b, …" over the fitted rows. */
export function idListText(noun: string, rows: string) {
  return (data: Data): string => {
    const listed = Array.isArray(data[rows]) ? (data[rows] as unknown[]) : [];
    const ids = listed.flatMap((row) =>
      isRecord(row) && typeof row.id === "string" ? [row.id] : [],
    );
    const shown = ids.slice(0, TEXT_IDS_SHOWN);
    const more =
      ids.length > shown.length
        ? `, and ${ids.length - shown.length} more`
        : "";
    const count = integer(data.count) ?? listed.length;
    return `Found ${count} ${noun}. Showing ${listed.length}: ${shown.join(", ")}${more}.`;
  };
}

const rowsDeclaration = (
  rows: string,
  extra: Omit<
    Extract<ResultBudgetDeclaration, { kind: "rows" }>,
    "kind" | "rows"
  >,
): ResultBudgetDeclaration => ({
  kind: "rows",
  rows,
  total: (data) => integer(data.count),
  ...extra,
});

/**
 * Graph edges that leave a listed node. Each edge belongs to the page of its
 * source node, so paging through the nodes lists every edge once.
 */
export function edgesFromNodes(data: Data, kept: readonly unknown[]): Data {
  const ids = new Set(
    kept.flatMap((node) =>
      isRecord(node) && typeof node.id === "string" ? [node.id] : [],
    ),
  );
  const edges = Array.isArray(data.edges) ? data.edges : [];
  return {
    ...data,
    edges: edges.filter((edge) => isRecord(edge) && ids.has(String(edge.from))),
  };
}

/**
 * Every catalog operation's declaration. The record type makes a new
 * operation without one fail to compile.
 */
export const RESULT_BUDGETS: Readonly<
  Record<OperationName, ResultBudgetDeclaration>
> = {
  kb_query: rowsDeclaration("entities", {
    text: idListText("entities", "entities"),
  }),
  kb_search: rowsDeclaration("results", {
    afterCut: (data, kept) => ({ ...data, returned: kept.length }),
  }),
  kb_find_gaps: rowsDeclaration("rows", {
    text: idListText("gap rows", "rows"),
  }),
  kb_coverage: {
    kind: "fitted",
    reason:
      "kb_coverage reads only the engine pages that fit, then builds its plans for the rows it returns.",
  },
  kb_graph: rowsDeclaration("nodes", {
    total: (data) => integer(data.nodeCount),
    afterCut: edgesFromNodes,
  }),
  kb_sparql_remote: rowsDeclaration("rows", {
    total: (data) => (Array.isArray(data.rows) ? data.rows.length : 0),
  }),
  kb_check: {
    kind: "fitted",
    reason:
      "kb_check orders its own cut: blocking rules first, then a page of findings.",
  },
  kb_status: {
    kind: "bounded",
    reason:
      "Stale reasons and snapshot changes are capped lists with their own counts.",
  },
  kb_skills_list: {
    kind: "bounded",
    reason: "One short entry per bundled or project skill.",
  },
  kb_skills_load: {
    kind: "bounded",
    reason: "One skill body; resources are listed, not inlined.",
  },
  kb_skills_read: {
    kind: "bounded",
    reason: "One skill resource file.",
  },
  kb_skills: {
    kind: "bounded",
    reason: "Routes to one of the bounded skills operations.",
  },
  kb_semantic_advisor: {
    kind: "bounded",
    reason: "One receipt for one requirement's statement.",
  },
  kb_model_requirement: {
    kind: "bounded",
    reason: "One statement's claims with capped candidate lists.",
  },
  kb_suggest_predicates: {
    kind: "bounded",
    reason: "Candidate predicates are capped by the input's maximum.",
  },
  kb_model: {
    kind: "bounded",
    reason: "Routes to one of the bounded modeling operations.",
  },
  kb_plan_bootstrap: {
    kind: "bounded",
    reason: "Candidates are capped by maxCandidates.",
  },
  kb_validate_upsert: {
    kind: "bounded",
    reason: "Findings for one upsert payload.",
  },
  kb_upsert: {
    kind: "bounded",
    reason: "Proportional to the entities the payload writes.",
  },
  kb_record: {
    kind: "bounded",
    reason: "One upsert result plus a changed-only check.",
  },
  kb_delete: {
    kind: "bounded",
    reason: "Proportional to the ids the call deletes.",
  },
  kb_prepare_impact_review: {
    kind: "bounded",
    reason: "One review template for the reviewed range.",
  },
  kb_review_firm_edit: {
    kind: "bounded",
    reason: "One receipt for the reviewed edits.",
  },
  kb_compile_intent: {
    kind: "bounded",
    reason: "Inputs are capped, so the compiled plan is too.",
  },
  kb_apply_plan: {
    kind: "bounded",
    reason: "A digest of the applied plan and what remains, not the plan.",
  },
  kb_ingest_proof: {
    kind: "bounded",
    reason: "One receipt per ingested test result.",
  },
};

export function resultBudgetFor(
  operation: string,
): ResultBudgetDeclaration | undefined {
  return (RESULT_BUDGETS as Readonly<Record<string, ResultBudgetDeclaration>>)[
    operation
  ];
}

/**
 * How many leading rows fit when `base` (the data without its rows) must stay
 * within `budget`; at least one when there is a row.
 */
export function rowsWithinBudget(
  base: unknown,
  rows: readonly unknown[],
  budget: number = RESULT_BUDGET_CHARS,
): number {
  let used = sizeOf(base);
  let count = 0;
  for (const row of rows) {
    // A comma between rows.
    const cost = sizeOf(row) + 1;
    if (count > 0 && used + cost > budget) break;
    used += cost;
    count += 1;
  }
  return count;
}

/**
 * `row` cut to `budget` characters: its largest parts are left out, deepest
 * first, and `omittedFields` names each one by its dotted path. The keys in
 * `keep` stay at the top level, and an array's only element is stepped into
 * rather than dropped.
 */
export function cutRowToBudget(
  row: unknown,
  budget: number,
  keep: readonly string[] = ["id", "type"],
): unknown {
  if (!isRecord(row) || sizeOf(row) <= budget) return row;
  const omitted: string[] = [];
  let cut: Data = structuredClone(row);
  const named = () =>
    omitted.length > OMITTED_PATHS_SHOWN
      ? [...omitted.slice(0, OMITTED_PATHS_SHOWN), "…and more"]
      : omitted;
  // Each pass removes one part, so the loop ends.
  while (sizeOf({ ...cut, omittedFields: named() }) > budget) {
    const path = largestPart(cut, budget, keep);
    if (path.length === 0) break;
    cut = withoutPath(cut, path) as Data;
    omitted.push(path.join("."));
  }
  const shown = omitted.slice(0, OMITTED_PATHS_SHOWN);
  return {
    ...cut,
    omittedFields:
      omitted.length > shown.length
        ? [...shown, `…and ${omitted.length - shown.length} more`]
        : shown,
  };
}

type Container = Data | unknown[];

const isContainer = (value: unknown): value is Container =>
  value !== null && typeof value === "object";

function members(node: Container): [string, unknown][] {
  return Array.isArray(node)
    ? node.map((value, index) => [String(index), value])
    : Object.entries(node);
}

/**
 * The path to remove next. From the top, step into the largest member while
 * it is a large object (over a quarter of the budget), a kept top-level
 * member or an array's only element; remove the member found there, so a
 * list goes whole. Kept
 * top-level members are stepped into but never removed whole.
 */
function largestPart(
  row: Data,
  budget: number,
  keep: readonly string[],
): string[] {
  const path: string[] = [];
  let node: Container = row;
  for (;;) {
    const top = path.length === 0;
    const onlyElement = Array.isArray(node) && node.length === 1;
    const ranked = members(node).sort(
      (left, right) => sizeOf(right[1]) - sizeOf(left[1]),
    );
    let next: [string, unknown, boolean] | undefined;
    for (const [key, value] of ranked) {
      const kept = top && keep.includes(key);
      const steppable = isContainer(value) && members(value).length > 0;
      const mustStep = kept || (onlyElement && steppable);
      // A list is left out whole (one named path), unless its only element
      // is a record or list to cut into (the only row).
      const large = Array.isArray(value)
        ? value.length === 1 &&
          isContainer(value[0]) &&
          sizeOf(value) > budget / 4
        : sizeOf(value) > budget / 4;
      if (steppable && (mustStep || large)) {
        next = [key, value, true];
        break;
      }
      if (!mustStep) {
        next = [key, value, false];
        break;
      }
    }
    if (next === undefined) return [];
    path.push(next[0]);
    if (!next[2]) return path;
    node = next[1] as Container;
  }
}

function withoutPath(node: Container, path: readonly string[]): Container {
  const [head, ...rest] = path as [string, ...string[]];
  if (Array.isArray(node)) {
    const index = Number(head);
    return rest.length === 0
      ? node.filter((_, at) => at !== index)
      : node.map((value, at) =>
          at === index ? withoutPath(value as Container, rest) : value,
        );
  }
  if (rest.length === 0) {
    const { [head]: _removed, ...kept } = node;
    return kept;
  }
  return { ...node, [head]: withoutPath(node[head] as Container, rest) };
}

/** The paging sentence a cut result's text ends with. */
export function truncationSentence(truncation: ResultTruncation): string {
  const of = truncation.total !== undefined ? ` of ${truncation.total}` : "";
  const next =
    truncation.nextOffset !== undefined
      ? ` Call again with offset ${truncation.nextOffset} for the next rows.`
      : "";
  return `Result cut to its ${truncation.budgetChars.toLocaleString("en-US")}-character budget: ${truncation.returned}${of} rows returned.${next}`;
}

export type FittedResult<T = unknown> = Readonly<{
  result: OperationResult<T>;
  diagnostics: KibiResult["diagnostics"];
  nextActions: KibiResult["nextActions"];
}>;

const WRITE_EFFECTS: ReadonlySet<OperationEffect> = new Set([
  "kb-write",
  "workspace-write",
]);

function replaceText(
  content: readonly OperationContent[],
  text: string | undefined,
  sentence: string,
): OperationContent[] {
  const first = content.findIndex((part) => part.type === "text");
  if (first === -1) return [{ type: "text", text: sentence }, ...content];
  return content.map((part, index) =>
    index === first
      ? { ...part, text: `${text ?? part.text ?? ""} ${sentence}`.trim() }
      : part,
  );
}

/**
 * The operation result as MCP and the CLI JSON route return it: data within
 * the size budget per the operation's declaration, a cut reported as a
 * RESULT_TRUNCATED diagnostic and a next action that pages on, and a read
 * still larger than the ceiling refused with RESULT_TOO_LARGE.
 */
/**
 * Refuses a read whose data is still over the ceiling after its cut, with
 * RESULT_TOO_LARGE. A write has already committed, so its result is
 * returned as it is.
 */
export function refuseOverCeiling(
  spec: Readonly<{ name: string; effects: readonly OperationEffect[] }>,
  data: unknown,
  ceiling: number = RESULT_CEILING_CHARS,
): void {
  const readOnly = !spec.effects.some((effect) => WRITE_EFFECTS.has(effect));
  const size = sizeOf(data);
  if (readOnly && size > ceiling) {
    throw new OperationError(
      RESULT_TOO_LARGE,
      `${spec.name} produced ${size.toLocaleString("en-US")} characters of data, over the ${ceiling.toLocaleString("en-US")}-character ceiling for a tool result. Narrow the call (filters, a smaller limit or fields "summary") and try again.`,
      false,
    );
  }
}

export function fitOperationResult<T>(
  spec: Readonly<{ name: string; effects: readonly OperationEffect[] }>,
  input: unknown,
  result: OperationResult<T>,
  budget: number = RESULT_BUDGET_CHARS,
): FittedResult<T> {
  const declaration = resultBudgetFor(spec.name);
  const args: Data = isRecord(input) ? input : {};
  let data = result.structuredContent as unknown;
  let content = result.content;
  if (
    declaration?.kind === "rows" &&
    isRecord(data) &&
    Array.isArray(data[declaration.rows]) &&
    sizeOf(data) > budget
  ) {
    const rows = data[declaration.rows] as unknown[];
    const base = { ...data, [declaration.rows]: [] };
    const count = rowsWithinBudget(base, rows, budget);
    let kept = rows.slice(0, count);
    if (count === 1 && sizeOf({ ...base, [declaration.rows]: kept }) > budget) {
      kept = [cutRowToBudget(kept[0], budget - sizeOf(base) - 2)];
    }
    const offset = integer(args.offset) ?? 0;
    const total = declaration.total?.(data);
    const omitted =
      total !== undefined
        ? Math.max(0, total - offset - kept.length)
        : undefined;
    const pages = count < rows.length || (omitted ?? 0) > 0;
    const truncation: ResultTruncation = {
      budgetChars: budget,
      returned: kept.length,
      ...(total !== undefined && omitted !== undefined
        ? { total, omitted }
        : {}),
      ...(pages ? { nextOffset: offset + count } : {}),
      hint:
        count < rows.length
          ? "Rows past the budget were left out; page with offset, or narrow the filters."
          : "The row was cut to the budget; omittedFields names the parts left out.",
    };
    let fitted: Data = {
      ...data,
      [declaration.rows]: kept,
      truncated: true,
      truncation,
    };
    if (declaration.afterCut) fitted = declaration.afterCut(fitted, kept);
    data = fitted;
    content = replaceText(
      content,
      declaration.text?.(fitted, args),
      truncationSentence(truncation),
    );
  }
  refuseOverCeiling(spec, data);
  const truncation = isRecord(data) ? data.truncation : undefined;
  const diagnostics: KibiResult["diagnostics"][number][] = [];
  const nextActions: KibiResult["nextActions"][number][] = [];
  if (isRecord(data) && data.truncated === true && isRecord(truncation)) {
    const nextOffset = integer(truncation.nextOffset);
    diagnostics.push({
      code: RESULT_TRUNCATED,
      severity: "info",
      message:
        typeof truncation.hint === "string"
          ? `The result was cut to its size budget. ${truncation.hint}`
          : "The result was cut to its size budget.",
      detail: truncation,
    });
    if (nextOffset !== undefined) {
      nextActions.push({
        operation: spec.name,
        input: { ...args, offset: nextOffset },
        reason: `Read the rows after the first ${nextOffset}.`,
        required: false,
      });
    }
  }
  return {
    result: { ...result, content, structuredContent: data as T },
    diagnostics,
    nextActions,
  };
}
