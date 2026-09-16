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

import { executePruneReceipts } from "../operations/proof/prune-receipts.js";
import { createCliRuntime } from "../runtime/cli-runtime.js";

// implements REQ-kibi-proof-evidence-protocol
export type ProofPruneOptions = Readonly<{
  // implements REQ-kibi-proof-evidence-protocol
  test?: string;
  keep?: string;
}>;

// implements REQ-kibi-proof-evidence-protocol
export async function proofPruneCommand(options: ProofPruneOptions): Promise<{
  exitCode: number;
}> {
  const keepRaw = options.keep ?? "1";
  const keep = Number.parseInt(keepRaw, 10);
  if (!Number.isSafeInteger(keep) || keep < 1 || keep > 50) {
    throw new Error("proof prune: --keep must be an integer between 1 and 50");
  }
  const runtime = createCliRuntime();
  const context = await runtime.open(
    {
      name: "kibi_proof_prune" as never,
      effects: ["kb-mutate", "workspace-write"] as never,
      requiresProlog: true,
      execute: async () => undefined,
    },
    {},
  );
  let completed = false;
  try {
    const result = await executePruneReceipts(
      {
        keep,
        ...(options.test === undefined ? {} : { testId: options.test }),
      },
      context,
    );
    process.stdout.write(`${result.content[0]?.text ?? ""}\n`);
    for (const row of result.structuredContent.tests) {
      process.stdout.write(
        `  ${row.testId}: ${row.before} -> ${row.after} receipt(s)\n`,
      );
    }
    completed = true;
    await runtime.afterSuccess({ name: "kibi_proof_prune" } as never, context);
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
