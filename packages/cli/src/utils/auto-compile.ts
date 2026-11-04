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

import { autoSyncEnabled } from "../commands/setup-choices.js";
import type { BranchAttachment } from "./branch-resolver.js";
import {
  inspectBranchStore,
  uncompiledBranchStoreReason,
} from "./branch-store.js";

// implements REQ-kibi-fresh-clone-setup
export type AutoCompileOutcome =
  | "compiled"
  | "not-needed"
  | "disabled"
  | "failed";

/**
 * Operations that never compile on their own: applying a plan revalidates
 * its hash against the live state, and the plan may itself hold the
 * branch-store-compile action this would pre-empt.
 */
const NO_AUTO_COMPILE = new Set(["kb_apply_plan"]);

/**
 * Compiles this branch's store from the authored `.kb/` sources when it was
 * never compiled (a fresh clone, a new branch without the post-checkout
 * hook), so the first query answers from the knowledge instead of an empty
 * store. It writes only derived, gitignored state: the compile skips every
 * write to tracked files. A detached, read-only or legacy attachment, an
 * opt-out (`KIBI_AUTO_SYNC=0` or `kibi.setup.autoSync: false`) or a failed
 * compile leaves the store as it was, and the operation then reports
 * branch_store_not_compiled as before.
 */
// implements REQ-kibi-fresh-clone-setup
export async function ensureBranchStoreCompiled(
  workspaceRoot: string,
  attachment: BranchAttachment,
  spec: { readonly name: string },
  env: NodeJS.ProcessEnv = process.env,
): Promise<AutoCompileOutcome> {
  if (NO_AUTO_COMPILE.has(spec.name)) return "not-needed";
  if (
    attachment.kind === "detached_snapshot" ||
    attachment.readOnly !== undefined ||
    attachment.migrationRequired
  )
    return "not-needed";
  const store = inspectBranchStore(workspaceRoot, attachment.kbBranch);
  const reason = uncompiledBranchStoreReason(
    workspaceRoot,
    store,
    attachment.kbBranch,
  );
  if (reason === null) return "not-needed";
  if (!autoSyncEnabled(workspaceRoot, env)) return "disabled";

  console.error(
    `[KIBI] Compiling the KB store for branch ${attachment.kbBranch} from ${String(reason.authoredSources)} authored source file(s): first use in this checkout. Set KIBI_AUTO_SYNC=0 to turn this off.`,
  );
  // Sync prints progress with console.log; a JSON route's or MCP server's
  // stdout must carry only its own output.
  const { log, info } = console;
  const toStderr = (...args: unknown[]) => console.error(...args);
  console.log = toStderr;
  console.info = toStderr;
  try {
    const { syncCommand } = await import("../commands/sync.js");
    const result = await syncCommand({
      workspaceRoot,
      quiet: true,
      compileOnly: true,
    });
    if (result.success) return "compiled";
    console.error(
      "[KIBI] Compiling the KB store did not complete; run 'kibi sync' to see why.",
    );
    return "failed";
  } catch (error) {
    console.error(
      `[KIBI] Compiling the KB store failed: ${error instanceof Error ? error.message : String(error)}. Run 'kibi sync' to compile it.`,
    );
    return "failed";
  } finally {
    console.log = log;
    console.info = info;
  }
}
