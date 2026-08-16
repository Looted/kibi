type UnknownRecord = Readonly<Record<string, unknown>>;

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
}>;

type StageState = "passed" | "warning" | "failed" | "muted";

type ReportStage = Readonly<{
  label: string;
  detail: string;
  state: StageState;
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

function formatAge(ageSeconds: number): string {
  if (ageSeconds < 60) return "just now";
  if (ageSeconds < 3_600) {
    const minutes = Math.round(ageSeconds / 60);
    return `${minutes} min ago`;
  }
  if (ageSeconds < 86_400) {
    const hours = Math.round(ageSeconds / 3_600);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }
  const days = Math.round(ageSeconds / 86_400);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

function evidenceStage(passingE2e: UnknownRecord): ReportStage {
  const evidence = records(passingE2e.receiptEvidence);
  const passed = evidence.find((item) => item.state === "passed");
  if (passed) {
    const ageSeconds = Number(passed.ageSeconds);
    return {
      label: "Evidence",
      detail: Number.isFinite(ageSeconds)
        ? `Fresh ${formatAge(Math.max(0, ageSeconds))}`
        : "Fresh receipt",
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
      detail: `${humanize(evidenceState)} E2E receipt`,
      state: "failed",
    };
  }
  return {
    label: "Evidence",
    detail: "No fresh passing E2E receipt",
    state: "failed",
  };
}

function requirementStages(row: UnknownRecord): readonly ReportStage[] {
  const stages = record(row.proofStages);
  const semanticInventory = stageStatus(stages.semanticInventory);
  const logicGrounding = stageStatus(stages.logicGrounding);
  const scenarios = stageStatus(stages.scenarios);
  const productionSymbols = record(stages.productionSymbols);
  const sourceCoordinates = record(stages.sourceCoordinates);
  const passingE2e = record(stages.passingE2e);
  const implementationSymbols = strings(productionSymbols.symbols);
  const missingCoordinates = strings(sourceCoordinates.missingSymbols);
  const receiptEvidence = records(passingE2e.receiptEvidence);
  const scopes = new Set([
    ...strings(row.verificationScopes),
    ...receiptEvidence.map((item) => text(item.scope)).filter(Boolean),
  ]);

  let implementationState: StageState = "failed";
  let implementationDetail = "No production symbol ownership";
  if (implementationSymbols.length > 0 && missingCoordinates.length === 0) {
    implementationState = "passed";
    implementationDetail = `${implementationSymbols.length} owned ${implementationSymbols.length === 1 ? "symbol" : "symbols"}`;
  } else if (implementationSymbols.length > 0) {
    implementationState = "warning";
    implementationDetail = `${missingCoordinates.length} ${missingCoordinates.length === 1 ? "symbol needs" : "symbols need"} current coordinates`;
  }

  return [
    {
      label: "Semantic model",
      detail:
        semanticInventory === "passed" && logicGrounding === "passed"
          ? "Complete and grounded"
          : "Incomplete proposition grounding",
      state: combinedStageState(semanticInventory, logicGrounding),
    },
    {
      label: "Scenario",
      detail:
        scenarios === "passed"
          ? `${strings(record(stages.scenarios).scenarios).length} specified`
          : "Missing requirement scenario",
      state: combinedStageState(scenarios),
    },
    {
      label: "Implementation",
      detail: implementationDetail,
      state: implementationState,
    },
    {
      label: "E2E test",
      detail: scopes.has("end_to_end")
        ? "Scenario-backed end-to-end test"
        : "No scenario-backed end-to-end test",
      state: scopes.has("end_to_end") ? "passed" : "failed",
    },
    evidenceStage(passingE2e),
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
    <span class="stage__detail">${escapeHtml(stage.detail)}</span>
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

function renderRequirement(row: UnknownRecord): string {
  const id = text(row.id, "REQ-UNKNOWN");
  const title = text(row.title, "Untitled requirement");
  const proofStatus = text(row.proofStatus, "missing");
  const proofGaps = strings(row.proofGaps);
  const conflicts = records(
    record(record(row.proofStages).contradictions).conflicts,
  ).filter((conflict) => text(conflict.status) === "contradiction");
  const stages = requirementStages(row);
  const badgeLabel = proofStatus === "proven" ? "Proven" : "Needs attention";

  return `<article class="requirement requirement--${escapeHtml(proofStatus)}" data-state="${rowStates(row)}">
    <header class="requirement__header">
      <div>
        <div class="requirement__id">${escapeHtml(id)}</div>
        <h3>${escapeHtml(title)}</h3>
      </div>
      <span class="proof-badge proof-badge--${escapeHtml(proofStatus)}">${escapeHtml(badgeLabel)}</span>
    </header>
    <ul class="stages">${stages.map(renderStage).join("")}</ul>
    ${conflicts.map(renderContradiction).join("")}
    ${
      proofGaps.length > 0
        ? `<details class="proof-gaps"><summary>${proofGaps.length} proof ${proofGaps.length === 1 ? "gap" : "gaps"}</summary><ul>${proofGaps.map((gap) => `<li>${escapeHtml(humanize(gap))}</li>`).join("")}</ul></details>`
        : ""
    }
  </article>`;
}

function metric(label: string, value: number, tone = ""): string {
  return `<div class="metric${tone ? ` metric--${tone}` : ""}"><span>${escapeHtml(label)}</span><strong>${value.toLocaleString("en-US")}</strong></div>`;
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
  const contradictions = contradictionRows(currentRows);
  const unownedCode = Math.max(
    0,
    count(symbolSummary.uncovered) - count(symbolSummary.mixedRole),
  );
  const generatedAt = input.generatedAt.toISOString();
  const snapshot = text(input.requirements.meta?.verificationSnapshot);
  const branch = text(input.branch, "unknown");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark light">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'">
  <title>Kibi Requirement Health · ${escapeHtml(branch)}</title>
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
    .metrics { display: grid; grid-template-columns: repeat(6, 1fr); overflow: hidden; margin: 0 0 62px; border: 1px solid var(--line); border-radius: 20px; background: rgba(18,25,42,.74); box-shadow: var(--shadow); }
    .metric { min-width: 0; padding: 22px 20px; border-right: 1px solid var(--line); }
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
    .proof-gaps summary { padding-top: 14px; cursor: pointer; font-weight: 700; }
    .proof-gaps ul { columns: 2; margin: 11px 0 0; padding-left: 18px; }
    .proof-gaps li { margin-bottom: 7px; break-inside: avoid; }
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
      .snapshot { display: none; }
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
  </style>
</head>
<body>
  <div class="shell">
    <header class="topbar">
      <div class="brand"><span class="brand__mark">K</span><span>KIBI</span></div>
      <div class="snapshot">${snapshot ? `snapshot ${escapeHtml(snapshot.slice(0, 12))}` : "snapshot unavailable"}</div>
    </header>
    <main>
      <section class="hero">
        <div class="hero__copy">
          <p class="eyebrow">Requirement health · ${escapeHtml(branch)}</p>
          <h1>Intent, remembered.<span>Implementation, proven.</span></h1>
          <p class="hero__lede">A conservative view of product intent, semantic consistency, implementation ownership, and fresh end-to-end evidence.</p>
        </div>
        <div class="score-card">
          <div>
            <div class="score-ring" style="--score: ${proofPercent}%"><div class="score-ring__value">${proofPercent}<span>%</span></div></div>
            <p>${currentRequirements === 0 ? "No current requirements" : "Fully proven"}</p>
          </div>
        </div>
      </section>
      ${reportNotice(input)}
      <section class="metrics" aria-label="Requirement health summary">
        ${metric("Requirements", currentRequirements)}
        ${metric("Fully proven", proven, "good")}
        ${metric("Missing scenarios", missingScenarios, missingScenarios ? "warn" : "")}
        ${metric("Stale E2E evidence", staleEvidence, staleEvidence ? "warn" : "")}
        ${metric("Contradictions", contradictions.length, contradictions.length ? "bad" : "")}
        ${metric("Unowned code", unownedCode, unownedCode ? "bad" : "")}
      </section>
      <section>
        <div class="section-header">
          <div><p class="eyebrow">Proof ledger</p><h2>Requirements</h2></div>
          <p>Each row shows independent proof stages. Missing knowledge remains visible instead of being inferred as success.</p>
        </div>
        <div class="controls">
          <input class="search" id="search" type="search" placeholder="Search requirements" aria-label="Search requirements">
          <div class="filters" role="group" aria-label="Filter requirements">
            <button class="filter" type="button" data-filter="all" aria-pressed="true">All</button>
            <button class="filter" type="button" data-filter="proven" aria-pressed="false">Proven</button>
            <button class="filter" type="button" data-filter="attention" aria-pressed="false">Needs attention</button>
            <button class="filter" type="button" data-filter="stale" aria-pressed="false">Stale evidence</button>
            <button class="filter" type="button" data-filter="contradiction" aria-pressed="false">Contradictions</button>
          </div>
        </div>
        <div class="requirements" id="requirements">${currentRows.map(renderRequirement).join("")}</div>
        <div class="empty" id="empty">No requirements match this view.</div>
      </section>
    </main>
    <footer>
      <span>Generated ${escapeHtml(generatedAt)} · ${notApplicable.toLocaleString("en-US")} non-current ${notApplicable === 1 ? "requirement" : "requirements"} excluded</span>
      <span>Kibi · Prompt the intent. Prove the implementation.</span>
    </footer>
  </div>
  <script>
    (() => {
      const search = document.querySelector("#search");
      const cards = [...document.querySelectorAll(".requirement")];
      const filters = [...document.querySelectorAll(".filter")];
      const empty = document.querySelector("#empty");
      let activeFilter = "all";
      const apply = () => {
        const query = search.value.trim().toLocaleLowerCase();
        let visible = 0;
        for (const card of cards) {
          const states = (card.dataset.state || "").split(" ");
          const matchesState = activeFilter === "all" || states.includes(activeFilter);
          const matchesQuery = !query || card.textContent.toLocaleLowerCase().includes(query);
          card.hidden = !(matchesState && matchesQuery);
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
    })();
  </script>
</body>
</html>`;
}
