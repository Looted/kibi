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

import * as fs from "node:fs";
import * as path from "node:path";
import type { MigrationPlan } from "../public/operations/migration-plan.js";

/**
 * The migration plans `kibi migrate` printed recently, so an approval of a
 * plan that has since changed can say what changed. The file lives in the
 * gitignored `.kb/migrations/` and is only a reading aid: a plan applies only
 * with its current hash whatever this file says.
 */
const RECORD_FILE = "printed-plans.json";
const MAX_RECORDS = 8;

// implements REQ-cli-schema-migration
export type PrintedPlan = Readonly<{
  planHash: string;
  printedAt: string;
  expected: MigrationPlan["expected"];
  actions: readonly Readonly<{ id: string; code: string; state: string }>[];
}>;

function recordPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, ".kb", "migrations", RECORD_FILE);
}

function readRecords(workspaceRoot: string): PrintedPlan[] {
  try {
    const parsed: unknown = JSON.parse(
      fs.readFileSync(recordPath(workspaceRoot), "utf8"),
    );
    return Array.isArray(parsed)
      ? parsed.filter(
          (entry): entry is PrintedPlan =>
            typeof entry === "object" &&
            entry !== null &&
            typeof (entry as PrintedPlan).planHash === "string" &&
            Array.isArray((entry as PrintedPlan).actions),
        )
      : [];
  } catch {
    return [];
  }
}

// implements REQ-cli-schema-migration
/** Remember a plan `kibi migrate` printed; a write failure is ignored. */
export function recordPrintedPlan(
  workspaceRoot: string,
  plan: MigrationPlan,
  now: Date = new Date(),
): void {
  const entry: PrintedPlan = {
    planHash: plan.planHash,
    printedAt: now.toISOString(),
    expected: plan.expected,
    actions: plan.actions.map((action) => ({
      id: action.id,
      code: action.code,
      state: action.state,
    })),
  };
  const records = [
    entry,
    ...readRecords(workspaceRoot).filter(
      (record) => record.planHash !== plan.planHash,
    ),
  ].slice(0, MAX_RECORDS);
  try {
    fs.mkdirSync(path.dirname(recordPath(workspaceRoot)), { recursive: true });
    fs.writeFileSync(
      recordPath(workspaceRoot),
      `${JSON.stringify(records, null, 2)}\n`,
    );
  } catch {
    // The record only explains a changed plan; never fail a preview on it.
  }
}

// implements REQ-cli-schema-migration
/** The printed plan with this hash, if `kibi migrate` printed it here. */
export function findPrintedPlan(
  workspaceRoot: string,
  planHash: string,
): PrintedPlan | undefined {
  return readRecords(workspaceRoot).find(
    (record) => record.planHash === planHash,
  );
}

const EXPECTED_LABELS: Readonly<
  Record<keyof MigrationPlan["expected"], string>
> = {
  branch: "the Git branch",
  kbBranch: "the KB branch",
  kbSnapshotId: "the KB snapshot",
  workspaceSnapshot: "the workspace files",
  configHash: "the KB config",
};

/** A long hash cut to its first 12 characters; other values as they are. */
function short(value: string | null): string {
  if (value === null) return "none";
  return /^[0-9a-f]{20,}$/i.test(value) ? value.slice(0, 12) : value;
}

// implements REQ-cli-schema-migration
/** What differs between a printed plan and the current one, one line each. */
export function describePlanChange(
  printed: PrintedPlan,
  current: MigrationPlan,
): string[] {
  const lines: string[] = [];
  const before = new Map(printed.actions.map((action) => [action.id, action]));
  const after = new Map(current.actions.map((action) => [action.id, action]));
  for (const action of current.actions) {
    const old = before.get(action.id);
    if (old === undefined)
      lines.push(`added ${action.state} ${action.code}: ${action.id}`);
    else if (old.state !== action.state)
      lines.push(`${action.id} went from ${old.state} to ${action.state}`);
  }
  for (const action of printed.actions) {
    if (!after.has(action.id))
      lines.push(`removed ${action.state} ${action.code}: ${action.id}`);
  }
  for (const key of Object.keys(EXPECTED_LABELS) as Array<
    keyof MigrationPlan["expected"]
  >) {
    const was = printed.expected?.[key] ?? null;
    const now = current.expected[key];
    if (was !== now)
      lines.push(
        `${EXPECTED_LABELS[key]} changed (${short(was)} -> ${short(now)})`,
      );
  }
  return lines;
}
