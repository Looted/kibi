/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { describe, expect, test, beforeEach, mock, spyOn } from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { rankEntities, loadMarkdownBody } from "../src/search-ranking.js";

// ---------------------------------------------------------------------------
// Helper: build a minimal entity object
// ---------------------------------------------------------------------------
function makeEntity(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: "REQ-001",
    title: "Test requirement",
    type: "req",
    source: "",
    owner: "",
    priority: "",
    severity: "",
    tags: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// loadMarkdownBody
// ---------------------------------------------------------------------------
describe("loadMarkdownBody", () => {
  test("returns null for empty source string", async () => {
    const result = await loadMarkdownBody("", "/workspace");
    expect(result).toBeNull();
  });

  test("returns null for undefined-like empty source", async () => {
    // source is typed as string but callers may pass coercion of undefined
    const result = await loadMarkdownBody(`${undefined}`, "/workspace");
    expect(result).toBeNull();
  });

  test("returns null for non-markdown files", async () => {
    const result = await loadMarkdownBody("src/file.ts", "/workspace");
    expect(result).toBeNull();
  });

  test("returns null for non-markdown files with absolute path", async () => {
    const result = await loadMarkdownBody(
      "/workspace/src/file.js",
      "/workspace",
    );
    expect(result).toBeNull();
  });

  test("resolves relative paths against workspaceRoot", async () => {
    const body = "# Hello\n\nThis is the body content.";

    const readSpy = spyOn(fs, "readFile").mockResolvedValue(body);
    readSpy.mockRestore();

    const mdContent = "---\ntitle: Test\n---\nThis is the body content.";
    const readFileSpy = spyOn(fs, "readFile").mockResolvedValue(mdContent);

    const result = await loadMarkdownBody("docs/test.md", "/workspace");

    // Verify it resolved against workspaceRoot
    const expectedPath = path.resolve("/workspace", "docs/test.md");
    expect(readFileSpy).toHaveBeenCalledWith(expectedPath, "utf8");

    // gray-matter strips frontmatter and returns content
    expect(result).toBe("This is the body content.");

    readFileSpy.mockRestore();
  });

  test("handles absolute paths directly", async () => {
    const mdContent = "---\ntitle: Abs\n---\nAbsolute path body.";
    const readFileSpy = spyOn(fs, "readFile").mockResolvedValue(mdContent);

    const absPath = path.resolve("/workspace", "docs/abs.md");
    const result = await loadMarkdownBody(absPath, "/workspace");

    expect(readFileSpy).toHaveBeenCalledWith(absPath, "utf8");
    expect(result).toBe("Absolute path body.");

    readFileSpy.mockRestore();
  });

  test("blocks path traversal attempts", async () => {
    const result = await loadMarkdownBody(
      "../../../etc/passwd.md",
      "/workspace",
    );
    expect(result).toBeNull();
  });

  test("blocks absolute path outside workspace root", async () => {
    const result = await loadMarkdownBody("/etc/secrets.md", "/workspace");
    expect(result).toBeNull();
  });

  test("strips hash fragment from source before processing", async () => {
    const mdContent = "---\ntitle: Frag\n---\nFragment body.";
    const readFileSpy = spyOn(fs, "readFile").mockResolvedValue(mdContent);

    const result = await loadMarkdownBody("docs/test.md#L42", "/workspace");

    const expectedPath = path.resolve("/workspace", "docs/test.md");
    expect(readFileSpy).toHaveBeenCalledWith(expectedPath, "utf8");
    expect(result).toBe("Fragment body.");

    readFileSpy.mockRestore();
  });

  test("returns null when source is only a hash fragment", async () => {
    // After splitting on "#", the remainder is empty → doesn't end with .md
    const result = await loadMarkdownBody("#L42", "/workspace");
    expect(result).toBeNull();
  });

  test("returns null on file read errors", async () => {
    const readFileSpy = spyOn(fs, "readFile").mockRejectedValue(
      new Error("ENOENT: no such file"),
    );

    const result = await loadMarkdownBody("docs/missing.md", "/workspace");
    expect(result).toBeNull();

    readFileSpy.mockRestore();
  });

  test("returns null for source that ends with .md but is only a fragment path", async () => {
    // "file.md" portion after # split is valid but traversal blocked
    const result = await loadMarkdownBody(
      "/outside/workspace/file.md",
      "/workspace",
    );
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// rankEntities — scoring and sorting
// ---------------------------------------------------------------------------
describe("rankEntities", () => {
  test("returns empty array for empty entities input", async () => {
    const result = await rankEntities([], "query", "/workspace");
    expect(result).toEqual([]);
  });

  test("returns empty array for empty query", async () => {
    const entities = [makeEntity({ title: "Authentication flow" })];
    const result = await rankEntities(entities, "", "/workspace");
    expect(result).toEqual([]);
  });

  test("returns empty array for whitespace query", async () => {
    const entities = [makeEntity({ title: "Authentication flow" })];
    const result = await rankEntities(entities, "   ", "/workspace");
    expect(result).toEqual([]);
  });

  test("returns empty array when no entity matches the query", async () => {
    const entities = [makeEntity({ title: "Authentication flow" })];
    const result = await rankEntities(
      entities,
      "unrelated query xyz",
      "/workspace",
    );
    expect(result).toEqual([]);
  });

  test("matches single entity by exact title", async () => {
    const entity = makeEntity({ title: "Authentication" });
    const result = await rankEntities([entity], "Authentication", "/workspace");

    expect(result).toHaveLength(1);
    expect(result[0].entity).toBe(entity);
    expect(result[0].score).toBeGreaterThanOrEqual(100);
    expect(result[0].reasons).toContain("exact title match");
  });

  test("matches single entity by title phrase (partial)", async () => {
    const entity = makeEntity({ title: "User Authentication Flow" });
    const result = await rankEntities([entity], "authentication", "/workspace");

    expect(result).toHaveLength(1);
    expect(result[0].reasons).toContain("title phrase match");
  });

  test("matches by exact ID", async () => {
    const entity = makeEntity({ id: "REQ-042", title: "Something else" });
    const result = await rankEntities([entity], "REQ-042", "/workspace");

    expect(result).toHaveLength(1);
    expect(result[0].reasons).toContain("exact ID match");
    expect(result[0].score).toBeGreaterThanOrEqual(90);
  });

  test("matches by partial ID", async () => {
    const entity = makeEntity({ id: "REQ-042", title: "Irrelevant" });
    const result = await rankEntities([entity], "req-042", "/workspace");

    // "req-042" matches exact ID (normalize is case-insensitive)
    expect(result).toHaveLength(1);
    expect(result[0].reasons).toContain("exact ID match");
  });

  test("matches by ID substring", async () => {
    const entity = makeEntity({
      id: "REQ-042",
      title: "Completely unrelated title",
    });
    const result = await rankEntities([entity], "042", "/workspace");

    expect(result).toHaveLength(1);
    expect(result[0].reasons).toContain("ID match");
  });

  test("matches by metadata field: type", async () => {
    const entity = makeEntity({ title: "Something", type: "requirement" });
    const result = await rankEntities([entity], "requirement", "/workspace");

    expect(result).toHaveLength(1);
    expect(result[0].reasons).toContain("metadata match");
  });

  test("matches by metadata field: owner", async () => {
    const entity = makeEntity({ title: "X", owner: "platform-team" });
    const result = await rankEntities([entity], "platform-team", "/workspace");

    expect(result).toHaveLength(1);
    expect(result[0].reasons).toContain("metadata match");
  });

  test("matches by metadata field: priority", async () => {
    const entity = makeEntity({ title: "X", priority: "critical" });
    const result = await rankEntities([entity], "critical", "/workspace");

    expect(result).toHaveLength(1);
    expect(result[0].reasons).toContain("metadata match");
  });

  test("matches by metadata field: severity", async () => {
    const entity = makeEntity({ title: "X", severity: "high" });
    const result = await rankEntities([entity], "high", "/workspace");

    expect(result).toHaveLength(1);
    expect(result[0].reasons).toContain("metadata match");
  });

  test("matches by metadata field: source", async () => {
    const entity = makeEntity({ title: "X", source: "src/auth/login.ts" });
    const result = await rankEntities([entity], "login", "/workspace");

    expect(result).toHaveLength(1);
    expect(result[0].reasons).toContain("metadata match");
  });

  test("matches by tag", async () => {
    const entity = makeEntity({ title: "X", tags: ["security", "auth"] });
    const result = await rankEntities([entity], "security", "/workspace");

    expect(result).toHaveLength(1);
    expect(result[0].reasons).toContain("tag match");
  });

  test("does not match tags when query does not match any tag", async () => {
    const entity = makeEntity({ title: "X", tags: ["security", "auth"] });
    const result = await rankEntities(
      [entity],
      "billing unrelated",
      "/workspace",
    );

    expect(result).toEqual([]);
  });

  test("title token coverage: multi-word query matches title tokens", async () => {
    const entity = makeEntity({ title: "User Authentication Flow" });
    const result = await rankEntities([entity], "user flow", "/workspace");

    expect(result).toHaveLength(1);
    // "user" and "flow" are both tokens in the title
    expect(result[0].reasons).toContain("title token coverage");
    // 2 tokens × 8 = 16 points for title token coverage
    expect(result[0].score).toBeGreaterThanOrEqual(16);
  });

  test("title token coverage: single token match", async () => {
    const entity = makeEntity({ title: "Authentication Service" });
    const result = await rankEntities(
      [entity],
      "service endpoint",
      "/workspace",
    );

    expect(result).toHaveLength(1);
    expect(result[0].reasons).toContain("title token coverage");
  });

  test("sorting by score descending", async () => {
    const high = makeEntity({ id: "REQ-001", title: "Exact match query" });
    const low = makeEntity({
      id: "REQ-002",
      title: "Something about query mention",
    });

    const result = await rankEntities(
      [low, high],
      "exact match query",
      "/workspace",
    );

    expect(result[0].entity.id).toBe("REQ-001"); // exact title = 100 + tokens
    expect(result[1].entity.id).toBe("REQ-002"); // token match only
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });

  test("sorting by type when scores are equal", async () => {
    const entityA = makeEntity({ id: "REQ-001", title: "X", type: "req" });
    const entityB = makeEntity({ id: "REQ-002", title: "X", type: "adr" });

    const result = await rankEntities([entityA, entityB], "X", "/workspace");

    // Same score, sort by type alphabetically: "adr" < "req"
    expect(result[0].entity.type).toBe("adr");
    expect(result[1].entity.type).toBe("req");
  });

  test("sorting by id when scores and types are equal", async () => {
    const entityA = makeEntity({ id: "REQ-002", title: "X", type: "req" });
    const entityB = makeEntity({ id: "REQ-001", title: "X", type: "req" });

    const result = await rankEntities([entityA, entityB], "X", "/workspace");

    expect(result[0].entity.id).toBe("REQ-001");
    expect(result[1].entity.id).toBe("REQ-002");
  });

  test("deduplicates reasons via Set", async () => {
    // An entity where both title exact match and title token coverage trigger
    const entity = makeEntity({ title: "search" });
    const result = await rankEntities([entity], "search", "/workspace");

    expect(result).toHaveLength(1);
    // "search" matches exact title AND is a token in title — reasons should be unique
    const reasonCounts = new Map<string, number>();
    for (const r of result[0].reasons) {
      reasonCounts.set(r, (reasonCounts.get(r) ?? 0) + 1);
    }
    for (const [, count] of reasonCounts) {
      expect(count).toBe(1);
    }
  });

  test("handles entity with missing/undefined fields gracefully", async () => {
    const entity = { id: undefined, title: undefined } as Record<
      string,
      unknown
    >;
    const result = await rankEntities([entity], "anything", "/workspace");
    // No fields match "anything" → score 0 → filtered out
    expect(result).toEqual([]);
  });

  test("handles entity with non-array tags gracefully", async () => {
    const entity = makeEntity({ tags: "not-an-array" });
    const result = await rankEntities([entity], "not-an-array", "/workspace");
    // tags is not an array, so tag matching is skipped; "not-an-array" doesn't match other fields
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// rankEntities — markdown body scoring + snippets
// ---------------------------------------------------------------------------
describe("rankEntities — markdown body integration", () => {
  test("scores markdown body exact match and generates snippet", async () => {
    const entity = makeEntity({
      title: "Irrelevant title",
      source: "docs/REQ-100.md",
    });
    const mdContent =
      "---\ntitle: REQ-100\n---\nThis document describes the authentication requirements for the system.";

    const readFileSpy = spyOn(fs, "readFile").mockResolvedValue(mdContent);

    const result = await rankEntities(
      [entity],
      "authentication requirements",
      "/workspace",
    );

    expect(result).toHaveLength(1);
    expect(result[0].reasons).toContain("markdown body match");
    expect(result[0].snippet).toBeDefined();
    expect(result[0].score).toBeGreaterThanOrEqual(15);

    readFileSpy.mockRestore();
  });

  test("scores markdown body token coverage when phrase not found", async () => {
    const entity = makeEntity({
      title: "Irrelevant title",
      source: "docs/REQ-200.md",
    });
    const mdContent =
      "---\ntitle: REQ-200\n---\nAuthentication and authorization are handled separately.";

    const readFileSpy = spyOn(fs, "readFile").mockResolvedValue(mdContent);

    // Query tokens "auth" and "authz" — "auth" appears in "authentication"
    const result = await rankEntities([entity], "auth separate", "/workspace");

    expect(result).toHaveLength(1);
    expect(result[0].reasons).toContain("markdown body token coverage");
    expect(result[0].snippet).toBeDefined();

    readFileSpy.mockRestore();
  });

  test("does not add body score when markdown body is null", async () => {
    const entity = makeEntity({
      title: "Auth system",
      source: "", // empty source → loadMarkdownBody returns null
    });

    const result = await rankEntities([entity], "Auth system", "/workspace");

    expect(result).toHaveLength(1);
    expect(result[0].reasons).not.toContain("markdown body match");
    expect(result[0].reasons).not.toContain("markdown body token coverage");
    expect(result[0].snippet).toBeUndefined();
  });

  test("snippet is truncated at 160 characters", async () => {
    const longLine = "A".repeat(200);
    const entity = makeEntity({
      title: "X",
      source: "docs/long.md",
    });
    const mdContent = `---\ntitle: Long\n---\n${longLine}`;

    const readFileSpy = spyOn(fs, "readFile").mockResolvedValue(mdContent);

    const result = await rankEntities([entity], "AAA", "/workspace");

    expect(result).toHaveLength(1);
    const snippet = result[0].snippet;
    expect(snippet).toBeDefined();
    expect(snippet?.length).toBe(160); // 157 + "..."
    expect(snippet?.endsWith("...")).toBe(true);

    readFileSpy.mockRestore();
  });

  test("snippet is not truncated when under 160 chars", async () => {
    const shortLine = "Short content here";
    const entity = makeEntity({
      title: "X",
      source: "docs/short.md",
    });
    const mdContent = `---\ntitle: Short\n---\n${shortLine}`;

    const readFileSpy = spyOn(fs, "readFile").mockResolvedValue(mdContent);

    const result = await rankEntities([entity], "Short content", "/workspace");

    expect(result).toHaveLength(1);
    expect(result[0].snippet).toBe(shortLine);

    readFileSpy.mockRestore();
  });

  test("snippet uses first line when no line matches query", async () => {
    const entity = makeEntity({
      title: "X",
      source: "docs/nomatch.md",
    });
    const mdContent =
      "---\ntitle: NoMatch\n---\nFirst line of body.\nSecond line with other content.";

    const readFileSpy = spyOn(fs, "readFile").mockResolvedValue(mdContent);

    // "token" matches token coverage, but no single line contains "token coverage"
    // buildSnippet falls back to first line when no line matches
    const result = await rankEntities([entity], "body", "/workspace");

    expect(result).toHaveLength(1);
    if (result[0].snippet) {
      // The snippet should be one of the body lines
      expect(
        result[0].snippet === "First line of body." ||
          result[0].snippet === "Second line with other content.",
      ).toBe(true);
    }

    readFileSpy.mockRestore();
  });

  test("returns undefined snippet when body has no non-empty lines", async () => {
    const entity = makeEntity({
      title: "X",
      source: "docs/empty.md",
    });
    // Only frontmatter, body is empty/whitespace
    const mdContent = "---\ntitle: Empty\n---\n   \n  \n";

    const readFileSpy = spyOn(fs, "readFile").mockResolvedValue(mdContent);

    // Even though body match may score, snippet should be undefined
    const result = await rankEntities([entity], "empty", "/workspace");

    // Body is empty after gray-matter extraction, so no body scoring
    // The title "X" won't match "empty", so result may be empty
    // Let's check with matching title
    readFileSpy.mockRestore();

    const entity2 = makeEntity({
      title: "Empty",
      source: "docs/empty.md",
    });
    const readFileSpy2 = spyOn(fs, "readFile").mockResolvedValue(mdContent);

    const result2 = await rankEntities([entity2], "empty", "/workspace");

    expect(result2).toHaveLength(1);
    // Title matches, but body is all whitespace → no snippet
    expect(result2[0].snippet).toBeUndefined();

    readFileSpy2.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// rankEntities — combined scoring scenarios
// ---------------------------------------------------------------------------
describe("rankEntities — combined scoring", () => {
  test("exact title + exact ID + tags + metadata accumulates score", async () => {
    const entity = makeEntity({
      id: "search",
      title: "search",
      type: "search",
      tags: ["search"],
    });

    const result = await rankEntities([entity], "search", "/workspace");

    expect(result).toHaveLength(1);
    const match = result[0];
    expect(match.reasons).toContain("exact title match");
    expect(match.reasons).toContain("exact ID match");
    expect(match.reasons).toContain("metadata match");
    expect(match.reasons).toContain("tag match");
    // Score should be at least 100 + 90 + 20 + 30 = 240
    expect(match.score).toBeGreaterThanOrEqual(240);
  });

  test("title phrase match + ID match + metadata + tags", async () => {
    const entity = makeEntity({
      id: "REQ-AUTH",
      title: "User Authentication Module",
      type: "req",
      tags: ["auth"],
    });

    const result = await rankEntities([entity], "auth", "/workspace");

    expect(result).toHaveLength(1);
    expect(result[0].reasons).toContain("title token coverage");
  });

  test("multiple entities sorted correctly by score", async () => {
    const high = makeEntity({
      id: "REQ-001",
      title: "Exact Search Title",
      tags: ["search"],
    });
    const medium = makeEntity({
      id: "REQ-002",
      title: "Search Related",
    });
    const low = makeEntity({
      id: "REQ-003",
      title: "Something else entirely",
      type: "search",
    });

    const result = await rankEntities(
      [low, high, medium],
      "search",
      "/workspace",
    );

    expect(result.length).toBeGreaterThanOrEqual(2);
    // High should be first (exact title match)
    expect(result[0].entity.id).toBe("REQ-001");
  });

  test("handles large number of entities", async () => {
    const entities = Array.from({ length: 100 }, (_, i) =>
      makeEntity({
        id: `REQ-${String(i).padStart(3, "0")}`,
        title: `Requirement ${i}`,
      }),
    );

    const result = await rankEntities(entities, "requirement 50", "/workspace");

    // At minimum "Requirement 50" should match, plus others via token coverage
    expect(result.length).toBeGreaterThan(0);
    // The entity with title "Requirement 50" should score highest
    expect(result[0].entity.id).toBe("REQ-050");
  });
});

// ---------------------------------------------------------------------------
// Edge cases and normalization
// ---------------------------------------------------------------------------
describe("rankEntities — edge cases and normalization", () => {
  test("query is case-insensitive", async () => {
    const entity = makeEntity({ title: "Authentication" });
    const lower = await rankEntities([entity], "authentication", "/workspace");
    const upper = await rankEntities([entity], "AUTHENTICATION", "/workspace");
    const mixed = await rankEntities([entity], "AuThEnTiCaTiOn", "/workspace");

    expect(lower[0].score).toBe(upper[0].score);
    expect(lower[0].score).toBe(mixed[0].score);
  });

  test("query with leading/trailing whitespace is trimmed", async () => {
    const entity = makeEntity({ title: "Authentication" });
    const result = await rankEntities(
      [entity],
      "  Authentication  ",
      "/workspace",
    );

    expect(result).toHaveLength(1);
    expect(result[0].reasons).toContain("exact title match");
  });

  test("multi-word query tokenized correctly", async () => {
    const entity = makeEntity({ title: "User Login Service" });
    const result = await rankEntities([entity], "user login", "/workspace");

    expect(result).toHaveLength(1);
    // Both tokens match title → title phrase or token coverage
    expect(result[0].score).toBeGreaterThan(0);
  });

  test("entity with numeric-like id still matches", async () => {
    const entity = makeEntity({ id: "REQ-123", title: "Something" });
    const result = await rankEntities([entity], "123", "/workspace");

    expect(result).toHaveLength(1);
    expect(result[0].reasons).toContain("ID match");
  });

  test("empty query string returns empty result", async () => {
      const entity = makeEntity({ title: "Something" });
      const result = await rankEntities([entity], "", "/workspace");
  
      expect(result).toEqual([]);
    });
  test("whitespace-only query returns empty result", async () => {
      const entity = makeEntity({ title: "Something" });
      const result = await rankEntities([entity], "   ", "/workspace");
  
      expect(result).toEqual([]);
    });

  test("entity with empty tags array does not crash", async () => {
    const entity = makeEntity({ title: "Auth", tags: [] });
    const result = await rankEntities([entity], "Auth", "/workspace");

    expect(result).toHaveLength(1);
  });

  test("path traversal in source is safely handled during body load", async () => {
    const entity = makeEntity({
      title: "Auth",
      source: "../../../etc/secrets.md",
    });

    const result = await rankEntities([entity], "Auth", "/workspace");

    expect(result).toHaveLength(1);
    // Title matches, but body load should fail safely (returns null)
    expect(result[0].reasons).not.toContain("markdown body match");
  });
});

// ---------------------------------------------------------------------------
// buildSnippet — indirect testing through rankEntities
// ---------------------------------------------------------------------------
describe("buildSnippet behavior via rankEntities", () => {
  test("finds the first matching line in body for snippet", async () => {
    const entity = makeEntity({ title: "X", source: "docs/multi.md" });
    const mdContent =
      "---\ntitle: Multi\n---\nFirst line.\nSecond line with MATCH target.\nThird line.";

    const readFileSpy = spyOn(fs, "readFile").mockResolvedValue(mdContent);

    const result = await rankEntities([entity], "MATCH target", "/workspace");

    expect(result).toHaveLength(1);
    expect(result[0].snippet).toContain("MATCH target");

    readFileSpy.mockRestore();
  });

  test("handles CRLF line endings in markdown body", async () => {
    const entity = makeEntity({ title: "X", source: "docs/crlf.md" });
    const mdContent =
      "---\ntitle: CRLF\n---\r\nLine one.\r\nLine two with search.\r\n";

    const readFileSpy = spyOn(fs, "readFile").mockResolvedValue(mdContent);

    const result = await rankEntities([entity], "search", "/workspace");

    expect(result).toHaveLength(1);
    expect(result[0].snippet).toBeDefined();

    readFileSpy.mockRestore();
  });
});

describe("rankEntities — search quality corpus", () => {
  const FACT_APPLE_SIGNIN_REVENUECAT_RECOVERY = makeEntity({
    id: "FACT-search-apple-signin-revenuecat-recovery",
    title: "Apple Sign-In RevenueCat Recovery",
    type: "fact",
    source: "",
    body: [
      "Apple Sign-In recovery restores RevenueCat entitlements for premium recovery.",
      "The flow supports logged-out recovery when people cannot log in and need premium recovery.",
    ].join("\n"),
  });

  const REQ_REVENUECAT_ENTITLEMENT = makeEntity({
    id: "REQ-search-revenuecat-entitlement",
    title: "RevenueCat Entitlement Requirement",
    type: "req",
    source: "",
    body: [
      "RevenueCat entitlement verification must restore premium access deterministically.",
      "The requirement is specifically about RevenueCat entitlement handling.",
    ].join("\n"),
  });

  const ADR_AUTH_PROVIDER = makeEntity({
    id: "ADR-search-auth-provider",
    title: "Auth Provider Decision",
    type: "adr",
    source: "",
    body: [
      "Apple Sign-In architecture is the chosen authentication provider strategy.",
      "The decision records the Apple Sign-In provider boundary.",
    ].join("\n"),
  });

  const SCEN_GENERIC_AUTH_FEEDBACK = makeEntity({
    id: "SCEN-search-generic-auth-feedback",
    title: "Generic Auth Feedback",
    type: "scenario",
    source: "",
    body: [
      "Authentication status feedback is shown to the user after auth attempts.",
      "Generic status messages explain whether authentication is still pending.",
    ].join("\n"),
  });

  const FACT_UNRELATED_SYNC_FEEDBACK = makeEntity({
    id: "FACT-search-unrelated-sync-feedback",
    title: "Sync Feedback Observation",
    type: "fact",
    source: "",
    body: [
      "Sync feedback notifications explain repository synchronization progress.",
      "This observation is about background sync status and notification delivery only.",
    ].join("\n"),
  });

  const SEARCH_QUALITY_CORPUS = [
    FACT_APPLE_SIGNIN_REVENUECAT_RECOVERY,
    REQ_REVENUECAT_ENTITLEMENT,
    ADR_AUTH_PROVIDER,
    SCEN_GENERIC_AUTH_FEEDBACK,
    FACT_UNRELATED_SYNC_FEEDBACK,
  ];

  test("broad multi-intent query ranks targeted entity first", async () => {
    const result = await rankEntities(
      SEARCH_QUALITY_CORPUS,
      "Apple Sign-In authentication premium recovery RevenueCat entitlement logged out unable to log in",
      "/workspace",
    );

    expect(result[0]?.entity.id).toBe(
      "FACT-search-apple-signin-revenuecat-recovery",
    );
    expect(
      result
        .slice(0, 10)
        .map((match) => match.entity.id),
    ).not.toContain("FACT-search-unrelated-sync-feedback");
  });

  test("focused RevenueCat entitlement query ranks focused requirement first", async () => {
    const result = await rankEntities(
      SEARCH_QUALITY_CORPUS,
      "RevenueCat entitlement",
      "/workspace",
    );

    expect(result[0]?.entity.id).toBe("REQ-search-revenuecat-entitlement");
  });

  test("short exact query remains exact-first", async () => {
    const result = await rankEntities(
      SEARCH_QUALITY_CORPUS,
      "FACT-search-apple-signin-revenuecat-recovery",
      "/workspace",
    );

    expect(result[0]?.entity.id).toBe(
      "FACT-search-apple-signin-revenuecat-recovery",
    );
  });

  test("no-signal query returns no results", async () => {
    const result = await rankEntities(
      SEARCH_QUALITY_CORPUS,
      "to in out log logged unable",
      "/workspace",
    );

    expect(result).toEqual([]);
  });

  test("normalizes hyphenated sign-in and plural entitlement tokens", async () => {
    const result = await rankEntities(
      SEARCH_QUALITY_CORPUS,
      "sign-in entitlements",
      "/workspace",
    );
    const ids = result.map((match) => match.entity.id);

    const firstId = String(result[0]?.entity.id ?? "");

    expect([
      "FACT-search-apple-signin-revenuecat-recovery",
      "ADR-search-auth-provider",
    ]).toContain(firstId);

    const unrelatedIndex = ids.indexOf("FACT-search-unrelated-sync-feedback");
    if (unrelatedIndex !== -1) {
      expect(unrelatedIndex).toBeGreaterThan(0);
    }
  });

  test("preserves deterministic tie-break order", async () => {
    const result = await rankEntities(
      [
        makeEntity({ id: "REQ-auth-b", title: "auth", type: "req" }),
        makeEntity({ id: "ADR-auth-b", title: "auth", type: "adr" }),
        makeEntity({ id: "ADR-auth-a", title: "auth", type: "adr" }),
      ],
      "auth",
      "/workspace",
    );

    expect(result.map((match) => match.entity.id)).toEqual([
      "ADR-auth-a",
      "ADR-auth-b",
      "REQ-auth-b",
    ]);
  });
});
