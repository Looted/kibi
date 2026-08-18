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
  if (gaps.includes("stale_verification_receipt")) return 1;
  if (row.proofStatus !== "proven") return 2;
  return 3;
}

function rowStates(row: UnknownRecord): string {
  const states = new Set<string>();
  const gaps = strings(row.proofGaps);
  if (row.proofStatus === "proven") states.add("proven");
  else states.add("attention");
  if (gaps.includes("stale_verification_receipt")) states.add("stale");
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
  if (meta.verificationSnapshotDirty === true) {
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
    strings(row.proofGaps).includes("stale_verification_receipt"),
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
  const snapshot = text(input.requirements.meta?.verificationSnapshot);
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
  <style>
    :root {
      color-scheme: dark;
      --bg: #090d18;
      --surface: rgba(20, 27, 45, .86);
      --surface-strong: #151d30;
      --line: rgba(157, 171, 206, .16);
      --text: #f4f7ff;
      --muted: #9ba7c3;
      --violet: #9d84ff;
      --cyan: #5ce1e6;
      --green: #62e6a7;
      --amber: #ffc96b;
      --red: #ff7d90;
      --shadow: 0 30px 80px rgba(0, 0, 0, .35);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      min-width: 320px;
      color: var(--text);
      background:
        radial-gradient(circle at 12% -10%, rgba(93, 74, 190, .32), transparent 34rem),
        radial-gradient(circle at 88% 8%, rgba(33, 153, 166, .19), transparent 30rem),
        var(--bg);
    }
    body::before {
      position: fixed;
      inset: 0;
      z-index: -1;
      content: "";
      opacity: .18;
      background-image: linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
      background-size: 38px 38px;
      mask-image: linear-gradient(to bottom, black, transparent 75%);
    }
    .shell { width: min(1160px, calc(100% - 40px)); margin: 0 auto; }
    .topbar { display: flex; align-items: center; justify-content: space-between; padding: 34px 0 16px; }
    .brand { display: flex; align-items: center; gap: 12px; font-weight: 900; letter-spacing: .3em; }
    .brand__mark { display: grid; width: 34px; height: 34px; place-items: center; border: 1px solid rgba(157,132,255,.55); border-radius: 11px; color: var(--violet); background: rgba(157,132,255,.12); box-shadow: inset 0 0 18px rgba(157,132,255,.12); }
    .snapshot { color: var(--muted); font: 500 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; }
    .hero { display: grid; grid-template-columns: 1.15fr .85fr; gap: 30px; align-items: stretch; padding: 42px 0 26px; }
    .hero__copy, .score-card { border: 1px solid var(--line); border-radius: 28px; background: linear-gradient(145deg, rgba(25,33,54,.92), rgba(13,18,31,.82)); box-shadow: var(--shadow); }
    .hero__copy { padding: clamp(30px, 5vw, 62px); }
    .eyebrow { margin: 0 0 17px; color: var(--cyan); font-size: 12px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
    h1 { max-width: 720px; margin: 0; font-size: clamp(42px, 7vw, 76px); font-weight: 760; letter-spacing: -.055em; line-height: .98; }
    h1 span { display: block; color: var(--muted); font-size: .42em; font-weight: 620; letter-spacing: -.025em; line-height: 1.4; }
    .hero__lede { max-width: 620px; margin: 25px 0 0; color: #bdc6dc; font-size: 17px; line-height: 1.65; }
    .score-card { display: grid; min-height: 340px; padding: 38px; place-items: center; text-align: center; }
    .score-ring { --score: 0%; position: relative; display: grid; width: 220px; aspect-ratio: 1; place-items: center; border-radius: 50%; background: conic-gradient(var(--green) var(--score), rgba(255,255,255,.08) 0); box-shadow: 0 0 60px rgba(98,230,167,.12); }
    .score-ring::before { position: absolute; width: 178px; aspect-ratio: 1; content: ""; border: 1px solid var(--line); border-radius: inherit; background: #111827; }
    .score-ring__value { position: relative; font-size: 52px; font-weight: 820; letter-spacing: -.06em; }
    .score-ring__value span { margin-left: 2px; color: var(--muted); font-size: 22px; }
    .score-card p { position: relative; margin: 13px 0 0; color: var(--muted); font-size: 13px; font-weight: 750; letter-spacing: .12em; text-transform: uppercase; }
    .snapshot-notice { display: flex; gap: 14px; align-items: center; margin: 3px 0 23px; padding: 15px 18px; border: 1px solid rgba(255,201,107,.3); border-radius: 15px; color: #f8dfb2; background: rgba(255,201,107,.08); }
    .snapshot-notice strong { flex: none; color: var(--amber); font-size: 12px; letter-spacing: .08em; text-transform: uppercase; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(148px, 1fr)); overflow: hidden; margin: 0 0 62px; border: 1px solid var(--line); border-radius: 20px; background: rgba(18,25,42,.74); box-shadow: var(--shadow); }
    .metric { min-width: 0; padding: 22px 20px; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); }
    .metric:last-child { border-right: 0; }
    .metric span { display: block; min-height: 32px; color: var(--muted); font-size: 12px; line-height: 1.35; }
    .metric strong { display: block; margin-top: 6px; font-size: 30px; letter-spacing: -.035em; }
    .metric--good strong { color: var(--green); }
    .metric--warn strong { color: var(--amber); }
    .metric--bad strong { color: var(--red); }
    .section-header { display: flex; gap: 24px; align-items: end; justify-content: space-between; margin-bottom: 24px; }
    .section-header h2 { margin: 0; font-size: clamp(29px, 4vw, 42px); letter-spacing: -.04em; }
    .section-header p { max-width: 590px; margin: 8px 0 0; color: var(--muted); line-height: 1.55; }
    .controls { position: sticky; top: 12px; z-index: 4; display: flex; gap: 12px; margin: 0 0 24px; padding: 12px; border: 1px solid var(--line); border-radius: 18px; background: rgba(9,13,24,.86); box-shadow: 0 16px 40px rgba(0,0,0,.25); backdrop-filter: blur(18px); }
    .search { min-width: 180px; flex: 1; padding: 12px 15px; border: 1px solid var(--line); border-radius: 12px; outline: none; color: var(--text); background: rgba(255,255,255,.045); font: inherit; }
    .search:focus { border-color: var(--violet); box-shadow: 0 0 0 3px rgba(157,132,255,.12); }
    .filters { display: flex; gap: 7px; overflow-x: auto; }
    .filter { padding: 10px 13px; border: 1px solid transparent; border-radius: 11px; color: var(--muted); background: transparent; cursor: pointer; font: inherit; font-size: 12px; font-weight: 650; white-space: nowrap; }
    .filter:hover { color: var(--text); background: rgba(255,255,255,.05); }
    .filter[aria-pressed="true"] { border-color: rgba(157,132,255,.38); color: #ddd5ff; background: rgba(157,132,255,.14); }
    .requirements { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; padding-bottom: 80px; }
    .requirement { position: relative; overflow: hidden; padding: 25px; border: 1px solid var(--line); border-radius: 20px; background: linear-gradient(145deg, rgba(22,30,50,.94), rgba(15,21,36,.9)); box-shadow: 0 16px 45px rgba(0,0,0,.2); }
    .requirement::before { position: absolute; inset: 0 auto 0 0; width: 3px; content: ""; background: var(--amber); }
    .requirement--proven::before { background: var(--green); }
    .requirement--unresolved::before { background: var(--red); }
    .requirement[hidden] { display: none; }
    .requirement__header { display: flex; gap: 18px; align-items: start; justify-content: space-between; }
    .requirement__id { margin-bottom: 7px; color: var(--muted); font: 700 11px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .05em; }
    .requirement h3 { margin: 0; font-size: 20px; line-height: 1.25; letter-spacing: -.02em; }
    .proof-badge { flex: none; padding: 7px 9px; border: 1px solid rgba(255,201,107,.25); border-radius: 999px; color: var(--amber); background: rgba(255,201,107,.08); font-size: 10px; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; }
    .proof-badge--proven { border-color: rgba(98,230,167,.25); color: var(--green); background: rgba(98,230,167,.08); }
    .proof-badge--unresolved { border-color: rgba(255,125,144,.25); color: var(--red); background: rgba(255,125,144,.08); }
    .stages { display: grid; gap: 9px; margin: 24px 0 0; padding: 0; list-style: none; }
    .stage { display: grid; grid-template-columns: 20px minmax(100px, .7fr) 1.3fr; gap: 8px; align-items: baseline; }
    .stage__icon { display: grid; width: 17px; height: 17px; place-items: center; border-radius: 50%; color: #08130e; background: var(--green); font-size: 11px; font-weight: 900; }
    .stage--warning .stage__icon { color: #241602; background: var(--amber); }
    .stage--failed .stage__icon { color: #24080c; background: var(--red); }
    .stage--muted .stage__icon { color: var(--muted); background: rgba(255,255,255,.08); }
    .stage__label { font-size: 13px; font-weight: 720; }
    .stage__detail { color: var(--muted); font-size: 12px; line-height: 1.45; }
    .contradiction { margin-top: 21px; padding: 16px; border: 1px solid rgba(255,125,144,.24); border-radius: 14px; background: rgba(255,125,144,.07); }
    .contradiction__eyebrow { color: var(--red); font-size: 10px; font-weight: 850; letter-spacing: .1em; text-transform: uppercase; }
    .contradiction__values { display: flex; gap: 11px; align-items: center; margin-top: 9px; font: 750 15px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; }
    .contradiction__values b { color: var(--red); }
    .contradiction p { margin: 8px 0 0; color: #d9a9b1; font-size: 12px; line-height: 1.5; }
    .proof-gaps { margin-top: 18px; border-top: 1px solid var(--line); color: var(--muted); font-size: 12px; }
    .proof-advisories { margin-top: 12px; border-top: 1px solid var(--line); color: var(--muted); font-size: 12px; }
    .proof-gaps summary, .proof-advisories summary { padding-top: 14px; cursor: pointer; font-weight: 700; }
    .proof-gaps ul, .proof-advisories ul { columns: 2; margin: 11px 0 0; padding-left: 18px; }
    .proof-gaps li, .proof-advisories li { margin-bottom: 7px; break-inside: avoid; }
    .empty { display: none; padding: 70px 20px; border: 1px dashed var(--line); border-radius: 20px; color: var(--muted); text-align: center; }
    .empty[data-visible="true"] { display: block; }
    footer { display: flex; gap: 20px; justify-content: space-between; padding: 30px 0 48px; border-top: 1px solid var(--line); color: var(--muted); font-size: 12px; }
    @media (max-width: 960px) {
      .hero { grid-template-columns: 1fr; }
      .score-card { min-height: 290px; }
      .metrics { grid-template-columns: repeat(3, 1fr); }
      .metric:nth-child(3) { border-right: 0; }
      .metric:nth-child(-n+3) { border-bottom: 1px solid var(--line); }
    }
    @media (max-width: 760px) {
      .shell { width: min(100% - 24px, 1160px); }
      .topbar { padding-top: 22px; }
      .hero { padding-top: 20px; }
      .hero__copy, .score-card { border-radius: 22px; }
      .requirements { grid-template-columns: 1fr; }
      .section-header { align-items: start; flex-direction: column; }
      .controls { align-items: stretch; flex-direction: column; }
      .filters { padding-bottom: 2px; }
      footer { flex-direction: column; }
    }
    @media (max-width: 520px) {
      .metrics { grid-template-columns: repeat(2, 1fr); }
      .metric { border-bottom: 1px solid var(--line); }
      .metric:nth-child(2n) { border-right: 0; }
      .metric:nth-last-child(-n+2) { border-bottom: 0; }
      .stage { grid-template-columns: 20px 1fr; }
      .stage__detail { grid-column: 2; }
      .proof-gaps ul { columns: 1; }
    }
    @media print {
      body { background: #fff; color: #111827; }
      body::before, .controls { display: none; }
      .hero__copy, .score-card, .metrics, .requirement { border-color: #d9deea; color: #111827; background: #fff; box-shadow: none; break-inside: avoid; }
      .requirements { display: block; }
      .requirement { margin-bottom: 14px; }
      .hero__lede, .metric span, .stage__detail, .section-header p, footer { color: #59647a; }
    }

    /* Kibi proof-rail identity. Tokens mirror assets/logo.svg and assets/wordmark.svg. */
    :root {
      --carbon: ${KIBI_BRAND.carbon};
      --deep-carbon: ${KIBI_BRAND.deepCarbon};
      --panel: ${KIBI_BRAND.panel};
      --ice: ${KIBI_BRAND.ice};
      --signal: ${KIBI_BRAND.signal};
      --snow: ${KIBI_BRAND.snow};
      --mist: ${KIBI_BRAND.mist};
      --rail: ${KIBI_BRAND.rail};
      --success: ${KIBI_BRAND.success};
      --warning: ${KIBI_BRAND.warning};
      --danger: ${KIBI_BRAND.danger};
      --line: rgba(162, 211, 244, .16);
      --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    body { color: var(--snow); background: var(--deep-carbon); }
    body::before { position: fixed; inset: 0 0 auto; z-index: -1; height: 4px; content: ""; opacity: 1; background: linear-gradient(90deg, var(--ice) 0 17%, var(--signal) 17% 100%); mask-image: none; }
    .shell { width: min(1180px, calc(100% - 40px)); }
    .topbar { padding: 30px 0 20px; border-bottom: 1px solid var(--line); }
    .brand { gap: 13px; letter-spacing: normal; }
    .brand__logo { width: 42px; height: 42px; flex: none; }
    .brand__wordmark { width: 86px; height: auto; }
    .brand__product { padding-left: 14px; border-left: 1px solid var(--rail); color: var(--mist); font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    .snapshot { max-width: min(52vw, 420px); overflow: hidden; color: var(--mist); font: 500 11px/1.4 var(--mono); text-align: right; text-overflow: ellipsis; }
    .snapshot a, .source-link, .cta { color: var(--ice); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 2px; }
    .snapshot a:hover, .source-link:hover, .cta:hover { color: var(--snow); }
    .relative-age::before { content: " · "; }
    .relative-age:empty::before { content: none; }
    .overview { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 36px; align-items: end; padding: clamp(38px, 7vw, 76px) 0 32px; }
    .eyebrow { margin: 0 0 12px; color: var(--ice); font: 750 11px/1.4 var(--mono); letter-spacing: .12em; }
    h1 { margin: 0; font-size: clamp(38px, 6vw, 68px); font-weight: 720; letter-spacing: -.052em; line-height: 1; }
    .overview__copy { max-width: 700px; }
    .overview__copy p:last-child { max-width: 660px; margin: 19px 0 0; color: var(--mist); font-size: 16px; line-height: 1.65; }
    .score { min-width: 220px; padding-left: 30px; border-left: 2px solid var(--signal); text-align: right; }
    .score__value { color: var(--snow); font: 760 clamp(62px, 9vw, 104px)/.84 var(--mono); letter-spacing: -.09em; }
    .score__value span { color: var(--ice); font-size: .38em; letter-spacing: -.04em; }
    .score__label { margin-top: 17px; color: var(--ice); font-size: 12px; font-weight: 760; letter-spacing: .12em; text-transform: uppercase; }
    .score__ratio { margin-top: 6px; color: var(--mist); font: 500 12px/1.4 var(--mono); }
    .score__note { max-width: 260px; margin: 10px 0 0 auto; color: var(--mist); font-size: 11px; font-weight: 500; letter-spacing: 0; line-height: 1.45; text-transform: none; }
    .snapshot-notice { margin: 0 0 22px; padding: 14px 16px; border-color: rgba(242,184,75,.4); border-radius: 9px; color: var(--snow); background: rgba(242,184,75,.08); }
    .snapshot-notice strong { color: var(--warning); font: 750 11px/1.4 var(--mono); }
    .proof-path { margin-bottom: 20px; padding: 24px 26px 22px; border: 1px solid var(--line); border-radius: 14px; background: var(--carbon); }
    .proof-path__header { display: flex; gap: 24px; align-items: start; justify-content: space-between; margin-bottom: 25px; }
    .proof-path__header h2 { margin: 0; font-size: 19px; letter-spacing: -.02em; }
    .proof-path__header p { max-width: 510px; margin: 0; color: var(--mist); font-size: 12px; line-height: 1.55; text-align: right; }
    .proof-rail { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); margin: 0; padding: 0; list-style: none; }
    .proof-rail > li { min-width: 0; }
    .proof-gate { position: relative; display: block; width: 100%; min-width: 0; margin: 0; padding: 25px 18px 0 0; border: 0; border-top: 2px solid var(--signal); border-radius: 0; color: inherit; background: transparent; font: inherit; text-align: left; cursor: pointer; }
    .proof-gate:last-child, .proof-rail > li:last-child .proof-gate { padding-right: 0; }
    .proof-gate:focus-visible { outline: 2px solid var(--ice); outline-offset: 4px; }
    .proof-gate[aria-pressed="true"] { background: rgba(62, 142, 214, .1); }
    .proof-gate__node { position: absolute; top: -10px; left: 0; display: grid; width: 19px; height: 19px; place-items: center; border: 2px solid var(--ice); border-radius: 50%; color: var(--deep-carbon); background: var(--ice); font: 800 9px/1 var(--mono); }
    .proof-gate--blocked { border-top-color: var(--rail); }
    .proof-gate--blocked .proof-gate__node { border-color: var(--danger); color: var(--danger); background: var(--carbon); }
    .proof-gate__count { font: 750 28px/1 var(--mono); letter-spacing: -.05em; }
    .proof-gate__label { margin-top: 8px; font-size: 13px; font-weight: 720; }
    .proof-gate__drop { min-height: 17px; margin-top: 5px; color: var(--warning); font: 650 10px/1.4 var(--mono); }
    .proof-gate p { margin: 7px 0 0; color: var(--mist); font-size: 11px; line-height: 1.45; }
    .metrics { margin: 0 0 62px; border-color: var(--line); border-radius: 12px; background: var(--panel); box-shadow: none; }
    .metric { position: relative; padding: 18px 17px; border-color: var(--line); }
    .metric::before { position: absolute; top: 0; left: 17px; width: 28px; height: 2px; content: ""; background: var(--signal); }
    .metric span { min-height: 31px; color: var(--mist); font-size: 11px; }
    .metric strong { margin-top: 4px; font: 720 26px/1 var(--mono); letter-spacing: -.04em; }
    .metric--good strong { color: var(--success); }
    .metric--warn strong { color: var(--warning); }
    .metric--bad strong { color: var(--danger); }
    .section-header p { color: var(--mist); }
    .controls { margin-bottom: 18px; padding: 10px; border-color: var(--line); border-radius: 12px; background: rgba(17,19,24,.94); box-shadow: none; backdrop-filter: blur(14px); }
    .search { padding: 11px 13px; border-color: var(--rail); border-radius: 8px; color: var(--snow); background: var(--carbon); }
    .search:focus { border-color: var(--ice); box-shadow: 0 0 0 3px rgba(162,211,244,.1); }
    .filters { gap: 6px; }
    .filter { padding: 9px 11px; border-radius: 7px; color: var(--mist); font: 650 11px/1.4 var(--mono); }
    .filter:hover { color: var(--snow); background: rgba(162,211,244,.06); }
    .filter[aria-pressed="true"] { border-color: rgba(162,211,244,.35); color: var(--ice); background: rgba(62,142,214,.13); }
    .filter:focus-visible { outline: 2px solid var(--ice); outline-offset: 2px; }
    .cta:focus-visible, .source-link:focus-visible, .snapshot a:focus-visible { outline: 2px solid var(--ice); outline-offset: 2px; }
    .requirements { grid-template-columns: 1fr; gap: 13px; }
    .requirement { padding: 22px 24px 20px; border-color: var(--line); border-radius: 12px; background: var(--panel); box-shadow: none; }
    .requirement::before { background: var(--warning); }
    .requirement--proven::before { background: var(--success); }
    .requirement--unresolved::before { background: var(--danger); }
    .requirement__id { color: var(--ice); font: 700 10px/1.2 var(--mono); letter-spacing: .07em; }
    .requirement h3 { font-size: 18px; line-height: 1.3; }
    .proof-badge { padding: 6px 8px; border-color: rgba(242,184,75,.3); border-radius: 6px; color: var(--warning); background: rgba(242,184,75,.07); font: 800 9px/1.2 var(--mono); }
    .proof-badge--proven { border-color: rgba(99,201,154,.3); color: var(--success); background: rgba(99,201,154,.07); }
    .proof-badge--unresolved { border-color: rgba(240,113,120,.3); color: var(--danger); background: rgba(240,113,120,.07); }
    .stages { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 0; }
    .stage { position: relative; display: block; min-width: 0; padding: 20px 13px 0 0; border-top: 1px solid var(--rail); }
    .stage:last-child { padding-right: 0; }
    .stage__icon { position: absolute; top: -8px; left: 0; width: 16px; height: 16px; border: 1px solid var(--success); color: var(--deep-carbon); background: var(--success); font: 900 10px/1 var(--mono); }
    .stage--warning .stage__icon { border-color: var(--warning); color: var(--warning); background: var(--panel); }
    .stage--failed .stage__icon { border-color: var(--danger); color: var(--danger); background: var(--panel); }
    .stage--muted .stage__icon { border-color: var(--rail); color: var(--mist); background: var(--panel); }
    .stage__label { display: block; font-size: 12px; }
    .stage__detail { display: block; margin-top: 5px; color: var(--mist); font-size: 11px; }
    .contradiction { border-color: rgba(240,113,120,.32); border-radius: 9px; background: rgba(240,113,120,.07); }
    .contradiction__eyebrow, .contradiction__values b { color: var(--danger); }
    .contradiction p, .proof-gaps, .proof-advisories { color: var(--mist); }
    .proof-gaps, .proof-advisories { border-color: var(--line); }
    .proof-gaps ul, .proof-advisories ul { columns: 3; }
    .empty { border-color: var(--rail); border-radius: 12px; color: var(--mist); }
    footer { border-color: var(--line); color: var(--mist); font: 500 11px/1.5 var(--mono); }
    .filter__count { margin-left: 6px; color: var(--ice); }
    .requirement h3 .source-link { color: inherit; }
    @media (max-width: 960px) {
      .proof-rail { grid-template-columns: repeat(5, 180px); overflow-x: auto; padding-top: 8px; }
      .snapshot { max-width: 100%; }
    }
    @media (max-width: 760px) {
      .shell { width: min(100% - 24px, 1180px); }
      .topbar { align-items: start; flex-wrap: wrap; gap: 12px; }
      .snapshot { max-width: 100%; text-align: left; }
      .overview { grid-template-columns: 1fr; gap: 28px; padding-top: 38px; }
      .score { min-width: 0; padding: 20px 0 0; border-top: 2px solid var(--signal); border-left: 0; text-align: left; }
      .score__value { font-size: 66px; }
      .score__note { margin-left: 0; }
      .proof-path__header { align-items: start; flex-direction: column; }
      .proof-path__header p { text-align: left; }
      .stages { grid-template-columns: 1fr; }
      .stage { min-height: 66px; margin-left: 8px; padding: 0 0 18px 30px; border-top: 0; border-left: 1px solid var(--rail); }
      .stage__icon { top: 0; left: -8px; }
      .proof-gaps ul, .proof-advisories ul { columns: 2; }
    }
    @media (max-width: 520px) {
      .brand__product { display: none; }
      .proof-path { padding-inline: 18px; }
      .proof-gaps ul, .proof-advisories ul { columns: 1; }
    }
    @media print {
      :root { color-scheme: light; }
      body { color: #17202a; background: #fff; }
      .topbar, .proof-path, .metrics, .requirement { border-color: #cbd5dc; color: #17202a; background: #fff; }
      .proof-gate, .stage { border-color: #7b8b96; background: transparent; }
      .proof-gate p, .proof-path__header p, .metric span, .stage__detail, .section-header p, footer, .score__note { color: #4e606c; }
      .source-link, .cta, .snapshot a { color: inherit; }
    }
  </style>
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
