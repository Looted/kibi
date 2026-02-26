import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PrologProcess } from "kibi-cli/prolog";
import { handleSuggestSharedFacts } from "../../src/tools/suggest-shared-facts.js";
import { handleKbUpsert } from "../../src/tools/upsert.js";

describe("MCP Suggest Shared Facts Tool Handler", () => {
  let prolog: PrologProcess;
  let testKbPath: string;

  beforeAll(async () => {
    testKbPath = await fs.mkdtemp(path.join(os.tmpdir(), "kibi-mcp-facts-"));

    prolog = new PrologProcess();
    await prolog.start();

    await prolog.query(
      "set_prolog_flag(answer_write_options, [max_depth(0), spacing(next_argument)])",
    );

    const attachResult = await prolog.query(`kb_attach('${testKbPath}')`);
    expect(attachResult.success).toBe(true);
  });

  afterAll(async () => {
    if (prolog?.isRunning()) {
      await prolog.query("kb_detach");
      await prolog.terminate();
    }

    await fs.rm(testKbPath, { recursive: true, force: true });
  });

  test("should return empty suggestions for empty KB", async () => {
    const result = await handleSuggestSharedFacts(prolog, {});

    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe("text");
    expect(result.structuredContent).toBeDefined();
    expect(result.structuredContent?.suggestions).toEqual([]);
    expect(result.structuredContent?.count).toBe(0);
  });

  test("should suggest shared concepts from multiple requirements", async () => {
    // Create two requirements with shared terminology in titles
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-auth-001",
      properties: {
        title: "User Authentication with Session Token for security",
        status: "active",
        source: "test://facts-test",
      },
    });

    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-auth-002",
      properties: {
        title: "Session Management with Session Token validation",
        status: "active",
        source: "test://facts-test",
      },
    });

    const result = await handleSuggestSharedFacts(prolog, { min_frequency: 2 });

    expect(result.structuredContent).toBeDefined();
    expect(result.structuredContent?.count).toBeGreaterThan(0);

    // Check that suggestions are returned
    const suggestions = result.structuredContent?.suggestions || [];
    expect(suggestions.length).toBeGreaterThan(0);

    // Each suggestion should have concept, mentions, and requirements
    for (const suggestion of suggestions) {
      expect(suggestion.concept).toBeDefined();
      expect(suggestion.mentions).toBeGreaterThanOrEqual(2);
      expect(suggestion.requirements.length).toBeGreaterThanOrEqual(2);
    }
  });

  test("should respect min_frequency parameter", async () => {
    // Create requirements with different terminology frequencies
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-freq-001",
      properties: {
        title: "Requirement One with UniqueTerm only once",
        status: "active",
        source: "test://facts-test",
      },
    });

    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-freq-002",
      properties: {
        title: "Requirement Two different content",
        status: "active",
        source: "test://facts-test",
      },
    });

    // With min_frequency of 3, should not find any shared concepts
    const result = await handleSuggestSharedFacts(prolog, { min_frequency: 3 });

    expect(result.structuredContent?.suggestions).toEqual([]);
  });

  test("should exclude existing facts from suggestions", async () => {
    // Create a fact
    await handleKbUpsert(prolog, {
      type: "fact",
      id: "fact-existing-001",
      properties: {
        title: "Existing Fact about authentication",
        status: "active",
        source: "test://facts-test",
      },
    });

    // Create requirements that reference the existing fact concept
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-existing-001",
      properties: {
        title: "Auth Requirement One implementation",
        status: "active",
        source: "test://facts-test",
      },
    });

    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-existing-002",
      properties: {
        title: "Auth Requirement Two validation",
        status: "active",
        source: "test://facts-test",
      },
    });

    const result = await handleSuggestSharedFacts(prolog, { min_frequency: 2 });

    // Existing facts should not appear in suggestions
    const existingFactSuggestion = result.structuredContent?.suggestions.find(
      (s) => s.concept.toLowerCase().includes("existing fact"),
    );
    expect(existingFactSuggestion).toBeUndefined();
  });

  test("should return suggestions sorted by frequency", async () => {
    // Create requirements with repeated terms
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-sort-001",
      properties: {
        title: "Alpha Beta Alpha Beta Alpha",
        status: "active",
        source: "test://facts-test",
      },
    });

    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-sort-002",
      properties: {
        title: "Alpha Beta",
        status: "active",
        source: "test://facts-test",
      },
    });

    const result = await handleSuggestSharedFacts(prolog, { min_frequency: 2 });

    const suggestions = result.structuredContent?.suggestions || [];
    if (suggestions.length >= 2) {
      // Suggestions should be sorted by mentions (descending)
      for (let i = 0; i < suggestions.length - 1; i++) {
        expect(suggestions[i].mentions).toBeGreaterThanOrEqual(
          suggestions[i + 1].mentions,
        );
      }
    }
  });
});
