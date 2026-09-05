import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  KIBI_BRAND,
  renderKibiFaviconDataUri,
  renderKibiLogo,
  renderKibiWordmark,
} from "./brand.js";
import { formatAbsoluteUtc, parseTimestamp } from "./relative-time.js";
import {
  type ProofGateKey,
  REPORT_FILTERS,
  reportFilterCounts,
} from "./report-view.js";
import {
  type ReportRepository,
  type SourceCoordinate,
  commitWebUrl,
  formatSourceCoordinate,
  shortCommitSha,
  sourceWebUrl,
} from "./repository.js";

type UnknownRecord = Readonly<Record<string, unknown>>;

// implements REQ-kibi-html-health-report
function reportStyles(): string {
  const raw = readFileSync(
    join(fileURLToPath(new URL(".", import.meta.url)), "html-report.css"),
    "utf8",
  );
  return raw
    .replaceAll("__KIBI_CARBON__", KIBI_BRAND.carbon)
    .replaceAll("__KIBI_DEEP_CARBON__", KIBI_BRAND.deepCarbon)
    .replaceAll("__KIBI_PANEL__", KIBI_BRAND.panel)
    .replaceAll("__KIBI_ICE__", KIBI_BRAND.ice)
    .replaceAll("__KIBI_SIGNAL__", KIBI_BRAND.signal)
    .replaceAll("__KIBI_SNOW__", KIBI_BRAND.snow)
    .replaceAll("__KIBI_MIST__", KIBI_BRAND.mist)
    .replaceAll("__KIBI_RAIL__", KIBI_BRAND.rail)
    .replaceAll("__KIBI_SUCCESS__", KIBI_BRAND.success)
    .replaceAll("__KIBI_WARNING__", KIBI_BRAND.warning)
    .replaceAll("__KIBI_DANGER__", KIBI_BRAND.danger);
}


// implements REQ-kibi-html-health-report
export const REPORT_CSP =
  "default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'";

// implements REQ-kibi-html-health-report
export const KIBI_GETTING_STARTED_URL =
  "https://github.com/Looted/kibi/blob/develop/docs/install.md";

export type HtmlReportCoverage = Readonly<{
  summary: UnknownRecord;
  rows: readonly UnknownRecord[];
  meta?: UnknownRecord;
}>;

export type HtmlReportInput = Readonly<{
  requirements: HtmlReportCoverage;
  symbols: HtmlReportCoverage;
  branch: string;
  generatedAt: Date;
  repository?: ReportRepository;
}>;

type StageState = "passed" | "warning" | "failed" | "muted";

type ReportStage = Readonly<{
  label: string;
  detail: string;
  state: StageState;
}>;

type ProofGate = Readonly<{
  key: ProofGateKey;
  label: string;
  detail: string;
  remaining: number;
  blocked: number;
}>;

function record(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function records(value: unknown): readonly UnknownRecord[] {
  return Array.isArray(value) ? value.map(record) : [];
}

function strings(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : 0;
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function humanize(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function sourceCoordinate(value: unknown): SourceCoordinate | undefined {
  const item = record(value);
  const path = text(item.path);
  if (!path) return undefined;
  const line = Number(item.line);
  const endLine = Number(item.endLine);
  const id = text(item.id);
  return {
    path,
    ...(id ? { id } : {}),
    ...(Number.isInteger(line) && line >= 1 ? { line } : {}),
    ...(Number.isInteger(endLine) && endLine >= 1 ? { endLine } : {}),
  };
}

function sourceCoordinates(value: unknown): readonly SourceCoordinate[] {
  return Array.isArray(value)
    ? value.flatMap((item) => {
        const coordinate = sourceCoordinate(item);
        return coordinate ? [coordinate] : [];
      })
    : [];
}

function linkedLabel(label: string, href: string | undefined): string {
  const safe = escapeHtml(label);
  if (!href) return safe;
  return `<a class="source-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${safe}</a>`;
}

function linkedCoordinate(
  coordinate: SourceCoordinate | undefined,
  repository: ReportRepository | undefined,
  fallback: string,
): string {
  const label = formatSourceCoordinate(coordinate) ?? fallback;
  return linkedLabel(label, sourceWebUrl(repository, coordinate));
}

function renderRelativeTime(
  iso: string | undefined,
  prefixHtml: string,
): string {
  const date = parseTimestamp(iso);
  if (!date) {
    return `${prefixHtml} timestamp unavailable`;
  }
  const absolute = formatAbsoluteUtc(date);
  const datetime = date.toISOString();
  return `${prefixHtml} <time datetime="${escapeHtml(datetime)}">${escapeHtml(absolute)}</time><span class="relative-age" data-relative-from="${escapeHtml(datetime)}"></span>`;
}

function stageStatus(stage: unknown): string {
  return text(record(stage).status, "missing");
}

function combinedStageState(...statuses: readonly string[]): StageState {
  if (statuses.every((status) => status === "passed")) return "passed";
  if (
    statuses.some((status) =>
      ["blocked", "unresolved", "stale"].includes(status),
    )
  ) {
    return "warning";
  }
  if (statuses.some((status) => status === "not_applicable")) return "muted";
  return "failed";
}

function stagePassed(stages: UnknownRecord, name: string): boolean {
  return stageStatus(stages[name]) === "passed";
}

function hasEndToEndTest(stages: UnknownRecord): boolean {
  const evidence = records(record(stages.passingE2e).receiptEvidence);
  return evidence.some((item) => item.scope === "end_to_end");
}

function implementationOwned(stages: UnknownRecord): boolean {
  const productionSymbols = strings(record(stages.productionSymbols).symbols);
  if (productionSymbols.length === 0) return false;

  const sourceCoordinates = record(stages.sourceCoordinates);
  if (sourceCoordinates.requirementSource !== "present") return false;
  const missingCoordinates = new Set(strings(sourceCoordinates.missingSymbols));
  return productionSymbols.every((symbol) => !missingCoordinates.has(symbol));
}

function passesProofGate(row: UnknownRecord, gate: string): boolean {
  if (row.proofStatus === "proven") return true;
  const stages = record(row.proofStages);
  if (gate === "semantic") {
    return (
      stagePassed(stages, "semanticInventory") &&
      stagePassed(stages, "logicGrounding") &&
      stagePassed(stages, "contradictions")
    );
  }
  if (gate === "scenario") return stagePassed(stages, "scenarios");
  if (gate === "implementation") return implementationOwned(stages);
  if (gate === "e2e") {
    return stagePassed(stages, "scenarioTests") && hasEndToEndTest(stages);
  }
  return row.proofStatus === "proven";
}

function proofGates(rows: readonly UnknownRecord[]): readonly ProofGate[] {
  const definitions = [
    [
      "semantic",
      "Semantic model",
      "Intent is complete, grounded, and coherent",
    ],
    ["scenario", "Scenario", "Behavior is specified"],
    [
      "implementation",
      "Implementation",
      "Production ownership is source-bound",
    ],
    ["e2e", "E2E", "A scenario-backed end-to-end test exists"],
    ["evidence", "Evidence", "Every strict proof stage passes now"],
  ] as const;
  let candidates = [...rows];
  return definitions.map(([key, label, detail]) => {
    const remainingRows = candidates.filter((row) => passesProofGate(row, key));
    const gate = {
      key,
      label,
      detail,
      remaining: remainingRows.length,
      blocked: candidates.length - remainingRows.length,
    };
    candidates = remainingRows;
    return gate;
  });
}

function earliestUnmetGate(row: UnknownRecord): ProofGateKey | "proven" {
  if (row.proofStatus === "proven") return "proven";
  for (const gate of [
    "semantic",
    "scenario",
    "implementation",
    "e2e",
    "evidence",
  ] as const) {
    if (!passesProofGate(row, gate)) return gate;
  }
  return "proven";
}

function evidenceStage(
  passingE2e: UnknownRecord,
  testSources: readonly SourceCoordinate[],
  repository: ReportRepository | undefined,
): ReportStage {
  const evidence = records(passingE2e.receiptEvidence);
  const passed = evidence.find((item) => item.state === "passed");
  if (passed) {
    const testSource =
      testSources.find((item) => item.id === text(passed.testId)) ??
      testSources[0];
    const prefix = linkedLabel("Passed", sourceWebUrl(repository, testSource));
    return {
      label: "Evidence",
      detail: renderRelativeTime(text(passed.finishedAt) || undefined, prefix),
      state: "passed",
    };
  }

  const evidenceState = text(evidence[0]?.state);
  if (evidenceState === "stale") {
    return {
      label: "Evidence",
      detail: "E2E receipt stale for this code snapshot",
      state: "warning",
    };
  }
  if (evidenceState === "contract_mismatch") {
    return {
      label: "Evidence",
      detail: "Receipt uses an older verification contract",
      state: "warning",
    };
  }
  if (evidenceState === "snapshot_unavailable") {
    return {
      label: "Evidence",
      detail: "Code snapshot unavailable",
      state: "warning",
    };
  }
  if (["failed", "invalid"].includes(evidenceState)) {
    return {
      label: "Evidence",
      detail: `${escapeHtml(humanize(evidenceState))} E2E receipt`,
      state: "failed",
    };
  }
  return {
    label: "Evidence",
    detail: "No fresh passing E2E receipt",
    state: "failed",
  };
}

function linkedSourceList(
  coordinates: readonly SourceCoordinate[],
  repository: ReportRepository | undefined,
  fallback: string,
): string {
  if (coordinates.length === 0) return escapeHtml(fallback);
  const visible = coordinates
    .slice(0, 2)
    .map((coordinate) =>
      linkedCoordinate(
        coordinate,
        repository,
        formatSourceCoordinate(coordinate) ?? text(coordinate.id, fallback),
      ),
    );
  const extra = coordinates.length - visible.length;
  return extra > 0
    ? `${visible.join(", ")} +${extra.toLocaleString("en-US")} more`
    : visible.join(", ");
}

function requirementStages(
  row: UnknownRecord,
  repository: ReportRepository | undefined,
): readonly ReportStage[] {
  const stages = record(row.proofStages);
  const semanticInventory = stageStatus(stages.semanticInventory);
  const logicGrounding = stageStatus(stages.logicGrounding);
  const contradictions = stageStatus(stages.contradictions);
  const scenarios = stageStatus(stages.scenarios);
  const scenarioTests = stageStatus(stages.scenarioTests);
  const productionSymbols = record(stages.productionSymbols);
  const sourceCoordinatesStage = record(stages.sourceCoordinates);
  const executableSymbols = record(stages.executableSymbols);
  const passingE2e = record(stages.passingE2e);
  const implementationSymbols = strings(productionSymbols.symbols);
  const missingCoordinates = strings(sourceCoordinatesStage.missingSymbols);
  const receiptEvidence = records(passingE2e.receiptEvidence);
  const hasE2e = receiptEvidence.some((item) => item.scope === "end_to_end");
  const factSources = sourceCoordinates(record(stages.logicGrounding).sources);
  const scenarioSources = sourceCoordinates(record(stages.scenarios).sources);
  const testSources = sourceCoordinates(record(stages.scenarioTests).sources);
  const productionSources = sourceCoordinates(productionSymbols.coordinates);
  const executableSources = sourceCoordinates(executableSymbols.coordinates);

  let implementationState: StageState = "failed";
  let implementationDetail = "No production symbol ownership";
  if (
    stageStatus(productionSymbols) === "passed" &&
    stageStatus(sourceCoordinatesStage) === "passed"
  ) {
    implementationState = "passed";
    implementationDetail = linkedSourceList(
      productionSources,
      repository,
      `${implementationSymbols.length} owned and E2E-covered ${implementationSymbols.length === 1 ? "symbol" : "symbols"}`,
    );
  } else if (implementationSymbols.length > 0) {
    implementationState = "warning";
    implementationDetail =
      missingCoordinates.length > 0
        ? `${missingCoordinates.length} ${missingCoordinates.length === 1 ? "symbol needs" : "symbols need"} current coordinates`
        : "Ownership present; proof coverage is incomplete";
  }

  const e2eState: StageState = hasE2e
    ? stageStatus(executableSymbols) === "missing"
      ? "warning"
      : "passed"
    : "failed";

  const semanticDetail =
    semanticInventory === "passed" && logicGrounding === "passed"
      ? contradictions === "passed"
        ? linkedSourceList(
            factSources,
            repository,
            "Complete, grounded, and coherent",
          )
        : "Grounded with unresolved coherence"
      : "Incomplete proposition grounding";
  const scenarioCount = strings(record(stages.scenarios).scenarios).length;
  const scenarioDetail =
    scenarios === "passed" && scenarioTests === "passed"
      ? linkedSourceList(
          scenarioSources,
          repository,
          `${scenarioCount} specified`,
        )
      : scenarios !== "passed"
        ? "Missing requirement scenario"
        : "Scenario has no linked test";
  const e2eDetail = hasE2e
    ? stageStatus(executableSymbols) === "missing"
      ? "Test exists; executable symbol is missing"
      : linkedSourceList(
          testSources.length > 0 ? testSources : executableSources,
          repository,
          "Scenario-backed executable test",
        )
    : "No scenario-backed end-to-end test";

  return [
    {
      label: "Semantic model",
      detail: semanticDetail,
      state: combinedStageState(
        semanticInventory,
        logicGrounding,
        contradictions,
      ),
    },
    {
      label: "Scenario",
      detail: scenarioDetail,
      state: combinedStageState(scenarios, scenarioTests),
    },
    {
      label: "Implementation",
      detail: implementationDetail,
      state: implementationState,
    },
    {
      label: "E2E test",
      detail: e2eDetail,
      state: e2eState,
    },
    evidenceStage(passingE2e, testSources, repository),
  ];
}

function renderStage(stage: ReportStage): string {
  const icons: Readonly<Record<StageState, string>> = {
    passed: "✓",
    warning: "!",
    failed: "×",
    muted: "—",
  };
  return `<li class="stage stage--${stage.state}">
    <span class="stage__icon" aria-hidden="true">${icons[stage.state]}</span>
    <span class="stage__label">${escapeHtml(stage.label)}</span>
    <span class="stage__detail">${stage.detail}</span>
  </li>`;
}

function formatTermValue(side: UnknownRecord): string {
  const term = record(side.term);
  if (term.value !== undefined) {
    const value = Array.isArray(term.value)
      ? term.value.join(", ")
      : String(term.value);
    return text(term.unit) ? `${value} ${text(term.unit)}` : value;
  }
  if (term.polarity !== undefined) return text(term.polarity);
  return text(side.claimText, text(side.factId, "conflicting claim"));
}

function conflictKey(conflict: UnknownRecord): string {
  const requirements = strings(conflict.requirements).slice().sort().join("/");
  return `${requirements}:${text(conflict.kind)}:${text(conflict.reason)}`;
}

function contradictionRows(rows: readonly UnknownRecord[]): UnknownRecord[] {
  const unique = new Map<string, UnknownRecord>();
  for (const row of rows) {
    const conflicts = records(
      record(record(row.proofStages).contradictions).conflicts,
    );
    for (const conflict of conflicts) {
      if (text(conflict.status) !== "contradiction") continue;
      unique.set(conflictKey(conflict), conflict);
    }
  }
  return [...unique.values()];
}

function renderContradiction(conflict: UnknownRecord): string {
  const left = record(conflict.left);
  const right = record(conflict.right);
  const subject = text(conflict.propertyKey, text(conflict.predicateName));
  return `<div class="contradiction">
    <div class="contradiction__eyebrow">Contradiction${subject ? ` · ${escapeHtml(humanize(subject))}` : ""}</div>
    <div class="contradiction__values"><span>${escapeHtml(formatTermValue(left))}</span><b>↔</b><span>${escapeHtml(formatTermValue(right))}</span></div>
    <p>${escapeHtml(text(conflict.reason, "Two current requirements encode incompatible claims."))}</p>
  </div>`;
}

function rowSeverity(row: UnknownRecord): number {
  const gaps = strings(row.proofGaps);
  if (gaps.includes("blocking_contradiction")) return 0;
  if (gaps.includes("stale_proof_receipt")) return 1;
  if (row.proofStatus !== "proven") return 2;
  return 3;
}

function rowStates(row: UnknownRecord): string {
  const states = new Set<string>();
  const gaps = strings(row.proofGaps);
  if (row.proofStatus === "proven") states.add("proven");
  else states.add("attention");
  if (gaps.includes("stale_proof_receipt")) states.add("stale");
  if (gaps.includes("blocking_contradiction")) states.add("contradiction");
  return [...states].join(" ");
}

function renderIssueList(
  codes: readonly string[],
  className: string,
  singular: string,
  plural: string,
): string {
  if (codes.length === 0) return "";
  const label = `${codes.length} ${codes.length === 1 ? singular : plural}`;
  return `<details class="${className}"><summary>${escapeHtml(label)}</summary><ul>${codes.map((code) => `<li>${escapeHtml(humanize(code))}</li>`).join("")}</ul></details>`;
}

function renderRequirement(
  row: UnknownRecord,
  repository: ReportRepository | undefined,
): string {
  const id = text(row.id, "REQ-UNKNOWN");
  const title = text(row.title, "Untitled requirement");
  const proofStatus = text(row.proofStatus, "missing");
  const proofGaps = strings(row.proofGaps);
  const proofAdvisories = strings(row.proofAdvisories);
  const blockingGaps = proofStatus === "proven" ? [] : proofGaps;
  const advisories =
    proofStatus === "proven"
      ? [
          ...proofAdvisories,
          ...proofGaps.filter((gap) => !proofAdvisories.includes(gap)),
        ]
      : proofAdvisories;
  const conflicts = records(
    record(record(row.proofStages).contradictions).conflicts,
  ).filter((conflict) => text(conflict.status) === "contradiction");
  const stages = requirementStages(row, repository);
  const badgeLabel = proofStatus === "proven" ? "Proven" : "Needs attention";
  const requirementSource =
    sourceCoordinate({
      path: text(
        record(record(row.proofStages).sourceCoordinates).requirementPath,
        text(row.source),
      ),
    }) ?? sourceCoordinate({ path: text(row.source) });
  const gate = earliestUnmetGate(row);

  return `<article class="requirement requirement--${escapeHtml(proofStatus)}" data-state="${rowStates(row)}" data-gate="${escapeHtml(gate)}">
    <header class="requirement__header">
      <div>
        <div class="requirement__id">${linkedLabel(id, sourceWebUrl(repository, requirementSource))}</div>
        <h3>${linkedLabel(title, sourceWebUrl(repository, requirementSource))}</h3>
      </div>
      <span class="proof-badge proof-badge--${escapeHtml(proofStatus)}">${escapeHtml(badgeLabel)}</span>
    </header>
    <ul class="stages">${stages.map(renderStage).join("")}</ul>
    ${conflicts.map(renderContradiction).join("")}
    ${renderIssueList(blockingGaps, "proof-gaps", "proof gap", "proof gaps")}
    ${renderIssueList(advisories, "proof-advisories", "advisory", "advisories")}
  </article>`;
}

function metric(label: string, value: number, tone = ""): string {
  return `<div class="metric${tone ? ` metric--${tone}` : ""}"><span>${escapeHtml(label)}</span><strong>${value.toLocaleString("en-US")}</strong></div>`;
}

function renderProofGate(gate: ProofGate, index: number): string {
  const state = gate.remaining === 0 ? "blocked" : "active";
  const drop =
    gate.blocked === 0
      ? "No drop"
      : `−${gate.blocked.toLocaleString("en-US")} blocked here`;
  const accessible = `${gate.label}. ${gate.blocked} blocked here. Filter requirements whose earliest unmet proof gate is ${gate.label}.`;
  return `<li>
    <button type="button" class="proof-gate proof-gate--${state}" data-gate="${escapeHtml(gate.key)}" aria-pressed="false" aria-controls="requirements" aria-label="${escapeHtml(accessible)}">
      <div class="proof-gate__node"><span>${index + 1}</span></div>
      <div class="proof-gate__count">${gate.remaining.toLocaleString("en-US")}</div>
      <div class="proof-gate__label">${escapeHtml(gate.label)}</div>
      <div class="proof-gate__drop">${escapeHtml(drop)}</div>
      <p>${escapeHtml(gate.detail)}</p>
    </button>
  </li>`;
}

function reportNotice(input: HtmlReportInput): string {
  const meta = input.requirements.meta ?? {};
  const notices: string[] = [];
  if (meta.dirty === true)
    notices.push("The Kibi knowledge snapshot is stale.");
  if (meta.proofSnapshotDirty === true) {
    notices.push("Proof was evaluated against a dirty workspace.");
  }
  if (notices.length === 0) return "";
  return `<aside class="snapshot-notice"><strong>Snapshot warning</strong><span>${escapeHtml(notices.join(" "))}</span></aside>`;
}

function reportIdentity(input: HtmlReportInput): {
  title: string;
  snapshotHtml: string;
} {
  const branch = text(input.branch, "unknown");
  const repository = input.repository;
  const identity = text(repository?.identity);
  const shortSha = shortCommitSha(repository?.commitSha);
  const repoHref = repository?.webUrl;
  const commitHref = commitWebUrl(repository);
  const parts = [
    identity ? linkedLabel(identity, repoHref) : "",
    escapeHtml(branch),
    shortSha ? linkedLabel(shortSha, commitHref) : "",
  ].filter(Boolean);
  const snapshotHtml =
    parts.length > 0
      ? parts.join(' <span aria-hidden="true">/</span> ')
      : "local workspace";
  const titleParts = ["Kibi Requirement Health", identity, branch].filter(
    Boolean,
  );
  return {
    title: titleParts.join(" · "),
    snapshotHtml,
  };
}

function renderFilters(
  counts: Readonly<Record<(typeof REPORT_FILTERS)[number], number>>,
): string {
  const labels: Readonly<Record<(typeof REPORT_FILTERS)[number], string>> = {
    all: "All",
    proven: "Proven",
    attention: "Needs attention",
    stale: "Stale evidence",
    contradiction: "Contradictions",
  };
  return REPORT_FILTERS.map((filter, index) => {
    const countValue = counts[filter].toLocaleString("en-US");
    return `<button class="filter" type="button" data-filter="${filter}" aria-pressed="${index === 0 ? "true" : "false"}">${escapeHtml(labels[filter])} <span class="filter__count">${countValue}</span></button>`;
  }).join("");
}

// implements REQ-kibi-html-health-report
export function renderHtmlReport(input: HtmlReportInput): string {
  const summary = input.requirements.summary;
  const symbolSummary = input.symbols.summary;
  const currentRows = input.requirements.rows
    .filter((row) => row.proofStatus !== "not_applicable")
    .slice()
    .sort((left, right) => {
      const severity = rowSeverity(left) - rowSeverity(right);
      return severity || text(left.id).localeCompare(text(right.id));
    });
  const total = count(summary.total);
  const notApplicable = count(summary.proofNotApplicable);
  const currentRequirements = Math.max(0, total - notApplicable);
  const proven = count(summary.proofProven);
  const proofPercent =
    currentRequirements === 0
      ? 0
      : Math.round((proven / currentRequirements) * 100);
  const missingScenarios = currentRows.filter((row) =>
    strings(row.proofGaps).includes("missing_scenario"),
  ).length;
  const staleEvidence = currentRows.filter((row) =>
    strings(row.proofGaps).includes("stale_proof_receipt"),
  ).length;
  const withoutImplementation = currentRows.filter((row) =>
    strings(row.proofGaps).includes("missing_production_symbol"),
  ).length;
  const contradictions = contradictionRows(currentRows);
  const unmappedProductionSymbols = Math.max(
    0,
    count(symbolSummary.uncovered) - count(symbolSummary.mixedRole),
  );
  const generatedAt = input.generatedAt.toISOString();
  const snapshot = text(input.requirements.meta?.proofSnapshot);
  const branch = text(input.branch, "unknown");
  const repository = {
    ...input.repository,
    branch: input.repository?.branch ?? branch,
  };
  const gates = proofGates(currentRows);
  const filterCounts = reportFilterCounts(
    currentRows.map((row) => ({
      text: `${text(row.id)} ${text(row.title)}`,
      states: rowStates(row).split(" ").filter(Boolean),
      earliestGate: earliestUnmetGate(row),
    })),
  );
  const identity = reportIdentity({ ...input, repository });
  const faviconHref = renderKibiFaviconDataUri();
  const scoreLabel =
    currentRequirements === 0
      ? "No current requirements"
      : "Strict proof coverage";
  const scoreRatio =
    currentRequirements === 0
      ? "No current requirements to prove"
      : `${proven.toLocaleString("en-US")} of ${currentRequirements.toLocaleString("en-US")} current requirements fully proven end-to-end`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark light">
  <meta name="theme-color" content="${KIBI_BRAND.deepCarbon}">
  <meta http-equiv="Content-Security-Policy" content="${REPORT_CSP}">
  <link rel="icon" type="image/svg+xml" href="${escapeHtml(faviconHref)}">
  <title>${escapeHtml(identity.title)}</title>
  <style>\n${reportStyles()}\n  </style>
</head>
<body>
  <div class="shell">
    <header class="topbar">
      <div class="brand">
        ${renderKibiLogo("brand__logo")}
        ${renderKibiWordmark("brand__wordmark")}
        <span class="brand__product">Requirement health</span>
      </div>
      <div class="snapshot">${identity.snapshotHtml}</div>
    </header>
    <main>
      <section class="overview">
        <div class="overview__copy">
          <p class="eyebrow">Requirement health · ${escapeHtml(branch)}</p>
          <h1>Intent to proof,<br>without the gaps.</h1>
          <p>Kibi compiles product intent into an inspectable chain of semantics, scenarios, implementation ownership, end-to-end tests, and fresh evidence.</p>
        </div>
        <div class="score" aria-label="${proofPercent}% strict proof coverage, ${proven} of ${currentRequirements} current requirements fully proven end-to-end">
          <div class="score__value">${proofPercent}<span>%</span></div>
          <div class="score__label">${escapeHtml(scoreLabel)}</div>
          <div class="score__ratio">${escapeHtml(scoreRatio)}</div>
          ${currentRequirements === 0 ? "" : `<p class="score__note">Kibi only counts a requirement when every required proof gate passes.</p>`}
        </div>
      </section>
      ${reportNotice(input)}
      <section class="proof-path" aria-labelledby="proof-path-title">
        <div class="proof-path__header">
          <div><p class="eyebrow">Intent → proof</p><h2 id="proof-path-title">Where proof stops</h2></div>
          <p>Counts are sequential. Each drop is the earliest unmet gate, so a strict score never looks like a broken report. Select a gate to inspect those requirements.</p>
        </div>
        <ol class="proof-rail" aria-label="Filter requirements by earliest unmet proof gate">${gates.map(renderProofGate).join("")}</ol>
      </section>
      <section class="metrics" aria-label="Requirement health summary">
        ${metric("Requirements", currentRequirements)}
        ${metric("Strict proof coverage", proven, "good")}
        ${metric("Missing scenarios", missingScenarios, missingScenarios ? "warn" : "")}
        ${metric("Stale E2E evidence", staleEvidence, staleEvidence ? "warn" : "")}
        ${metric("Contradictions", contradictions.length, contradictions.length ? "bad" : "")}
        ${metric("Unmapped production symbols", unmappedProductionSymbols, unmappedProductionSymbols ? "bad" : "")}
        ${metric("Requirements without implementation", withoutImplementation, withoutImplementation ? "warn" : "")}
      </section>
      <section>
        <div class="section-header">
          <div><p class="eyebrow">Proof ledger</p><h2>Requirements</h2></div>
          <p>Each row shows independent proof stages. Missing knowledge remains visible instead of being inferred as success.</p>
        </div>
        <div class="controls">
          <input class="search" id="search" type="search" placeholder="Search requirements" aria-label="Search requirements">
          <div class="filters" role="group" aria-label="Filter requirements">
            ${renderFilters(filterCounts)}
          </div>
        </div>
        <div class="requirements" id="requirements">${currentRows.map((row) => renderRequirement(row, repository)).join("")}</div>
        <div class="empty" id="empty" aria-live="polite">No requirements match this view.</div>
      </section>
    </main>
    <footer>
      <span>${renderRelativeTime(generatedAt, "Generated")}${snapshot ? ` · snapshot ${escapeHtml(snapshot.slice(0, 12))}` : ""}${notApplicable > 0 ? ` · ${notApplicable.toLocaleString("en-US")} non-current ${notApplicable === 1 ? "requirement" : "requirements"} excluded` : ""}</span>
      <span>Generated by Kibi · <a class="cta" href="${KIBI_GETTING_STARTED_URL}">Add requirement proof to your repo →</a></span>
    </footer>
  </div>
  <script>
    (() => {
      const search = document.querySelector("#search");
      const cards = [...document.querySelectorAll(".requirement")];
      const filters = [...document.querySelectorAll(".filter")];
      const gates = [...document.querySelectorAll(".proof-gate")];
      const empty = document.querySelector("#empty");
      let activeFilter = "all";
      let activeGate = "all";
      const formatRelativeAge = (fromMs, nowMs) => {
        if (!Number.isFinite(fromMs) || !Number.isFinite(nowMs)) return "timestamp unavailable";
        const deltaSeconds = Math.floor((nowMs - fromMs) / 1000);
        if (deltaSeconds < 0) return "in the future";
        if (deltaSeconds < 60) return "just now";
        const minutes = Math.floor(deltaSeconds / 60);
        if (minutes < 60) return minutes + "m ago";
        const hours = Math.floor(deltaSeconds / 3600);
        const remainingMinutes = minutes % 60;
        if (hours < 24) return remainingMinutes === 0 ? hours + "h ago" : hours + "h " + remainingMinutes + "m ago";
        const days = Math.floor(deltaSeconds / 86400);
        const remainingHours = hours % 24;
        if (days < 7 && remainingHours > 0) return days + "d " + remainingHours + "h ago";
        return days + "d ago";
      };
      const refreshAges = (now = Date.now()) => {
        for (const node of document.querySelectorAll("[data-relative-from]")) {
          const from = Date.parse(node.getAttribute("data-relative-from") || "");
          node.textContent = formatRelativeAge(from, now);
        }
      };
      const apply = () => {
        const query = (search.value || "").trim().toLocaleLowerCase();
        let visible = 0;
        for (const card of cards) {
          const states = (card.dataset.state || "").split(" ").filter(Boolean);
          const gate = card.dataset.gate || "";
          const matchesState = activeFilter === "all" || states.includes(activeFilter);
          const matchesGate = activeGate === "all" || gate === activeGate;
          const matchesQuery = !query || (card.textContent || "").toLocaleLowerCase().includes(query);
          card.hidden = !(matchesState && matchesGate && matchesQuery);
          if (!card.hidden) visible += 1;
        }
        empty.dataset.visible = String(visible === 0);
      };
      search.addEventListener("input", apply);
      for (const filter of filters) {
        filter.addEventListener("click", () => {
          activeFilter = filter.dataset.filter || "all";
          for (const candidate of filters) candidate.setAttribute("aria-pressed", String(candidate === filter));
          apply();
        });
      }
      for (const gate of gates) {
        gate.addEventListener("click", () => {
          const selected = gate.dataset.gate || "all";
          activeGate = activeGate === selected ? "all" : selected;
          for (const candidate of gates) {
            candidate.setAttribute("aria-pressed", String(candidate.dataset.gate === activeGate));
          }
          apply();
        });
      }
      refreshAges();
      setInterval(refreshAges, 30000);
    })();
  </script>
</body>
</html>`;
}
