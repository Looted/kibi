/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { expect, mock, test } from "bun:test";
import { persistRelationships } from "../../../src/commands/sync/persistence.js";
import type { ExtractionResult } from "../../../src/extractors/markdown.js";
import type { PrologProcess, QueryResult } from "../../../src/prolog.js";

function makeQueryOnlyProlog(): PrologProcess {
  const prolog = {
    query: mock(
      async (): Promise<QueryResult> => ({
        success: false,
        bindings: {},
        error: "Query failed",
      }),
    ),
  };

  return prolog as unknown as PrologProcess;
}

test("persistRelationships continues retries when query-only Prolog cannot be reset", async () => {
  const extractionResult: ExtractionResult = {
    entity: {
      id: "REQ-001",
      type: "req",
      title: "Retry source",
      status: "open",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      source: ".kb/requirements/REQ-001.md",
    },
    relationships: [{ type: "depends_on", from: "REQ-001", to: "REQ-002" }],
  };
  const prolog = makeQueryOnlyProlog();
  const warnSpy = mock();
  const originalWarn = console.warn;
  console.warn = warnSpy;

  try {
    const result = await persistRelationships(prolog, [extractionResult], []);

    expect(result.relationshipCount).toBe(0);
    expect(result.kbModified).toBe(false);
  } finally {
    console.warn = originalWarn;
  }
});
