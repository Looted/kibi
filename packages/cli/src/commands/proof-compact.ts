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

import { executeCompactReceipts } from "../operations/proof/compact-receipts.js";
import { createCliRuntime } from "../runtime/cli-runtime.js";

// implements REQ-kibi-fresh-verification-receipts-v2
export type ProofCompactOptions = Readonly<{
  test?: string;
  dryRun?: boolean;
  json?: boolean;
}>;

// implements REQ-kibi-fresh-verification-receipts-v2
export async function proofCompactCommand(
  options: ProofCompactOptions,
): Promise<{ exitCode: number }> {
  const runtime = createCliRuntime();
  const spec = {
    name: "kibi_proof_compact" as never,
    effects: ["kb-mutate", "workspace-write"] as never,
    requiresProlog: true,
    execute: async () => undefined,
  };
  const context = await runtime.open(spec, {});
  let completed = false;
  try {
    const result = await executeCompactReceipts(
      {
        ...(options.test === undefined ? {} : { testId: options.test }),
        ...(options.dryRun === true ? { dryRun: true } : {}),
      },
      context,
    );
    if (options.json === true) {
      process.stdout.write(
        `${JSON.stringify(result.structuredContent, null, 2)}\n`,
      );
    } else {
      process.stdout.write(`${result.content[0]?.text ?? ""}\n`);
      for (const row of result.structuredContent.tests) {
        process.stdout.write(
          `  ${row.testId}: ${row.before} -> ${row.after} receipt(s)\n`,
        );
      }
      for (const row of result.structuredContent.skipped) {
        process.stdout.write(`  ${row.testId}: skipped (${row.reason})\n`);
      }
    }
    completed = true;
    if (options.dryRun !== true) await runtime.afterSuccess(spec, context);
    return { exitCode: 0 };
  } finally {
    await runtime.close(
      context,
      completed
        ? { status: "success", result: 0 }
        : { status: "error", error: 1 },
    );
  }
}
