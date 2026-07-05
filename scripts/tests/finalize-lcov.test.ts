/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { finalizeLcov } from "../finalize-lcov.ts";

describe("finalizeLcov", () => {
  test("keeps an existing lcov.info file", async () => {
    const coverageDir = mkdtempSync(join(tmpdir(), "kibi-lcov-finalize-"));
    const lcovPath = join(coverageDir, "lcov.info");
    writeFileSync(lcovPath, "TN:\n", "utf8");

    expect(await finalizeLcov(coverageDir)).toBe(lcovPath);
    expect(readFileSync(lcovPath, "utf8")).toBe("TN:\n");
  });

  test("renames Bun temporary LCOV output to lcov.info", async () => {
    const coverageDir = mkdtempSync(join(tmpdir(), "kibi-lcov-finalize-"));
    const temporaryPath = join(coverageDir, ".lcov.info.abc123.tmp");
    writeFileSync(temporaryPath, "TN:\nSF:example.ts\n", "utf8");

    const lcovPath = await finalizeLcov(coverageDir);

    expect(lcovPath).toBe(join(coverageDir, "lcov.info"));
    expect(existsSync(temporaryPath)).toBe(false);
    expect(readFileSync(lcovPath, "utf8")).toBe("TN:\nSF:example.ts\n");
  });
});
