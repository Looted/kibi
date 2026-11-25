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

import { readFileSync } from "node:fs";
import path from "node:path";
import {
  type KibiLevel,
  kibiLevelSettingName,
} from "kibi-agent-core/kibi-level";
import { KbRejection } from "../../cli-errors.js";
import { readAuthoredEntity } from "../../public/operations/entity-context.js";
import type { StoredEntityLookup } from "./stored-entity.js";
import type { UpsertInput } from "./types.js";

/** How far each required_evidence value asks a requirement to go. */
const EVIDENCE_RANK: Readonly<Record<string, number>> = {
  tested: 1,
  proved: 2,
};

function evidenceRank(value: unknown): number {
  return typeof value === "string" ? (EVIDENCE_RANK[value] ?? 0) : 0;
}

function authoredRequiredEvidence(
  workspaceRoot: string,
  stored: Readonly<Record<string, unknown>>,
): unknown {
  const source = stored.source;
  if (typeof source === "string" && source.endsWith(".md")) {
    try {
      const authored = readAuthoredEntity(
        readFileSync(path.resolve(workspaceRoot, source), "utf8"),
        source,
      );
      if (authored !== null) return authored.data.required_evidence;
    } catch {
      // An unreadable document falls back to the store.
    }
  }
  return stored.required_evidence;
}

/**
 * At level remember, refuse a requirement write that raises required_evidence
 * to tested or proved: the level checks no scenario, test or proof, so a
 * person chooses level test first. A write that keeps or lowers the floor is
 * not judged here.
 */
export async function assertRequiredEvidenceFitsLevel(
  input: UpsertInput,
  workspaceRoot: string,
  level: KibiLevel,
  lookup: StoredEntityLookup,
): Promise<void> {
  if (level !== "remember" || input.type !== "req") return;
  const requested = input.properties.required_evidence;
  if (evidenceRank(requested) === 0) return;
  const stored = await lookup.entity();
  const before =
    stored === undefined || stored === null
      ? undefined
      : authoredRequiredEvidence(workspaceRoot, stored);
  if (evidenceRank(requested) <= evidenceRank(before)) return;
  throw new KbRejection(
    "LEVEL_DOES_NOT_CHECK_EVIDENCE",
    `Entity validation failed: ${input.id} asks for required_evidence ${String(requested)}, but the project's Kibi level is remember, which checks no scenario, test or proof. A person chooses level test first (${kibiLevelSettingName(workspaceRoot)}); until then, write the requirement without required_evidence.`,
    [{ rule: "kibi_level", field: "properties.required_evidence" }],
  );
}
