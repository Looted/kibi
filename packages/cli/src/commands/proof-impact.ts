/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.
 */

import { executeProofImpact } from "../operations/proof/impact.js";
import { createCliRuntime } from "../runtime/cli-runtime.js";

// implements REQ-kibi-verification-evidence-contract
export type ProofImpactOptions = Readonly<{
  json?: boolean;
}>;

// implements REQ-kibi-verification-evidence-contract
export async function proofImpactCommand(
  options: ProofImpactOptions,
): Promise<{ exitCode: number }> {
  const runtime = createCliRuntime();
  const context = await runtime.open(
    {
      name: "kibi_proof_impact" as never,
      effects: [] as never,
      requiresProlog: true,
      execute: async () => undefined,
    },
    {},
  );
  let completed = false;
  try {
    const { result, text } = await executeProofImpact(context);
    if (options.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      process.stdout.write(text);
    }
    completed = true;
    await runtime.afterSuccess({ name: "kibi_proof_impact" } as never, context);
    return { exitCode: result.changes.length > 0 ? 1 : 0 };
  } finally {
    await runtime.close(
      context,
      completed
        ? { status: "success", result: 0 }
        : { status: "error", error: 1 },
    );
  }
}
