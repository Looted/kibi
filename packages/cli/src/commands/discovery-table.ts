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
          "Proof",
          "Scen",
          "Tests",
          "Symbols",
          "Structural gaps",
          "Proof gaps",
        ],
        colWidths: [20, 12, 12, 18, 36, 12, 8, 8, 10, 24, 36],
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
        stringifyCell(item.proofStatus),
        stringifyCell(item.scenarioCount),
        stringifyCell(item.testCount),
        stringifyCell(item.transitiveSymbolCount),
        joinCells(item.gaps),
        joinCells(item.proofGaps),
      ]);
    } else {
      table.push([
        stringifyCell(item.id),
        stringifyCell(item.traceabilityRole ?? item.type),
        stringifyCell(item.coverageStatus),
        `req=${stringifyCell(item.directRequirementCount)} covered=${stringifyCell(item.testCount)} executable=${stringifyCell(item.executableTestCount)} count=${stringifyCell(item.count)}`,
        joinCells(item.gaps),
      ]);
    }
  }

  const sections = [summaryTable.toString(), table.toString()];
  const repairPlan = fieldsFrom(payload.repairPlan);
  if (typeof repairPlan.version === "string") {
    sections.push(renderRepairPlanTable(repairPlan));
  }
  const legacyMigrationPlan = fieldsFrom(payload.legacyMigrationPlan);
  if (typeof legacyMigrationPlan.version === "string") {
    sections.push(renderLegacyMigrationPlanTable(legacyMigrationPlan));
  }
  return sections.join("\n\n");
}

function renderLegacyMigrationPlanTable(
  plan: Readonly<Record<string, unknown>>,
): string {
  const scope = fieldsFrom(plan.scope);
  const summary = fieldsFrom(plan.summary);
  const batches = Array.isArray(plan.batches) ? plan.batches : [];
  const summaryTable = new Table({
    head: ["Legacy migration preview", "Value"],
    colWidths: [28, 72],
    wordWrap: true,
  });
  summaryTable.push(
    ["Plan ID", stringifyCell(plan.planId)],
    ["Status", stringifyCell(plan.status)],
    ["Repair scope complete", stringifyCell(scope.repairPlanComplete)],
    ["Candidate requirements", stringifyCell(scope.candidateRequirements)],
    ["Selected requirements", stringifyCell(scope.selectedRequirements)],
    ["Next offset", stringifyCell(scope.nextOffset)],
    ["Propositions", stringifyCell(summary.propositionCount)],
    ["Unresolved", stringifyCell(summary.unresolvedPropositionCount)],
  );

  const batchTable = new Table({
    head: [
      "Requirement",
      "State",
      "Source binding",
      "Claims",
      "Predicate candidates",
      "Diagnostics",
    ],
    colWidths: [24, 18, 18, 10, 20, 46],
    wordWrap: true,
  });
  for (const rawBatch of batches) {
    const batch = fieldsFrom(rawBatch);
    const sourceBinding = fieldsFrom(batch.sourceBinding);
    const propositions = Array.isArray(batch.propositions)
      ? batch.propositions
      : [];
    const candidateCount = propositions.reduce((count, proposition) => {
      const candidates = fieldsFrom(proposition).predicateCandidates;
      return count + (Array.isArray(candidates) ? candidates.length : 0);
    }, 0);
    batchTable.push([
      stringifyCell(batch.requirementId),
      stringifyCell(batch.state),
      stringifyCell(sourceBinding.status),
      propositions.length,
      candidateCount,
      joinCells(batch.diagnostics),
    ]);
  }
  return [summaryTable.toString(), batchTable.toString()].join("\n\n");
}

function renderRepairPlanTable(
  repairPlan: Readonly<Record<string, unknown>>,
): string {
  const scope = fieldsFrom(repairPlan.scope);
  const summary = fieldsFrom(repairPlan.summary);
  const batches = Array.isArray(repairPlan.batches) ? repairPlan.batches : [];
  const displayedBatches = batches.slice(0, 25);
  const summaryTable = new Table({
    head: ["Repair plan", "Value"],
    colWidths: [24, 72],
    wordWrap: true,
  });
  summaryTable.push(
    ["Plan ID", stringifyCell(repairPlan.planId)],
    ["Status", stringifyCell(repairPlan.status)],
    ["Complete scope", stringifyCell(scope.complete)],
    ["Requirements", stringifyCell(summary.requirementCount)],
    ["Repairs", stringifyCell(summary.repairCount)],
    ["Batches", stringifyCell(summary.batchCount)],
  );

  const batchTable = new Table({
    head: ["Order", "Requirement", "Phase", "State", "Depends on", "Gaps"],
    colWidths: [8, 24, 24, 10, 28, 32],
    wordWrap: true,
  });
  for (const rawBatch of displayedBatches) {
    const batch = fieldsFrom(rawBatch);
    const repairs = Array.isArray(batch.repairs) ? batch.repairs : [];
    batchTable.push([
      stringifyCell(batch.order),
      stringifyCell(batch.requirementId),
      stringifyCell(batch.phase),
      stringifyCell(batch.state),
      joinCells(batch.dependsOn),
      repairs
        .map((repair) => stringifyCell(fieldsFrom(repair).gap))
        .join(", ") || "-",
    ]);
  }

  const suffix =
    displayedBatches.length < batches.length
      ? `\nShowing ${displayedBatches.length} of ${batches.length} repair batches; use --format json for the complete plan.`
      : "";
  return [summaryTable.toString(), batchTable.toString()].join("\n\n") + suffix;
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
