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
import { readFileSync } from "node:fs";
import path from "node:path";
import { kibiReleaseForMcp, mcpServerTitle } from "../src/kibi-release.js";

const manifest = JSON.stringify({
  release: "2026.11.0",
  packages: { "kibi-mcp": "3.25.0" },
});

describe("kibiReleaseForMcp", () => {
  test("names the release that lists this kibi-mcp", () => {
    expect(kibiReleaseForMcp("3.25.0", () => manifest)).toBe("2026.11.0");
  });

  test("is undefined for another kibi-mcp, a bad manifest or none", () => {
    expect(kibiReleaseForMcp("3.24.0", () => manifest)).toBeUndefined();
    expect(
      kibiReleaseForMcp("3.25.0", () => JSON.stringify({ release: 1 })),
    ).toBeUndefined();
    expect(kibiReleaseForMcp("3.25.0", () => "{")).toBeUndefined();
    expect(
      kibiReleaseForMcp("3.25.0", () => {
        throw new Error("Cannot find module 'kibi-core/release.json'");
      }),
    ).toBeUndefined();
  });

  test("reads the installed kibi-core manifest by default", () => {
    const shipped = JSON.parse(
      readFileSync(
        path.join(import.meta.dir, "../../core/release.json"),
        "utf8",
      ),
    ) as { release: string; packages: Record<string, string> };
    expect(kibiReleaseForMcp(shipped.packages["kibi-mcp"] ?? "")).toBe(
      shipped.release,
    );
  });
});

describe("mcpServerTitle", () => {
  test("adds the release when known", () => {
    expect(mcpServerTitle("2026.11.0")).toBe("Kibi MCP (Kibi 2026.11.0)");
    expect(mcpServerTitle(undefined)).toBe("Kibi MCP");
  });
});
