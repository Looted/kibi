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

import type { KibiImpactDiagnostic } from "./staged-diagnostics.js";
import { mintSymbolId } from "./symbol-id.js";
import type { Violation as TraceabilityViolation } from "./validate.js";

/**
 * One declaration the commit adds or changes that nothing owns, with every
 * staged finding it caused merged into one: the missing symbol record
 * (`symbols_manifest_stale`), the missing impact evidence
 * (`kibi_impact_evidence_missing`), the semantic review warning
 * (`symbol_semantic_review_needed`) and the requirement link the
 * traceability rule counts (`symbol-traceability`).
 */
export interface OwnerFinding {
  readonly blocks: "commit";
  readonly symbol: string;
  readonly file: string;
  readonly line: number;
  /** `new`: no symbol record; `unlinked`: a record without a requirement. */
  readonly state: "new" | "unlinked";
  /** A type, interface or enum needs a record, not a requirement link. */
  readonly typeShape: boolean;
  /** The finding ids this one stands for, as the JSON lists them. */
  readonly causes: readonly string[];
  /**
   * Requirements other code in the file implements, in id order, each with
   * the tests that cover that code (the payload's coveredBy).
   */
  readonly candidates: ReadonlyArray<{
    id: string;
    title: string;
    status: string;
    tests: readonly string[];
  }>;
  /** kb_upsert inputs, one per candidate shown (or the type's record). */
  readonly payloads: ReadonlyArray<Record<string, unknown>>;
}

/** Candidates that get their own paste-ready payload; the rest are named. */
export const OWNER_PAYLOADS_SHOWN = 3;

export const CLI_UPSERT_COMMAND = "npx --no-install kibi upsert --input -";

/** A changed declaration as the staged extractor gives it. */
export type OwnerFindingSymbol = Readonly<{
  name: string;
  location: Readonly<{ file: string; startLine: number }>;
  /** The extractor's role: anything but behavioral is a type-like shape. */
  role: string;
  callable?: boolean;
}>;

const key = (file: string, name: string) => `${file}\0${name}`;

type ManifestEvidence = ReadonlyArray<{
  path: string;
  missing: ReadonlyArray<{ title: string; line: number }>;
  extra: readonly string[];
}>;

type UncoveredEvidence = ReadonlyArray<{
  path: string;
  titles: readonly string[];
}>;

/** The file and symbol a semantic review warning names, as a key. */
function reviewedSymbol(diagnostic: KibiImpactDiagnostic): string | undefined {
  if (diagnostic.id !== "symbol_semantic_review_needed") return undefined;
  const symbol = evidenceOf<unknown>(diagnostic, "symbol");
  const file = diagnostic.files[0];
  return typeof symbol === "string" && file !== undefined
    ? key(file, symbol)
    : undefined;
}

function evidenceOf<T>(diagnostic: KibiImpactDiagnostic, field: string): T {
  const evidence = diagnostic.evidence as Record<string, unknown> | undefined;
  return (evidence?.[field] ?? []) as T;
}

type KnowledgeRow = Readonly<{
  entity: Readonly<{ id: string; type?: unknown }>;
  sourceFile?: string;
  relationships: ReadonlyArray<
    Readonly<{ type: string; from: string; to: string }>
  >;
}>;

/**
 * The tests that cover a file's code implementing a requirement: the
 * covered_by targets of the file's symbols that implement it.
 */
export function coveringTests(
  knowledge: readonly KnowledgeRow[],
  file: string,
  requirementId: string,
): string[] {
  const tests = new Set<string>();
  for (const row of knowledge) {
    if (row.sourceFile !== file) continue;
    const links = row.relationships;
    if (
      !links.some(
        (link) => link.type === "implements" && link.to === requirementId,
      )
    )
      continue;
    for (const link of links)
      if (link.type === "covered_by") tests.add(link.to);
  }
  return [...tests].sort();
}

/**
 * The owner findings of a staged check: each changed declaration the
 * traceability rule finds unlinked, and each one the manifest has no record
 * for, once, with the requirements the rest of its file implements as
 * candidates. Kibi never picks one: each candidate gets its own payload.
 */
export function collectOwnerFindings(input: {
  traceability: readonly TraceabilityViolation[];
  diagnostics: readonly KibiImpactDiagnostic[];
  symbols: readonly OwnerFindingSymbol[];
  candidatesByFile: ReadonlyMap<string, readonly string[]>;
  readRequirement: (
    id: string,
  ) => Readonly<{ title?: unknown; status?: unknown }> | undefined;
  /** The tests covering the file's code that implements a requirement. */
  testsFor?: (file: string, requirementId: string) => readonly string[];
  /** Every entity id the KB holds, so a type's new record never reuses one. */
  takenIds?: Iterable<string>;
  /**
   * Records already written for a declaration but not staged: offered again
   * under their own id, so applying the offer updates them.
   */
  writtenRecords?: Iterable<{ id: string; file: string; name: string }>;
}): OwnerFinding[] {
  const taken = new Set(input.takenIds ?? []);
  const written = new Map(
    [...(input.writtenRecords ?? [])].map((record) => [
      key(record.file, record.name),
      record.id,
    ]),
  );
  const symbols = new Map(
    input.symbols.map((symbol) => [
      key(symbol.location.file, symbol.name),
      symbol,
    ]),
  );
  const manifestMissing = new Map<string, number>();
  const evidenceMissing = new Set<string>();
  const reviewNeeded = new Set<string>();
  for (const diagnostic of input.diagnostics) {
    if (diagnostic.id === "symbols_manifest_stale") {
      for (const file of evidenceOf<ManifestEvidence>(
        diagnostic,
        "symbolsManifest",
      ))
        for (const entry of file.missing)
          manifestMissing.set(key(file.path, entry.title), entry.line);
    } else if (diagnostic.id === "kibi_impact_evidence_missing") {
      for (const file of evidenceOf<UncoveredEvidence>(
        diagnostic,
        "uncoveredSymbols",
      ))
        for (const title of file.titles)
          evidenceMissing.add(key(file.path, title));
    } else {
      const reviewed = reviewedSymbol(diagnostic);
      // rationale: an undefined entry never matches a key, which always
      // holds a NUL; the guard only keeps the set's type to strings.
      // Stryker disable next-line ConditionalExpression
      if (reviewed !== undefined) reviewNeeded.add(reviewed);
    }
  }
  const unlinked = new Map(
    input.traceability.map((violation) => [
      key(violation.file, violation.name),
      violation,
    ]),
  );
  const keys = [...new Set([...unlinked.keys(), ...manifestMissing.keys()])];
  const findings: OwnerFinding[] = [];
  for (const id of keys) {
    const [file, name] = id.split("\0") as [string, string];
    const symbol = symbols.get(id);
    const typeShape =
      symbol !== undefined &&
      symbol.role !== "behavioral" &&
      symbol.callable !== true;
    // A type the traceability rule passes needs only its record.
    const line =
      unlinked.get(id)?.line ??
      manifestMissing.get(id) ??
      symbol?.location.startLine ??
      0;
    const state = manifestMissing.has(id) ? "new" : "unlinked";
    const causes = [
      ...(manifestMissing.has(id) ? ["symbols_manifest_stale"] : []),
      ...(evidenceMissing.has(id) ? ["kibi_impact_evidence_missing"] : []),
      ...(reviewNeeded.has(id) ? ["symbol_semantic_review_needed"] : []),
      ...(unlinked.has(id) ? ["symbol-traceability"] : []),
    ];
    const candidates = typeShape
      ? []
      : [...(input.candidatesByFile.get(file) ?? [])].sort().map((req) => {
          const requirement = input.readRequirement(req);
          return {
            id: req,
            title:
              typeof requirement?.title === "string" ? requirement.title : req,
            status:
              typeof requirement?.status === "string"
                ? requirement.status
                : "open",
            tests: [...(input.testsFor?.(file, req) ?? [])].sort(),
          };
        });
    const payloads: Record<string, unknown>[] = typeShape
      ? [
          {
            type: "symbol",
            id: written.get(id) ?? mintSymbolId(file, name, taken),
            properties: {
              title: name,
              status: "active",
              sourceFile: file,
              symbol_role: "type-shape",
            },
          },
        ]
      : candidates.slice(0, OWNER_PAYLOADS_SHOWN).map((candidate) => ({
          type: "req",
          id: candidate.id,
          properties: { title: candidate.title, status: candidate.status },
          implementedBy: [
            {
              sourceFile: file,
              symbol: name,
              ...(candidate.tests.length > 0
                ? { coveredBy: candidate.tests }
                : {}),
            },
          ],
        }));
    findings.push({
      blocks: "commit",
      symbol: name,
      file,
      line,
      state,
      typeShape,
      causes,
      candidates,
      payloads,
    });
  }
  const order = (finding: OwnerFinding) =>
    key(finding.file, String(finding.line).padStart(8, "0"));
  return findings.sort((left, right) =>
    order(left).localeCompare(order(right)),
  );
}

/**
 * The staged findings left once the owner findings stand for their causes:
 * a manifest or impact-evidence finding goes when every declaration it
 * names has an owner finding, a semantic review warning goes with its
 * symbol, and the traceability rows of those symbols go.
 */
export function withoutOwnedCauses(
  findings: readonly OwnerFinding[],
  diagnostics: readonly KibiImpactDiagnostic[],
  traceability: readonly TraceabilityViolation[],
): {
  diagnostics: KibiImpactDiagnostic[];
  traceability: TraceabilityViolation[];
} {
  const owned = new Set(findings.map((f) => key(f.file, f.symbol)));
  const keep = (diagnostic: KibiImpactDiagnostic): boolean => {
    if (diagnostic.id === "symbols_manifest_stale") {
      const files = evidenceOf<ManifestEvidence>(diagnostic, "symbolsManifest");
      return (
        files.length === 0 ||
        files.some(
          (file) =>
            file.extra.length > 0 ||
            file.missing.some(
              (entry) => !owned.has(key(file.path, entry.title)),
            ),
        )
      );
    }
    if (diagnostic.id === "kibi_impact_evidence_missing") {
      const files = evidenceOf<UncoveredEvidence>(
        diagnostic,
        "uncoveredSymbols",
      );
      const detailed = new Set(
        files.filter((file) => file.titles.length > 0).map((file) => file.path),
      );
      return (
        diagnostic.files.some((file) => !detailed.has(file)) ||
        files.some((file) =>
          file.titles.some((title) => !owned.has(key(file.path, title))),
        )
      );
    }
    const reviewed = reviewedSymbol(diagnostic);
    // rationale: owned holds only keys, so it never has undefined; the
    // first test only keeps the lookup's type to strings.
    // Stryker disable next-line ConditionalExpression
    return reviewed === undefined || !owned.has(reviewed);
  };
  return {
    diagnostics: diagnostics.filter(keep),
    traceability: traceability.filter(
      (violation) => !owned.has(key(violation.file, violation.name)),
    ),
  };
}

/**
 * One block per owner finding, tagged as blocking the commit: the
 * candidate requirements with a paste-ready kb_upsert input each, the CLI
 * form, the path for new behavior, and the commit to retry.
 */
export function formatOwnerFindings(findings: readonly OwnerFinding[]): string {
  if (findings.length === 0) return "";
  const blocks = findings.map((finding) => {
    const at = `${finding.symbol} (${finding.file}:${finding.line})`;
    if (finding.typeShape)
      return [
        `[BLOCKS COMMIT] ${at} is new and has no symbol record. A type, interface, enum or constant needs a record with symbol_role type-shape, not a requirement link:`,
        `  kb_upsert ${JSON.stringify(finding.payloads[0])}`,
      ].join("\n");
    const lines = [
      `[BLOCKS COMMIT] ${at} ${finding.state === "new" ? "is new and no requirement owns it" : "has a symbol record but no requirement owns it"}.`,
    ];
    if (finding.candidates.length > 0) {
      const named = finding.candidates.slice(OWNER_PAYLOADS_SHOWN);
      lines.push(
        "  If one of these already states what it does, link it to that one (never pick one only to pass the gate):",
      );
      finding.payloads.forEach((payload, index) => {
        const candidate = finding.candidates[index] as { title: string };
        lines.push(
          `    ${payload.id as string}: ${candidate.title}`,
          `      kb_upsert ${JSON.stringify(payload)}`,
        );
      });
      if (named.length > 0)
        lines.push(
          `    Also linked from this file: ${named.map((candidate) => candidate.id).join(", ")} (same input with its id, title and status)`,
        );
    } else {
      lines.push("  No requirement owns other code in this file.");
    }
    lines.push(
      "  If it is new behavior, record a requirement for it first (template: kb_skills kibi-commit-review), then link it the same way.",
    );
    return lines.join("\n");
  });
  return [
    ...blocks,
    `CLI: pipe a kb_upsert input to ${CLI_UPSERT_COMMAND}. Then: git add .kb && git commit`,
  ].join("\n\n");
}
