/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { escapeAtom } from "../prolog/codec.js";
import { runOperationJsonQuery } from "../public/operations/prolog-json.js";
import type { OperationContext } from "../public/operations/runtime-types.js";
import { createCliRuntime } from "../runtime/cli-runtime.js";

type TheoremReport = Readonly<{
  theorem: string;
  verdict: "proved" | "disproved" | "unresolved";
  groups?: number;
  models?: number;
  contradictions?: readonly unknown[];
  unresolved?: readonly unknown[];
  predicates?: number;
  edges?: number;
}>;

type RejectedCertificate = Readonly<{
  certificate: number;
  kind: string;
  reason: string;
  group?: unknown;
}>;

// implements REQ-kibi-kb-certificates
export type VerificationReport = Readonly<{
  version: string;
  status: "verified" | "rejected";
  certificates: number;
  verified: number;
  rejected: readonly RejectedCertificate[];
  theorems: readonly TheoremReport[];
  notCovered: readonly string[];
}>;

const THEOREM_LABELS: Record<string, string> = {
  properties_consistent: "Property facts are consistent",
  predicates_consistent: "Predicate facts are consistent",
  decisions_consistent: "Allow/deny decisions are consistent",
  rules_stratified: "Stored rules are stratified",
};

const NOT_COVERED_LABELS: Record<string, string> = {
  rule_conflicts: "opposing rule pairs (kibi check domain-contradictions)",
  scenario_feasibility:
    "scenario feasibility (kibi check scenario-feasibility)",
};

function assertReadableBundle(filePath: string): void {
  if (!existsSync(filePath)) {
    throw new Error(`check: no certificate bundle at ${filePath}`);
  }
  try {
    JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    throw new Error(`check: ${filePath} is not valid JSON`);
  }
}

function prologPath(filePath: string): string {
  return escapeAtom(path.resolve(filePath).replaceAll("\\", "/"));
}

// implements REQ-kibi-kb-certificates
/**
 * The exit code for re-checking a saved bundle: 0 only when every certificate
 * re-verifies and no theorem is disproved. An unresolved theorem does not
 * fail the run; it is reported and never counts as proved.
 */
export function certificatesExitCode(report: VerificationReport): 0 | 1 {
  if (report.status !== "verified") return 1;
  return report.theorems.some((theorem) => theorem.verdict === "disproved")
    ? 1
    : 0;
}

function describeGroup(entry: unknown): string {
  if (entry === null || typeof entry !== "object") return String(entry);
  const record = entry as Record<string, unknown>;
  if (typeof record.subjectKey === "string") {
    const scope =
      typeof record.scope === "string" && record.scope !== ""
        ? ` (scope ${record.scope})`
        : "";
    const reason =
      typeof record.reason === "string" ? `: ${record.reason}` : "";
    return `${record.subjectKey}.${String(record.propertyKey)}${scope}${reason}`;
  }
  if (typeof record.name === "string") {
    const args = Array.isArray(record.args)
      ? record.args
      : Array.isArray(record.key)
        ? record.key
        : [];
    const reason =
      typeof record.reason === "string" ? `: ${record.reason}` : "";
    return `${String(record.namespace)}:${record.name}(${args.join(", ")})${reason}`;
  }
  return JSON.stringify(entry);
}

// implements REQ-kibi-kb-certificates
export function renderVerification(report: VerificationReport): string {
  const lines: string[] = [];
  lines.push(
    report.status === "verified"
      ? `Kibi certificates: all ${report.certificates} re-verified`
      : `Kibi certificates: ${report.rejected.length} problem(s); ${report.verified} of ${report.certificates} certificates re-verified`,
  );
  lines.push("");
  for (const theorem of report.theorems) {
    const label = THEOREM_LABELS[theorem.theorem] ?? theorem.theorem;
    const detail =
      theorem.theorem === "rules_stratified"
        ? `${theorem.predicates ?? 0} predicates, ${theorem.edges ?? 0} dependencies`
        : (theorem.groups ?? 0) === 0
          ? "no facts of this kind"
          : `${theorem.models ?? 0} of ${theorem.groups ?? 0} groups have a model`;
    lines.push(`- ${label}: ${theorem.verdict} (${detail})`);
    for (const contradiction of theorem.contradictions ?? []) {
      lines.push(`    contradiction: ${describeGroup(contradiction)}`);
    }
    for (const unresolved of theorem.unresolved ?? []) {
      lines.push(`    unresolved: ${describeGroup(unresolved)}`);
    }
  }
  if (report.rejected.length > 0) {
    lines.push("");
    lines.push("Rejected:");
    for (const rejected of report.rejected) {
      const where =
        rejected.certificate > 0
          ? `certificate ${rejected.certificate} (${rejected.kind})`
          : describeGroup(rejected.group ?? rejected.kind);
      lines.push(`- ${where}: ${rejected.reason}`);
    }
  }
  if (report.notCovered.length > 0) {
    lines.push("");
    lines.push(
      `Not certified yet: ${report.notCovered
        .map((name) => NOT_COVERED_LABELS[name] ?? name)
        .join("; ")}`,
    );
  }
  return `${lines.join("\n")}\n`;
}

async function withEngine<T>(
  run: (context: OperationContext) => Promise<T>,
): Promise<T> {
  const runtime = createCliRuntime();
  const context = await runtime.open(
    {
      name: "kibi_check_certificates" as never,
      effects: [] as never,
      requiresProlog: true,
      execute: async () => undefined,
    },
    {},
  );
  let completed = false;
  try {
    const result = await run(context);
    completed = true;
    return result;
  } finally {
    await runtime.close(
      context,
      completed
        ? { status: "success", result: 0 }
        : { status: "error", error: 1 },
    );
  }
}

function prologOf(context: OperationContext) {
  if (context.prolog === undefined) {
    throw new Error("check: the Kibi engine is not available");
  }
  return context.prolog;
}

// implements REQ-kibi-kb-certificates
/** Re-check a saved kibi.certificates.v1 bundle against the current KB. */
export async function recheckCertificates(
  bundlePath: string,
  context: OperationContext,
): Promise<VerificationReport> {
  assertReadableBundle(bundlePath);
  return await runOperationJsonQuery<VerificationReport>(
    prologOf(context),
    "certificate_check.pl",
    `certificate_check:kb_verify_certificates_file('${prologPath(bundlePath)}', JsonString)`,
    "Certificate verification",
  );
}

// implements REQ-kibi-kb-certificates
/** `kibi check --certificates <file>`: print the re-check report. */
export async function checkCertificatesCommand(options: {
  certificates: string;
  json?: boolean;
}): Promise<{ exitCode: number }> {
  const report = await withEngine((context) =>
    recheckCertificates(options.certificates, context),
  );
  process.stdout.write(
    options.json
      ? `${JSON.stringify(report, null, 2)}\n`
      : renderVerification(report),
  );
  return { exitCode: certificatesExitCode(report) };
}

// implements REQ-kibi-kb-certificates
/**
 * `kibi check --write-certificates <file>`: save the bundle the
 * kb-consistency rule re-checked, so another checker can re-check it.
 */
export async function writeCertificates(bundlePath: string): Promise<{
  path: string;
  certificates: number;
}> {
  const target = path.resolve(bundlePath);
  return await withEngine((context) =>
    runOperationJsonQuery<{ path: string; certificates: number }>(
      prologOf(context),
      "certificates.pl",
      `certificates:kb_write_certificates('${prologPath(target)}', JsonString)`,
      "Certificate generation",
    ),
  );
}
