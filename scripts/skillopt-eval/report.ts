import type { z } from "zod";
import {
  CONTRACT_SCHEMA_VERSION,
  ContractIntegrityError,
  JsonValueSchema,
  canonicalJson,
  contractHash,
  parseJsonText,
} from "./contracts/common";
import type { PriceEquivalentEstimateSchema } from "./contracts/common";
import type { SkillSchema } from "./contracts/episode";
import { ReportV1Schema } from "./contracts/workflow";
import { redactEvidence } from "./scoring/cell";

type Skill = z.infer<typeof SkillSchema>;
type PriceEquivalentEstimate = z.infer<typeof PriceEquivalentEstimateSchema>;
type ReportV1 = Readonly<z.infer<typeof ReportV1Schema>>;

// implements REQ-skillopt-codex-optimization
export type ReportGateResults = Readonly<{
  aggregate: boolean;
  bootstrap: boolean;
  family: boolean;
  security: boolean;
  bundle: boolean | null;
}>;

// implements REQ-skillopt-codex-optimization
export type BuildReportInput = Readonly<{
  runId: string;
  runLockHash: string;
  skill: Skill;
  cells: readonly unknown[];
  privateValues: readonly string[];
  priceEquivalentEstimate: PriceEquivalentEstimate;
  gateOutcome: "pass" | "fail" | "ambiguous";
  gateResults: ReportGateResults;
  generatedAt: string;
}>;

// implements REQ-skillopt-codex-optimization
export type ReportArtifacts = Readonly<{
  report: ReportV1;
  json: string;
  markdown: string;
  reportHash: string;
}>;

function verdictFor(input: BuildReportInput): ReportV1["verdict"] {
  const gatesPass =
    input.gateResults.aggregate &&
    input.gateResults.bootstrap &&
    input.gateResults.family &&
    input.gateResults.security &&
    input.gateResults.bundle !== false;
  if (input.gateOutcome === "pass" && !gatesPass) {
    throw new ContractIntegrityError(
      "passing report requires every applicable gate",
      "gateResults",
    );
  }
  if (input.gateOutcome === "ambiguous") return "no-go";
  return input.gateOutcome;
}

// implements REQ-skillopt-codex-optimization
export function renderReportMarkdown(machineJson: string): string {
  const report = ReportV1Schema.parse(parseJsonText(machineJson));
  const bundle = report.gateResults.bundle;
  return [
    `# SkillOpt report: ${report.skill}`,
    "",
    `- Run: \`${report.runId}\``,
    `- Verdict: **${report.verdict}**`,
    `- Cells: ${report.cells.length}`,
    `- Price-equivalent estimate: ${report.priceEquivalentEstimate.amount.toFixed(2)} ${report.priceEquivalentEstimate.currency}`,
    "",
    "## Gates",
    "",
    `- Aggregate: ${report.gateResults.aggregate ? "pass" : "fail"}`,
    `- Bootstrap: ${report.gateResults.bootstrap ? "pass" : "fail"}`,
    `- Family: ${report.gateResults.family ? "pass" : "fail"}`,
    `- Security: ${report.gateResults.security ? "pass" : "fail"}`,
    `- Bundle: ${bundle === null ? "not applicable" : bundle ? "pass" : "fail"}`,
    "",
  ].join("\n");
}

// implements REQ-skillopt-codex-optimization
export function buildReportArtifacts(input: BuildReportInput): ReportArtifacts {
  const cells = input.cells.map((cell) => {
    const redacted = redactEvidence(cell, input.privateValues);
    return contractHash(JsonValueSchema.parse(redacted));
  });
  const report = ReportV1Schema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    artifactType: "report",
    runId: input.runId,
    runLockHash: input.runLockHash,
    skill: input.skill,
    variants: ["baseline", "one-shot", "skillopt"],
    cells,
    priceEquivalentEstimate: input.priceEquivalentEstimate,
    verdict: verdictFor(input),
    generatedAt: input.generatedAt,
    gateResults: input.gateResults,
  });
  const jsonValue = JsonValueSchema.parse(report);
  const json = `${canonicalJson(jsonValue)}\n`;
  return {
    report,
    json,
    markdown: renderReportMarkdown(json),
    reportHash: contractHash(jsonValue),
  };
}
