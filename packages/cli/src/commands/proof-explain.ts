/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.
 */

import {
  classifyExplainTarget,
  executeProofExplain,
  renderProofExplain,
} from "../operations/proof/explain.js";
import { createCliRuntime } from "../runtime/cli-runtime.js";

// implements REQ-kibi-verification-evidence-contract
export type ProofExplainOptions = Readonly<{
  id?: string;
  requirement?: string;
  symbol?: string;
  json?: boolean;
}>;

// implements REQ-kibi-verification-evidence-contract
export async function proofExplainCommand(
  options: ProofExplainOptions,
): Promise<{ exitCode: number }> {
  const target = classifyExplainTarget(options.id, {
    ...(options.requirement === undefined
      ? {}
      : { requirement: options.requirement }),
    ...(options.symbol === undefined ? {} : { symbol: options.symbol }),
  });
  const runtime = createCliRuntime();
  const context = await runtime.open(
    {
      name: "kibi_proof_explain" as never,
      effects: [] as never,
      requiresProlog: true,
      execute: async () => undefined,
    },
    {},
  );
  let completed = false;
  try {
    const { view } = await executeProofExplain(target, context);
    if (options.json) {
      process.stdout.write(`${JSON.stringify(view, null, 2)}\n`);
    } else {
      process.stdout.write(renderProofExplain(view));
    }
    completed = true;
    await runtime.afterSuccess(
      { name: "kibi_proof_explain" } as never,
      context,
    );
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
