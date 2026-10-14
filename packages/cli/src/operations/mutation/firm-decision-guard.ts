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
import { carriesFirmness } from "../../decision-firmness.js";
import {
  type DecisionDocument,
  firmEditGuidance,
  unapprovedFirmEdit,
} from "../../firm-decision-edit.js";
import {
  isCurrentAuthoredEntity,
  readAuthoredEntity,
} from "../../public/operations/entity-context.js";
import type { StoredEntityLookup } from "./stored-entity.js";
import type { UpsertInput } from "./types.js";

function readStoredDocument(
  workspaceRoot: string,
  stored: Readonly<Record<string, unknown>>,
): DecisionDocument | undefined {
  const source = stored.source;
  if (typeof source !== "string" || !source.endsWith(".md")) return undefined;
  try {
    const authored = readAuthoredEntity(
      readFileSync(path.resolve(workspaceRoot, source), "utf8"),
      source,
    );
    if (authored === null) return undefined;
    return {
      type: authored.type,
      data: authored.data,
      body: authored.body,
    };
  } catch {
    return undefined;
  }
}

/**
 * Refuse an upsert that changes a current firm requirement's or ADR's claim
 * in place unless it cites new human words for the change. The decision is
 * judged as authored before the write, so dropping its firmness or origin in
 * the same write does not make it editable.
 */
// implements REQ-kb-firm-decision-edit
export async function assertFirmDecisionUnchanged(
  input: UpsertInput,
  workspaceRoot: string,
  lookup: StoredEntityLookup,
): Promise<void> {
  if (!carriesFirmness(input.type)) return;
  const stored = await lookup.entity();
  if (stored === undefined || stored === null) return;
  const authored = readStoredDocument(workspaceRoot, stored);
  const before: DecisionDocument = authored ?? {
    type: input.type,
    data: stored,
    body: input.document?.body ?? "",
  };
  if (
    !isCurrentAuthoredEntity(
      { id: input.id, path: "", ...before, data: { ...before.data } },
      new Set(),
    )
  )
    return;
  const after: DecisionDocument = {
    type: input.type,
    data: { ...before.data, ...input.properties },
    body: input.document?.body ?? before.body,
  };
  const changed = unapprovedFirmEdit(before, after);
  if (changed.length === 0) return;
  throw new Error(
    `Entity validation failed: ${input.id} is a firm decision, so kb_upsert does not change its ${changed.join(", ")} in place. ${firmEditGuidance(input.type)}.`,
  );
}
