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

import type { ExtractionResult } from "../extractors/markdown.js";
import type { Violation } from "../public/check-types.js";
import {
  type AuthoredEntity,
  readAuthoredEntity,
} from "../public/operations/entity-context.js";
import {
  POSITIVE_SCENARIO_RULE,
  positiveScenarioViolations,
  readPositiveScenarioGaps,
} from "../public/operations/positive-scenario.js";
import type { PrologPort } from "../public/operations/runtime-types.js";
import {
  SUBJECT_DEFINITION_MISSING_RULE,
  evaluateSubjectLayer,
} from "../public/operations/subject-layer.js";
import { type KbManifest, parseKbManifest } from "../utils/kb-manifest.js";
import { KB_PATHS } from "../utils/kb-paths.js";

const RELATED_REQUIREMENT_UNMODELED_RULE = "related-requirement-unmodeled";

/**
 * The requirement-scoped blocking rules `kibi check --staged` runs over the
 * staged knowledge, each with the KB schema from which `kibi check` blocks
 * it (see schema-version.ts): an unanchored or undefined claim subject and a
 * subject without a definition from 16, a must requirement without a
 * success scenario from 17, an unmodeled claim paired with another
 * requirement from 18.
 */
export const STAGED_REQUIREMENT_RULE_SCHEMAS: Readonly<Record<string, number>> =
  {
    "claim-subject-missing": 16,
    "claim-subject-undefined": 16,
    [SUBJECT_DEFINITION_MISSING_RULE]: 16,
    [POSITIVE_SCENARIO_RULE]: 17,
    [RELATED_REQUIREMENT_UNMODELED_RULE]: 18,
  };

/** Inventory statuses that leave a claim unmodeled. */
const UNMODELED_STATUSES = new Set(["missing", "ontology_gap", "ambiguous"]);

/**
 * Whether a staged requirement has an unmodeled claim. Only such a
 * requirement can carry a related-requirement-unmodeled finding, and the
 * rule pairs every requirement of the KB, so it runs only then.
 */
function stagesUnmodeledClaim(staged: readonly ExtractionResult[]): boolean {
  return staged.some(
    ({ entity }) =>
      entity.type === "req" &&
      Array.isArray(entity.semantic_inventory) &&
      entity.semantic_inventory.some((entry) =>
        UNMODELED_STATUSES.has(String(entry?.status)),
      ),
  );
}

/** The rules above that the aggregated Prolog checks evaluate. */
const AGGREGATED_RULES = new Set([
  "claim-subject-missing",
  "claim-subject-undefined",
  RELATED_REQUIREMENT_UNMODELED_RULE,
]);

type TreeReader = Readonly<{
  headTree: string;
  readGit(args: readonly string[]): Buffer;
  readBlobs(oids: readonly string[]): ReadonlyMap<string, Buffer>;
}>;

/** Requirement-scoped rules for the staged consistency gate. */
type StagedRequirementRules = Readonly<{
  /** Aggregated Prolog rules to run with the consistency rules. */
  rules: readonly string[];
  /** The entities a finding must belong to for the gate to report it. */
  entityIds: ReadonlySet<string>;
  /** The other selected rules, over one tree's projected knowledge. */
  evaluate(
    prolog: Pick<PrologPort, "query">,
    tree: string,
    knowledge: readonly ExtractionResult[],
  ): Promise<Violation[]>;
}>;

/** The manifest the staged tree commits; null when it has none it reads. */
export function readTreeManifest(
  snapshot: Pick<TreeReader, "headTree" | "readGit">,
): KbManifest | null {
  try {
    return parseKbManifest(
      snapshot
        .readGit(["show", `${snapshot.headTree}:${KB_PATHS.manifest}`])
        .toString("utf8"),
    );
  } catch {
    return null;
  }
}

/** The rules a KB at `schemaVersion` blocks on; none without a manifest. */
export function selectStagedRequirementRules(
  schemaVersion: number | undefined,
): string[] {
  if (schemaVersion === undefined) return [];
  return Object.entries(STAGED_REQUIREMENT_RULE_SCHEMAS)
    .filter(([, since]) => schemaVersion >= since)
    .map(([rule]) => rule);
}

/** The text of each regular file at `paths` in `tree`, by path. */
function readTreeFiles(
  snapshot: Pick<TreeReader, "readGit" | "readBlobs">,
  tree: string,
  paths: readonly string[],
): Map<string, string> {
  const files = new Map<string, string>();
  if (paths.length === 0) return files;
  const entries = snapshot
    .readGit([
      "ls-tree",
      "-z",
      tree,
      "--",
      ...paths.map((file) => `:(literal)${file}`),
    ])
    .toString("utf8")
    .split("\0")
    .flatMap((entry) => {
      const [mode, type, oid] = entry.slice(0, entry.indexOf("\t")).split(" ");
      return type === "blob" && mode?.startsWith("100") && oid
        ? [{ oid, file: entry.slice(entry.indexOf("\t") + 1) }]
        : [];
    });
  const blobs = snapshot.readBlobs(entries.map(({ oid }) => oid));
  for (const { oid, file } of entries) {
    const blob = blobs.get(oid);
    if (blob !== undefined) files.set(file, blob.toString("utf8"));
  }
  return files;
}

/** Ids another entity of `knowledge` supersedes. */
function supersededIds(knowledge: readonly ExtractionResult[]): Set<string> {
  return new Set(
    knowledge.flatMap(({ relationships }) =>
      relationships
        .filter((relationship) => relationship.type === "supersedes")
        .map((relationship) => relationship.to),
    ),
  );
}

/** subject-definition-missing over the subject facts of one tree. */
function subjectDefinitionFindings(
  snapshot: Pick<TreeReader, "readGit" | "readBlobs">,
  tree: string,
  knowledge: readonly ExtractionResult[],
): Violation[] {
  const sources = knowledge
    .filter(
      ({ entity }) => entity.type === "fact" && entity.fact_kind === "subject",
    )
    .map(({ entity }) => entity.source);
  const entities: AuthoredEntity[] = [];
  for (const [file, content] of readTreeFiles(snapshot, tree, sources)) {
    const entity = readAuthoredEntity(content, file);
    if (entity !== null) entities.push(entity);
  }
  return evaluateSubjectLayer(
    entities,
    supersededIds(knowledge),
    new Set([SUBJECT_DEFINITION_MISSING_RULE]),
  );
}

/**
 * The requirement-scoped rules the staged tree's KB schema enables, judged
 * only on the entities whose documents the commit stages; null when the
 * schema enables none.
 */
export function stagedRequirementRules(
  snapshot: TreeReader,
  input: Readonly<{
    stagedPaths: readonly string[];
    knowledge: readonly ExtractionResult[];
  }>,
): StagedRequirementRules | null {
  const manifest = readTreeManifest(snapshot);
  const selected = selectStagedRequirementRules(manifest?.schemaVersion);
  if (selected.length === 0) return null;
  const stagedPaths = new Set(input.stagedPaths);
  const staged = input.knowledge.filter(({ entity }) =>
    stagedPaths.has(entity.source),
  );
  const entityIds = new Set(staged.map(({ entity }) => entity.id));
  const acknowledged = new Set(manifest?.positiveScenarioAcknowledged ?? []);
  const pairs = stagesUnmodeledClaim(staged);
  return {
    rules: selected.filter(
      (rule) =>
        AGGREGATED_RULES.has(rule) &&
        (pairs || rule !== RELATED_REQUIREMENT_UNMODELED_RULE),
    ),
    entityIds,
    async evaluate(prolog, tree, knowledge) {
      const findings: Violation[] = [];
      if (selected.includes(POSITIVE_SCENARIO_RULE)) {
        const payload = await readPositiveScenarioGaps({
          prolog: {
            query: (goal) => prolog.query(goal),
            nextSolution: async () => null,
            save: async () => prolog.query("kb_save"),
          },
        });
        findings.push(
          ...positiveScenarioViolations(payload.rows ?? [], acknowledged),
        );
      }
      if (selected.includes(SUBJECT_DEFINITION_MISSING_RULE))
        findings.push(...subjectDefinitionFindings(snapshot, tree, knowledge));
      return findings;
    },
  };
}
