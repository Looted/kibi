import path from "node:path";
import Table from "cli-table3";
import { PrologProcess, resolveKbPlPath } from "../prolog.js";
import { escapeAtom } from "../prolog/codec.js";
import { getCurrentBranch } from "./init-helpers.js";

export interface DiscoveryCommandOptions {
  format?: "json" | "table";
}

// implements REQ-003
export async function withAttachedBranchProlog<T>(
  callback: (prolog: PrologProcess) => Promise<T>,
): Promise<T> {
  let prolog: PrologProcess | null = null;
  let attached = false;

  try {
    prolog = new PrologProcess({ timeout: 120000 });
    await prolog.start();
    await prolog.query(
      "set_prolog_flag(answer_write_options, [max_depth(0), spacing(next_argument)])",
    );

    let branch: string;
    try {
      branch =
        process.env.KIBI_BRANCH || (await getCurrentBranch(process.cwd()));
    } catch {
      branch = process.env.KIBI_BRANCH || "main";
    }

    const kbPath = path.join(process.cwd(), ".kb/branches", branch);
    const attachResult = await prolog.query(
      `kb_attach('${escapeAtom(kbPath)}')`,
    );
    if (!attachResult.success) {
      throw new Error(
        `Failed to attach KB: ${attachResult.error || "Unknown error"}`,
      );
    }
    attached = true;

    return await callback(prolog);
  } finally {
    if (prolog) {
      if (attached) {
        try {
          await prolog.query("kb_detach");
        } catch {}
      }
      try {
        await prolog.terminate();
      } catch {}
    }
  }
}

// implements REQ-003
export async function withPrologProcess<T>(
  callback: (prolog: PrologProcess) => Promise<T>,
): Promise<T> {
  const prolog = new PrologProcess({ timeout: 120000 });
  try {
    await prolog.start();
    (prolog as unknown as { useOneShotMode: boolean }).useOneShotMode = true;
    await prolog.query(
      "set_prolog_flag(answer_write_options, [max_depth(0), spacing(next_argument)])",
    );
    return await callback(prolog);
  } finally {
    try {
      await prolog.terminate();
    } catch {}
  }
}

// implements REQ-003
export async function resolveCurrentKbPath(): Promise<string> {
  let branch: string;
  try {
    branch = process.env.KIBI_BRANCH || (await getCurrentBranch(process.cwd()));
  } catch {
    branch = process.env.KIBI_BRANCH || "main";
  }

  return path.join(process.cwd(), ".kb/branches", branch);
}

// implements REQ-003
export function resolveCoreModulePath(fileName: string): string {
  return path.join(path.dirname(resolveKbPlPath()), fileName);
}

// implements REQ-003
export async function runJsonModuleQuery<T>(
  prolog: PrologProcess,
  fileName: string,
  goal: string,
  errorLabel: string,
  kbPath?: string,
): Promise<T> {
  const modulePath = escapeAtom(
    resolveCoreModulePath(fileName).replace(/\\/g, "/"),
  );
  const wrappedGoal = kbPath
    ? `(use_module('${modulePath}'), kb_attach('${escapeAtom(kbPath)}'), ${goal}, kb_detach)`
    : `(use_module('${modulePath}'), ${goal})`;
  const result = await prolog.query(wrappedGoal);

  if (!result.success) {
    throw new Error(`${errorLabel}: ${result.error || "Unknown error"}`);
  }

  const rawJson = result.bindings.JsonString;
  if (!rawJson) {
    throw new Error(`${errorLabel}: missing JsonString binding`);
  }

  let parsed: unknown = JSON.parse(rawJson);
  if (typeof parsed === "string") {
    parsed = JSON.parse(parsed);
  }

  return parsed as T;
}

// implements REQ-003
export function printDiscoveryResult(
  format: "json" | "table" | undefined,
  structured: unknown,
  fallbackText: string,
): void {
  if (format === "json") {
    console.log(JSON.stringify(structured, null, 2));
    return;
  }

  const rendered = renderDiscoveryTable(structured);
  console.log(rendered || fallbackText);
}

function renderDiscoveryTable(structured: unknown): string | null {
  if (!structured || typeof structured !== "object") {
    return null;
  }

  const payload = structured as Record<string, unknown>;

  if (Array.isArray(payload.results)) {
    return renderSearchTable(payload);
  }

  if (
    typeof payload.branch === "string" &&
    typeof payload.syncState === "string"
  ) {
    return renderStatusTable(payload);
  }

  if (Array.isArray(payload.nodes) && Array.isArray(payload.edges)) {
    return renderGraphTable(payload);
  }

  if (
    Array.isArray(payload.rows) &&
    payload.summary &&
    typeof payload.summary === "object"
  ) {
    return renderCoverageTable(payload);
  }

  if (Array.isArray(payload.rows)) {
    return renderGapsTable(payload);
  }

  return null;
}

function renderSearchTable(payload: Record<string, unknown>): string {
  const rows = Array.isArray(payload.results) ? payload.results : [];
  const table = new Table({
    head: ["ID", "Type", "Title", "Score", "Reasons", "Snippet"],
    wordWrap: true,
    colWidths: [20, 10, 32, 8, 28, 44],
  });

  for (const row of rows) {
    const match = row as Record<string, unknown>;
    const entity = (match.entity ?? {}) as Record<string, unknown>;
    const reasons = Array.isArray(match.reasons)
      ? match.reasons.join(", ")
      : "";
    table.push([
      stringifyCell(entity.id),
      stringifyCell(entity.type),
      stringifyCell(entity.title),
      stringifyCell(match.score),
      reasons,
      stringifyCell(match.snippet),
    ]);
  }

  return [
    `Search results: ${stringifyCell(payload.count)} total`,
    table.toString(),
  ].join("\n");
}

function renderStatusTable(payload: Record<string, unknown>): string {
  const table = new Table({
    head: ["Field", "Value"],
    colWidths: [18, 72],
    wordWrap: true,
  });

  table.push(
    ["Branch", stringifyCell(payload.branch)],
    ["Sync State", stringifyCell(payload.syncState)],
    ["Dirty", stringifyCell(payload.dirty)],
    ["Snapshot", stringifyCell(payload.snapshotId)],
    ["Synced At", stringifyCell(payload.syncedAt)],
    ["KB Path", stringifyCell(payload.kbPath)],
  );

  return table.toString();
}

function renderGapsTable(payload: Record<string, unknown>): string {
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const table = new Table({
    head: ["ID", "Type", "Status", "Missing", "Present", "Source"],
    colWidths: [20, 10, 12, 24, 24, 40],
    wordWrap: true,
  });

  for (const row of rows) {
    const item = row as Record<string, unknown>;
    table.push([
      stringifyCell(item.id),
      stringifyCell(item.type),
      stringifyCell(item.status),
      joinCells(item.missingRelationships),
      joinCells(item.presentRelationships),
      stringifyCell(item.source),
    ]);
  }

  return [`Gap rows: ${stringifyCell(payload.count)}`, table.toString()].join(
    "\n",
  );
}

function renderCoverageTable(payload: Record<string, unknown>): string {
  const summary = (payload.summary ?? {}) as Record<string, unknown>;
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const summaryTable = new Table({
    head: ["Metric", "Value"],
    colWidths: [24, 16],
  });

  for (const [key, value] of Object.entries(summary)) {
    summaryTable.push([key, stringifyCell(value)]);
  }

  const firstRow = rows[0] as Record<string, unknown> | undefined;
  const isRequirementCoverage =
    firstRow && Object.hasOwn(firstRow, "scenarioCount");
  const table = isRequirementCoverage
    ? new Table({
        head: [
          "ID",
          "Status",
          "Priority",
          "Coverage",
          "Scen",
          "Tests",
          "Symbols",
          "Gaps",
        ],
        colWidths: [20, 12, 12, 18, 8, 8, 10, 28],
        wordWrap: true,
      })
    : new Table({
        head: ["ID", "Type", "Coverage", "Details", "Gaps"],
        colWidths: [20, 10, 18, 28, 28],
        wordWrap: true,
      });

  for (const row of rows) {
    const item = row as Record<string, unknown>;
    if (isRequirementCoverage) {
      table.push([
        stringifyCell(item.id),
        stringifyCell(item.status),
        stringifyCell(item.priority),
        stringifyCell(item.coverageStatus),
        stringifyCell(item.scenarioCount),
        stringifyCell(item.testCount),
        stringifyCell(item.transitiveSymbolCount),
        joinCells(item.gaps),
      ]);
    } else {
      table.push([
        stringifyCell(item.id),
        stringifyCell(item.type),
        stringifyCell(item.coverageStatus),
        `req=${stringifyCell(item.directRequirementCount)} test=${stringifyCell(item.testCount)} count=${stringifyCell(item.count)}`,
        joinCells(item.gaps),
      ]);
    }
  }

  return [summaryTable.toString(), table.toString()].join("\n\n");
}

function renderGraphTable(payload: Record<string, unknown>): string {
  const nodes = Array.isArray(payload.nodes) ? payload.nodes : [];
  const edges = Array.isArray(payload.edges) ? payload.edges : [];

  const nodeTable = new Table({
    head: ["Node ID", "Type", "Title", "Status"],
    colWidths: [22, 10, 36, 12],
    wordWrap: true,
  });
  for (const row of nodes) {
    const item = row as Record<string, unknown>;
    nodeTable.push([
      stringifyCell(item.id),
      stringifyCell(item.type),
      stringifyCell(item.title),
      stringifyCell(item.status),
    ]);
  }

  const edgeTable = new Table({
    head: ["Relationship", "From", "To"],
    colWidths: [18, 22, 22],
    wordWrap: true,
  });
  for (const row of edges) {
    const item = row as Record<string, unknown>;
    edgeTable.push([
      stringifyCell(item.type),
      stringifyCell(item.from),
      stringifyCell(item.to),
    ]);
  }

  return [
    `Nodes: ${nodes.length}  Edges: ${edges.length}  Truncated: ${stringifyCell(payload.truncated)}`,
    nodeTable.toString(),
    edgeTable.toString(),
  ].join("\n\n");
}

function stringifyCell(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  if (typeof value === "string") {
    return value;
  }
  return String(value);
}

function joinCells(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) {
    return "-";
  }
  return value.map((item) => stringifyCell(item)).join(", ");
}
