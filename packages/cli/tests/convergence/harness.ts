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

/**
 * Vocabulary-convergence harness (CI-safe, offline).
 *
 * For every paraphrase group in the corpus, each variant is modeled the way
 * kb_model_requirement would: the agent's subject guess is ranked against the
 * existing vocabulary through the real vocabulary-alignment composition
 * (builtin, or an injected provider), then the resulting subject and property
 * facts are written to a real Prolog KB. Prolog computes the canonical
 * signatures and runs domain-redundancy, so the reported rates measure the
 * shipped checks rather than a TypeScript re-implementation.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  type SubjectVocabularyEntry,
  rankSubjectCandidates,
} from "kibi-plugin-builtin";
import {
  NEW_SUBJECT_CHOICE,
  type SubjectRankingDecision,
} from "kibi-plugin-sdk";
import {
  composeClaimComparison,
  composeSubjectRanking,
} from "../../src/plugins/compose-vocabulary-alignment.js";
import type { CapabilityRegistry } from "../../src/plugins/registry.js";
import { PrologProcess, resolveKbPlPath } from "../../src/prolog.js";
import { escapeAtom, toPrologAtom } from "../../src/prolog/codec.js";
import { normalizeSubjectKey } from "../../src/utils/strict-modeling.js";

export type CorpusVariant = Readonly<{
  text: string;
  subjectKey: string;
  propertyKey: string;
  operator: "eq" | "lte" | "gte" | "lt" | "gt";
  valueType: "int" | "number" | "string" | "bool";
  value: number | string | boolean;
  unit: string;
}>;

export type CorpusGroup = Readonly<{
  id: string;
  kind:
    | "unit_variant"
    | "subject_variant"
    | "restatement"
    | "property_gap"
    | "control";
  /** True when every variant states the same obligation. */
  converge: boolean;
  expectedSubjectKey: string;
  variants: readonly CorpusVariant[];
}>;

export type ConvergenceCorpus = Readonly<{
  vocabulary: readonly SubjectVocabularyEntry[];
  groups: readonly CorpusGroup[];
}>;

export type GroupOutcome = Readonly<{
  id: string;
  kind: CorpusGroup["kind"];
  converge: boolean;
  subjects: readonly string[];
  signatures: readonly string[];
  /** Every variant produced the identical canonical signature. */
  signatureConverged: boolean;
  /** domain-redundancy paired every variant with the first one. */
  redundancyDetected: boolean;
  /** compareClaims nominated every variant pair as a possible duplicate. */
  duplicateCandidate: boolean;
}>;

export type ConvergenceReport = Readonly<{
  mode: string;
  groups: readonly GroupOutcome[];
  rates: Readonly<{
    /** Equivalent groups whose variants share one signature. */
    signatureConvergence: number;
    /** Equivalent groups fully paired by domain-redundancy. */
    redundancyDetection: number;
    /** Equivalent groups (incl. property-key gaps) caught by redundancy or review candidates. */
    reviewRecall: number;
    /** Controls wrongly converged, flagged redundant, or nominated. */
    falsePositive: number;
  }>;
}>;

const OPERATION = "kb_model_requirement";

function prologString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function valueField(variant: CorpusVariant): string {
  switch (variant.valueType) {
    case "int":
      return `value_int=${Number(variant.value)}`;
    case "number":
      return `value_number=${Number(variant.value).toFixed(6)}`;
    case "bool":
      return `value_bool=${variant.value === true ? "true" : "false"}`;
    default:
      return `value_string=${prologString(String(variant.value))}`;
  }
}

function common(id: string, title: string): string {
  return [
    `id=${toPrologAtom(id)}`,
    `title=${prologString(title)}`,
    "status=active",
    `created_at=${prologString("2026-09-28T00:00:00Z")}`,
    `updated_at=${prologString("2026-09-28T00:00:00Z")}`,
    `source=${prologString("test://convergence")}`,
  ].join(", ");
}

async function must(
  prolog: PrologProcess,
  goal: string,
): Promise<Record<string, string>> {
  const result = await prolog.query(goal);
  if (!result.success) {
    throw new Error(
      `Harness Prolog goal failed: ${goal}\n${result.error ?? ""}`,
    );
  }
  return result.bindings;
}

function rate(hits: number, total: number): number {
  return total === 0 ? 1 : Math.round((hits / total) * 1000) / 1000;
}

async function resolveSubjects(
  registry: CapabilityRegistry,
  corpus: ConvergenceCorpus,
): Promise<Map<string, string>> {
  const resolution = await registry.resolveVocabularyAlignment();
  const clauses = corpus.groups.flatMap((group) =>
    group.variants.map((variant, index) => ({
      claimKey: `${group.id}#${index}`,
      text: variant.text,
      proposedSubjectKey: normalizeSubjectKey(variant.subjectKey),
      candidates: rankSubjectCandidates(variant.text, corpus.vocabulary),
    })),
  );
  const ranking = await composeSubjectRanking(
    resolution,
    { clauses },
    { operationName: OPERATION },
  );
  const byKey = new Map<string, SubjectRankingDecision>(
    ranking.results.map((decision) => [decision.claimKey, decision]),
  );
  return new Map(
    clauses.map((clause) => {
      const decision = byKey.get(clause.claimKey);
      const subject =
        decision === undefined || decision.choice === NEW_SUBJECT_CHOICE
          ? clause.proposedSubjectKey
          : decision.choice;
      return [clause.claimKey, subject];
    }),
  );
}

/** Run the corpus against a fresh temporary KB and report convergence rates. */
export async function runConvergenceHarness(options: {
  readonly corpus: ConvergenceCorpus;
  readonly registry: CapabilityRegistry;
  readonly mode: string;
}): Promise<ConvergenceReport> {
  const { corpus, registry, mode } = options;
  const subjects = await resolveSubjects(registry, corpus);
  const kbDir = mkdtempSync(path.join(tmpdir(), "kibi-convergence-"));
  const prolog = new PrologProcess({ oneShot: false, timeout: 60_000 });
  try {
    await prolog.start();
    await must(prolog, `kb_attach('${escapeAtom(kbDir)}')`);
    const qualityPath = escapeAtom(
      path.join(path.dirname(resolveKbPlPath()), "semantic_quality.pl"),
    );
    const checksPath = escapeAtom(
      path.join(path.dirname(resolveKbPlPath()), "checks.pl"),
    );
    await must(
      prolog,
      `use_module('${qualityPath}'), use_module('${checksPath}')`,
    );

    const subjectFacts = new Map<string, string>();
    const ensureSubject = async (subjectKey: string): Promise<string> => {
      const existing = subjectFacts.get(subjectKey);
      if (existing) return existing;
      const factId = `FACT-SUBJ-${subjectFacts.size + 1}`;
      await must(
        prolog,
        `kb_assert_entity(fact, [${common(factId, subjectKey)}, fact_kind=subject, subject_key=${prologString(subjectKey)}])`,
      );
      subjectFacts.set(subjectKey, factId);
      return factId;
    };

    const groupFacts = new Map<string, string[]>();
    for (const group of corpus.groups) {
      const facts: string[] = [];
      for (const [index, variant] of group.variants.entries()) {
        const claimKey = `${group.id}#${index}`;
        const subjectKey = subjects.get(claimKey) ?? variant.subjectKey;
        const subjectFact = await ensureSubject(subjectKey);
        const factId = `FACT-PROP-${group.id}-${index}`;
        const reqId = `REQ-${group.id}-${index}`;
        const unit =
          variant.unit === "" ? "" : `, unit=${prologString(variant.unit)}`;
        await must(
          prolog,
          `kb_assert_entity(fact, [${common(factId, variant.text)}, fact_kind=property_value, subject_key=${prologString(subjectKey)}, property_key=${prologString(variant.propertyKey)}, operator=${variant.operator}, value_type=${variant.valueType}, ${valueField(variant)}${unit}])`,
        );
        await must(
          prolog,
          `kb_assert_entity(req, [${common(reqId, variant.text).replace("status=active", "status=open")}])`,
        );
        await must(
          prolog,
          `kb_assert_relationship(constrains, ${toPrologAtom(reqId)}, ${toPrologAtom(subjectFact)}, []), kb_assert_relationship(requires_property, ${toPrologAtom(reqId)}, ${toPrologAtom(factId)}, [])`,
        );
        facts.push(factId);
      }
      groupFacts.set(group.id, facts);
    }

    const redundancy = await must(
      prolog,
      "checks:check_selected_json(['domain-redundancy'], Json)",
    );
    let parsed: unknown = JSON.parse(redundancy.Json ?? "{}");
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
    const witnessPairs = new Set(
      (
        (parsed as { domain_redundancy?: Array<{ entityId: string }> })
          .domain_redundancy ?? []
      ).map((violation) => violation.entityId),
    );

    const resolution = await registry.resolveVocabularyAlignment();
    const outcomes: GroupOutcome[] = [];
    for (const group of corpus.groups) {
      const facts = groupFacts.get(group.id) ?? [];
      const signatures: string[] = [];
      for (const factId of facts) {
        const bindings = await must(
          prolog,
          `semantic_quality:logical_ground_signature(${toPrologAtom(factId)}, S), term_string(S, Signature)`,
        );
        signatures.push(bindings.Signature ?? "");
      }
      const reqIds = group.variants.map(
        (_, index) => `REQ-${group.id}-${index}`,
      );
      const [first, ...rest] = reqIds;
      const redundancyDetected =
        rest.length > 0 &&
        rest.every((other) =>
          witnessPairs.has(
            first !== undefined && first < other
              ? `${first}/${other}`
              : `${other}/${first}`,
          ),
        );
      const comparison = await composeClaimComparison(
        resolution,
        {
          pairs: group.variants.slice(1).map((variant, index) => ({
            pairKey: `${group.id}#0~${index + 1}`,
            sharedKey: group.expectedSubjectKey,
            left: { claimText: group.variants[0]?.text ?? "" },
            right: { claimText: variant.text },
          })),
        },
        { operationName: OPERATION },
      );
      outcomes.push({
        id: group.id,
        kind: group.kind,
        converge: group.converge,
        subjects: group.variants.map(
          (_, index) => subjects.get(`${group.id}#${index}`) ?? "",
        ),
        signatures,
        signatureConverged: new Set(signatures).size === 1,
        redundancyDetected,
        duplicateCandidate:
          comparison.results.length > 0 &&
          comparison.results.every((judgment) => judgment.sameObligation),
      });
    }

    const equivalent = outcomes.filter((outcome) => outcome.converge);
    const reviewable = outcomes.filter(
      (outcome) => outcome.converge || outcome.kind === "property_gap",
    );
    const controls = outcomes.filter((outcome) => outcome.kind === "control");
    return {
      mode,
      groups: outcomes,
      rates: {
        signatureConvergence: rate(
          equivalent.filter((o) => o.signatureConverged).length,
          equivalent.length,
        ),
        redundancyDetection: rate(
          equivalent.filter((o) => o.redundancyDetected).length,
          equivalent.length,
        ),
        reviewRecall: rate(
          reviewable.filter((o) => o.redundancyDetected || o.duplicateCandidate)
            .length,
          reviewable.length,
        ),
        falsePositive: rate(
          controls.filter(
            (o) =>
              o.signatureConverged ||
              o.redundancyDetected ||
              o.duplicateCandidate,
          ).length,
          controls.length,
        ),
      },
    };
  } finally {
    await prolog.terminate().catch(() => undefined);
    rmSync(kbDir, { recursive: true, force: true });
  }
}

/** Plain-text table for CI logs. */
export function formatConvergenceReport(report: ConvergenceReport): string {
  const lines = [
    `convergence harness (${report.mode})`,
    `  signature convergence: ${report.rates.signatureConvergence}`,
    `  redundancy detection:  ${report.rates.redundancyDetection}`,
    `  review recall:         ${report.rates.reviewRecall}`,
    `  false positives:       ${report.rates.falsePositive}`,
  ];
  for (const group of report.groups) {
    lines.push(
      `  - ${group.id} [${group.kind}] converged=${group.signatureConverged} redundancy=${group.redundancyDetected} candidate=${group.duplicateCandidate} subjects=${group.subjects.join(",")}`,
    );
  }
  return lines.join("\n");
}
