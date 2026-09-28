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

import path from "node:path";
import {
  type SubjectVocabularyEntry,
  rankSubjectCandidates,
} from "kibi-plugin-builtin";
import {
  type ClaimComparisonPair,
  NEW_SUBJECT_CHOICE,
  type SubjectCandidate,
} from "kibi-plugin-sdk";
import { publicCapabilityStamp } from "../../plugins/compose-semantic-classifier.js";
import {
  type VocabularyAlignmentDiagnostic,
  composeClaimComparison,
  composeSubjectRanking,
} from "../../plugins/compose-vocabulary-alignment.js";
import {
  type CapabilityRegistry,
  createCapabilityRegistry,
} from "../../plugins/registry.js";
import { resolveKbPlPath } from "../../prolog.js";
import { escapeAtom, toPrologAtom } from "../../prolog/codec.js";
import type {
  OperationContext,
  PrologPort,
} from "../../public/operations/runtime-types.js";

/** Operation name used for the external-provider allowlist. */
const OPERATION_NAME = "kb_model_requirement";

// implements REQ-kibi-subject-vocabulary
export type SubjectResolution = Readonly<{
  /** reuse_existing: the plan links the existing subject fact. */
  decision: "reuse_existing" | "declare_new";
  subjectKey: string;
  /** Existing subject fact linked via constrains when reusing. */
  existingFactId: string | null;
  confidence: number;
  candidates: readonly SubjectCandidate[];
}>;

// implements REQ-kibi-subject-vocabulary
export type RedundancyCandidate = Readonly<{
  factId: string;
  subjectKey: string;
  requirementIds: readonly string[];
  claimText: string;
  signature: string;
  confidence: number;
}>;

// implements REQ-kibi-subject-vocabulary
export type VocabularyAlignmentOutcome = Readonly<{
  subject: SubjectResolution;
  redundancyCandidates: readonly RedundancyCandidate[];
  stamps: readonly ReturnType<typeof publicCapabilityStamp>[];
  fallbackUsed: boolean;
  diagnostics: readonly VocabularyAlignmentDiagnostic[];
}>;

type SubjectClaim = Readonly<{
  factId: string;
  subjectKey: string;
  signature: string;
  claimText?: string;
  title?: string;
  requirements?: readonly string[];
}>;

type VocabularyEntryWithFact = SubjectVocabularyEntry & {
  factId: string;
  /** Rejected by subject-key-identity; never proposed for reuse. */
  reqDerived?: boolean;
};

function semanticQualityModulePath(): string {
  return path.join(path.dirname(resolveKbPlPath()), "semantic_quality.pl");
}

function parseJsonBinding(raw: string | undefined): unknown {
  if (raw === undefined || raw === "") return [];
  let parsed: unknown = JSON.parse(raw);
  if (typeof parsed === "string") parsed = JSON.parse(parsed);
  return parsed;
}

async function queryJson(prolog: PrologPort, goal: string): Promise<unknown> {
  const modulePath = escapeAtom(semanticQualityModulePath());
  // call/1 defers module resolution until use_module has loaded the module;
  // a literal qualified goal is checked when the query is read.
  const result = await prolog.query(
    `(use_module('${modulePath}'), call(${goal}))`,
  );
  if (!result.success) {
    throw new Error(
      `Vocabulary query failed: ${result.error ?? "unknown error"}`,
    );
  }
  return parseJsonBinding(result.bindings.Json);
}

// implements REQ-kibi-subject-vocabulary
export async function readSubjectVocabulary(
  prolog: PrologPort,
): Promise<VocabularyEntryWithFact[]> {
  const parsed = await queryJson(
    prolog,
    "semantic_quality:subject_vocabulary_json(Json)",
  );
  return Array.isArray(parsed) ? (parsed as VocabularyEntryWithFact[]) : [];
}

// implements REQ-kibi-subject-vocabulary
export async function readSubjectClaims(
  prolog: PrologPort,
  subjectKeys: readonly string[],
): Promise<SubjectClaim[]> {
  if (subjectKeys.length === 0) return [];
  const list = subjectKeys.map((key) => toPrologAtom(key)).join(",");
  const parsed = await queryJson(
    prolog,
    `semantic_quality:subject_claims_json([${list}], Json)`,
  );
  return Array.isArray(parsed) ? (parsed as SubjectClaim[]) : [];
}

async function resolveRegistry(
  context: OperationContext,
): Promise<CapabilityRegistry> {
  if (context.ensurePlugins) return context.ensurePlugins();
  // Hosts without a plugin runtime get the builtin provider only.
  return createCapabilityRegistry({
    workspaceRoot: context.workspaceRoot,
    projectConfig: {},
  });
}

/**
 * Rank existing subjects for one modeled clause and look for possible
 * paraphrase duplicates among claims already on the chosen subject.
 *
 * The builtin ranker always runs; a configured kibi.vocabulary-alignment.v1
 * provider may refine the choice (replace / augment / shadow). The outcome is
 * modeling advice: exact duplicate detection stays with the deterministic
 * Prolog `domain-redundancy` check.
 */
// implements REQ-kibi-subject-vocabulary, REQ-kibi-vocabulary-alignment-capability
export async function alignRequirementVocabulary(
  context: OperationContext,
  clause: Readonly<{
    claimKey: string;
    statement: string;
    proposedSubjectKey: string;
  }>,
): Promise<VocabularyAlignmentOutcome | null> {
  const prolog = context.prolog;
  if (prolog === undefined) return null;

  const vocabulary = (await readSubjectVocabulary(prolog)).filter(
    (entry) => entry.reqDerived !== true,
  );
  const candidates = rankSubjectCandidates(clause.statement, vocabulary);
  const registry = await resolveRegistry(context);
  const resolution = await registry.resolveVocabularyAlignment();

  const ranking = await composeSubjectRanking(
    resolution,
    {
      clauses: [
        {
          claimKey: clause.claimKey,
          text: clause.statement,
          proposedSubjectKey: clause.proposedSubjectKey,
          candidates,
        },
      ],
    },
    { operationName: OPERATION_NAME },
  );
  const decision = ranking.results[0];
  const chosen =
    decision !== undefined && decision.choice !== NEW_SUBJECT_CHOICE
      ? vocabulary.find((entry) => entry.subjectKey === decision.choice)
      : undefined;
  const subject: SubjectResolution = chosen
    ? {
        decision: "reuse_existing",
        subjectKey: chosen.subjectKey,
        existingFactId: chosen.factId,
        confidence: decision?.confidence ?? 0,
        candidates,
      }
    : {
        decision: "declare_new",
        subjectKey: clause.proposedSubjectKey,
        existingFactId: null,
        confidence: decision?.confidence ?? 1,
        candidates,
      };

  let redundancyCandidates: RedundancyCandidate[] = [];
  let comparison: Awaited<ReturnType<typeof composeClaimComparison>> | null =
    null;
  if (subject.decision === "reuse_existing") {
    const claims = await readSubjectClaims(prolog, [subject.subjectKey]);
    const pairs: ClaimComparisonPair[] = claims.map((claim) => ({
      pairKey: claim.factId,
      sharedKey: subject.subjectKey,
      left: { claimText: clause.statement },
      right: {
        claimText: claim.claimText || claim.title || claim.factId,
        signature: claim.signature,
        factId: claim.factId,
      },
    }));
    comparison = await composeClaimComparison(
      resolution,
      { pairs },
      { operationName: OPERATION_NAME },
    );
    const claimsById = new Map(claims.map((claim) => [claim.factId, claim]));
    redundancyCandidates = comparison.results.flatMap((judgment) => {
      const claim = claimsById.get(judgment.pairKey);
      if (!judgment.sameObligation || claim === undefined) return [];
      return [
        {
          factId: claim.factId,
          subjectKey: claim.subjectKey,
          requirementIds: claim.requirements ?? [],
          claimText: claim.claimText || claim.title || "",
          signature: claim.signature,
          confidence: judgment.confidence,
        },
      ];
    });
  }

  return {
    subject,
    redundancyCandidates,
    stamps: [...ranking.stamps, ...(comparison?.stamps ?? [])].map(
      publicCapabilityStamp,
    ),
    fallbackUsed: ranking.fallbackUsed || comparison?.fallbackUsed === true,
    diagnostics: [...ranking.diagnostics, ...(comparison?.diagnostics ?? [])],
  };
}
