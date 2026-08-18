import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { PrologProcess } from "kibi-cli/prolog";
import { handleKbSearch } from "../../src/tools/search.js";

const ABOVE_FORMER_TRANSPORT_CAPACITY_COUNT = 12_000;
const TRANSPORT_PADDING = "x".repeat(128);

function serializedBroadSearchEntities(count: number): string {
  return `[${Array.from(
    { length: count },
    (_, index) =>
      `[REQ-skillopt-${index + 1},req,[title="skillopt ${TRANSPORT_PADDING}",status=open]]`,
  ).join(",")}]`;
}

describe("MCP search tool handler", () => {
  let workspaceRoot: string;
  const originalWorkspace = process.env.KIBI_WORKSPACE;

  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "kibi-mcp-search-"),
    );
    process.env.KIBI_WORKSPACE = workspaceRoot;
    await fs.mkdir(path.join(workspaceRoot, ".kb", "requirements"), {
      recursive: true,
    });
  });

  afterEach(async () => {
    if (originalWorkspace === undefined) {
      Reflect.deleteProperty(process.env, "KIBI_WORKSPACE");
    } else {
      process.env.KIBI_WORKSPACE = originalWorkspace;
    }
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  });

  test("ranks exact title matches ahead of markdown body matches", async () => {
    await fs.writeFile(
      path.join(workspaceRoot, ".kb", "requirements", "REQ-001.md"),
      "---\nid: REQ-001\ntitle: OAuth login flow\nstatus: open\n---\n\nThe login body mentions approval.\n",
    );

    await fs.writeFile(
      path.join(workspaceRoot, ".kb", "requirements", "REQ-002.md"),
      "---\nid: REQ-002\ntitle: Session refresh\nstatus: open\n---\n\nThis markdown body talks about OAuth login flow in prose.\n",
    );

    const query = mock(async () => ({
      success: true,
      bindings: {
        Results:
          '[[REQ-001,req,[title="OAuth login flow",status=open,source=".kb/requirements/REQ-001.md"]],[REQ-002,req,[title="Session refresh",status=open,source=".kb/requirements/REQ-002.md"]]]',
      },
    }));

    const prolog = { query } as unknown as PrologProcess;
    const result = await handleKbSearch(prolog, { query: "OAuth login flow" });

    expect(result.structuredContent?.count).toBe(2);
    expect(result.structuredContent?.results[0]?.entity.id).toBe("REQ-001");
    expect(result.structuredContent?.results[0]?.reasons).toContain(
      "exact title match",
    );
  });

  test("searches markdown bodies but does not search raw code bodies", async () => {
    await fs.writeFile(
      path.join(workspaceRoot, ".kb", "requirements", "REQ-003.md"),
      "---\nid: REQ-003\ntitle: Searchable markdown\nstatus: open\nsource: .kb/requirements/REQ-003.md\n---\n\nThe body mentions latent discovery token.\n",
    );

    await fs.mkdir(path.join(workspaceRoot, "src"), { recursive: true });
    await fs.writeFile(
      path.join(workspaceRoot, "src", "hidden.ts"),
      "export const secret = 'latent discovery token';\n",
    );

    const query = mock(async () => ({
      success: true,
      bindings: {
        Results:
          '[[REQ-003,req,[title="Searchable markdown",status=open,source=".kb/requirements/REQ-003.md"]],[SYM-hidden,symbol,[title="hidden",status=active,source="src/hidden.ts"]]]',
      },
    }));

    const prolog = { query } as unknown as PrologProcess;
    const result = await handleKbSearch(prolog, {
      query: "latent discovery token",
    });

    expect(result.structuredContent?.count).toBe(1);
    expect(result.structuredContent?.results[0]?.entity.id).toBe("REQ-003");
  });

  test("falls back to metadata matches when markdown source is missing", async () => {
    const query = mock(async () => ({
      success: true,
      bindings: {
        Results:
          '[[REQ-404,req,[title="Missing source fallback",status=open,source=".kb/requirements/MISSING.md"]]]',
      },
    }));

    const prolog = { query } as unknown as PrologProcess;
    const result = await handleKbSearch(prolog, {
      query: "Missing source fallback",
    });

    expect(result.structuredContent?.count).toBe(1);
    expect(result.structuredContent?.results[0]?.entity.id).toBe("REQ-404");
    expect(result.content[0]?.text).toContain("REQ-404");
  });

  test("returns improved ranking for broad synthetic corpus queries", async () => {
    await fs.writeFile(
      path.join(
        workspaceRoot,
        ".kb",
        "requirements",
        "REQ-search-revenuecat-entitlement.md",
      ),
      "---\nid: REQ-search-revenuecat-entitlement\ntitle: RevenueCat entitlement restore\nstatus: open\n---\n\nPremium entitlement recovery for logged out users.\n",
    );
    await fs.writeFile(
      path.join(
        workspaceRoot,
        ".kb",
        "requirements",
        "FACT-search-apple-signin-revenuecat-recovery.md",
      ),
      "---\nid: FACT-search-apple-signin-revenuecat-recovery\ntitle: Apple Sign-In RevenueCat recovery\nstatus: open\n---\n\nApple Sign-In authentication premium recovery RevenueCat entitlement logged out unable to log in.\n",
    );
    await fs.writeFile(
      path.join(
        workspaceRoot,
        ".kb",
        "requirements",
        "FACT-search-unrelated-sync-feedback.md",
      ),
      "---\nid: FACT-search-unrelated-sync-feedback\ntitle: Sync feedback note\nstatus: open\n---\n\nAn unrelated sync feedback artifact.\n",
    );

    const query = mock(async () => ({
      success: true,
      bindings: {
        Results:
          '[[FACT-search-apple-signin-revenuecat-recovery,req,[title="Apple Sign-In RevenueCat recovery",status=open,source=".kb/requirements/FACT-search-apple-signin-revenuecat-recovery.md"]],[REQ-search-revenuecat-entitlement,req,[title="RevenueCat entitlement restore",status=open,source=".kb/requirements/REQ-search-revenuecat-entitlement.md"]],[FACT-search-unrelated-sync-feedback,req,[title="Sync feedback note",status=open,source=".kb/requirements/FACT-search-unrelated-sync-feedback.md"]]]',
      },
    }));

    const prolog = { query } as unknown as PrologProcess;
    const result = await handleKbSearch(prolog, {
      query:
        "Apple Sign-In authentication premium recovery RevenueCat entitlement logged out unable to log in",
      limit: 10,
    });

    expect(result.structuredContent?.results[0]?.entity.id).toBe(
      "FACT-search-apple-signin-revenuecat-recovery",
    );
    expect(result.structuredContent?.results.map((r) => r.entity.id)).toContain(
      "REQ-search-revenuecat-entitlement",
    );
    expect(
      result.structuredContent?.results.some(
        (r) => r.entity.id === "FACT-search-unrelated-sync-feedback",
      ),
    ).toBe(false);
  });

  test("broad search returns ranked results above former threshold through MCP", async () => {
    // Given
    const query = mock(async () => ({
      success: true,
      bindings: {
        Results: serializedBroadSearchEntities(
          ABOVE_FORMER_TRANSPORT_CAPACITY_COUNT,
        ),
      },
    }));
    const prolog = { query } as unknown as PrologProcess;

    // When
    const result = await handleKbSearch(prolog, {
      query: "skillopt",
      limit: 20,
      offset: 0,
    });

    // Then
    expect(result.structuredContent?.count).toBe(
      ABOVE_FORMER_TRANSPORT_CAPACITY_COUNT,
    );
    expect(result.structuredContent?.results).toHaveLength(20);
    expect(result.structuredContent?.results[0]?.entity.id).toBe(
      "REQ-skillopt-1",
    );
  });

  test("broad search reports bounded overflow and Prolog failure through MCP", async () => {
    // Given
    const query = mock(async () => ({
      success: false,
      bindings: {},
      error:
        "Query exceeded bounded Prolog output capacity (ENOBUFS); narrow the operation or reduce stored entity size",
    }));
    const prolog = { query } as unknown as PrologProcess;

    // When
    let errorMessage = "";
    try {
      await handleKbSearch(prolog, {
        query: "skillopt",
        limit: 20,
        offset: 0,
      });
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }

    // Then
    expect(errorMessage).toContain(
      "Search execution failed: Query exceeded bounded Prolog output capacity (ENOBUFS)",
    );
  });

  test("returns no results for no-signal queries", async () => {
    const query = mock(async () => ({
      success: true,
      bindings: { Results: "[]" },
    }));

    const prolog = { query } as unknown as PrologProcess;
    const result = await handleKbSearch(prolog, {
      query: "to in out log logged unable",
    });

    expect(result.structuredContent?.count).toBe(0);
    expect(result.structuredContent?.results).toHaveLength(0);
    expect(result.content[0]?.text).toContain("No search results");
  });
});
