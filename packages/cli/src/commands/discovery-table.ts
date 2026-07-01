import Table from "cli-table3";

const EMPTY_FIELDS: Readonly<Record<string, unknown>> = Object.freeze({});

export function renderDiscoveryTable(structured: unknown): string | null {
  if (!isFields(structured)) {
    return null;
  }

  const payload = structured;

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

function renderSearchTable(payload: Readonly<Record<string, unknown>>): string {
  const rows = Array.isArray(payload.results) ? payload.results : [];
  const table = new Table({
    head: ["ID", "Type", "Title", "Score", "Reasons", "Snippet"],
    wordWrap: true,
    colWidths: [20, 10, 32, 8, 28, 44],
  });

  for (const row of rows) {
    const match = fieldsFrom(row);
    const entity = fieldsFrom(match.entity);
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

function renderStatusTable(payload: Readonly<Record<string, unknown>>): string {
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

function renderGapsTable(payload: Readonly<Record<string, unknown>>): string {
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const table = new Table({
    head: ["ID", "Type", "Status", "Missing", "Present", "Source"],
    colWidths: [20, 10, 12, 24, 24, 40],
    wordWrap: true,
  });

  for (const row of rows) {
    const item = fieldsFrom(row);
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

export function renderCoverageTable(
  payload: Readonly<Record<string, unknown>>,
): string {
  const summary = fieldsFrom(payload.summary);
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const summaryTable = new Table({
    head: ["Metric", "Value"],
    colWidths: [24, 16],
  });

  for (const [key, value] of Object.entries(summary)) {
    summaryTable.push([key, stringifyCell(value)]);
  }

  const firstRow = firstFields(rows);
  const isRequirementCoverage =
    firstRow !== undefined && Object.hasOwn(firstRow, "scenarioCount");
  const table = isRequirementCoverage
    ? new Table({
        head: [
          "ID",
          "Status",
          "Priority",
          "Coverage",
          "Depth",
          "Scen",
          "Tests",
          "Symbols",
          "Gaps",
        ],
        colWidths: [20, 12, 12, 18, 32, 8, 8, 10, 28],
        wordWrap: true,
      })
    : new Table({
        head: ["ID", "Type", "Coverage", "Details", "Gaps"],
        colWidths: [20, 10, 18, 28, 28],
        wordWrap: true,
      });

  for (const row of rows) {
    const item = fieldsFrom(row);
    if (isRequirementCoverage) {
      table.push([
        stringifyCell(item.id),
        stringifyCell(item.status),
        stringifyCell(item.priority),
        stringifyCell(item.coverageStatus),
        stringifyCell(item.coverageDepth),
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

function renderGraphTable(payload: Readonly<Record<string, unknown>>): string {
  const nodes = Array.isArray(payload.nodes) ? payload.nodes : [];
  const edges = Array.isArray(payload.edges) ? payload.edges : [];

  const nodeTable = new Table({
    head: ["Node ID", "Type", "Title", "Status"],
    colWidths: [22, 10, 36, 12],
    wordWrap: true,
  });
  for (const row of nodes) {
    const item = fieldsFrom(row);
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
    const item = fieldsFrom(row);
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

function isFields(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object";
}

function fieldsFrom(value: unknown): Readonly<Record<string, unknown>> {
  return isFields(value) ? value : EMPTY_FIELDS;
}

function firstFields(
  values: readonly unknown[],
): Readonly<Record<string, unknown>> | undefined {
  const first = values[0];
  return isFields(first) ? first : undefined;
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
