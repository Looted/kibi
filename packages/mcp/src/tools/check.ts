import { checkSpec } from "kibi-runtime";
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
import type { PrologProcess } from "kibi-runtime";
import { resolveWorkspaceRoot } from "../workspace.js";
import type { CheckArgs, CheckResult } from "./check-types.js";

export type { CheckArgs, CheckResult } from "./check-types.js";

/**
 * Handle kb_check tool calls - run validation rules on the KB
 * Reuses validation logic from CLI check command
 */
// implements REQ-002
export async function handleKbCheck(
  prolog: PrologProcess,
  args: CheckArgs,
): Promise<CheckResult> {
  const workspaceRoot = args.workspaceRoot ?? resolveWorkspaceRoot();
  return checkSpec.execute(
    { ...args },
    {
      workspaceRoot,
      signal: new AbortController().signal,
      clock: () => new Date(),
      prolog: {
        query: (goal) => prolog.query(goal),
        nextSolution: async () => null,
        invalidateCache: () => prolog.invalidateCache(),
        save: () => prolog.query("kb_save"),
      },
    },
  );
}
