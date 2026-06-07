import { describe, expect, mock, test } from "bun:test";
import type { PrologProcess } from "kibi-cli/prolog";
import { type SparqlArgs, handleSparql } from "../../src/tools/sparql.js";

describe("MCP remote SPARQL tool handler", () => {
  test("rejects missing endpoint", async () => {
    const prolog = { query: mock() } as unknown as PrologProcess;
    const args = { query: "SELECT * WHERE { ?s ?p ?o }" } as SparqlArgs;

    await expect(handleSparql(prolog, args)).rejects.toThrow(
      "SPARQL endpoint is required",
    );
  });

  test("rejects missing query", async () => {
    const prolog = { query: mock() } as unknown as PrologProcess;
    const args = { endpoint: "https://example.org/sparql" } as SparqlArgs;

    await expect(handleSparql(prolog, args)).rejects.toThrow(
      "SPARQL query is required",
    );
  });

  test("rejects local file endpoints", async () => {
    const prolog = { query: mock() } as unknown as PrologProcess;

    await expect(
      handleSparql(prolog, {
        endpoint: "file:///tmp/kibi.ttl",
        query: "SELECT * WHERE { ?s ?p ?o }",
      }),
    ).rejects.toThrow("SPARQL endpoint must be an http:// or https:// URL");
  });

  test("rejects localhost and private network endpoints", async () => {
    const prolog = { query: mock() } as unknown as PrologProcess;

    await expect(
      handleSparql(prolog, {
        endpoint: "http://localhost:3030/sparql",
        query: "SELECT * WHERE { ?s ?p ?o }",
      }),
    ).rejects.toThrow("SPARQL endpoint must target a public remote host");

    await expect(
      handleSparql(prolog, {
        endpoint: "https://192.168.1.10/sparql",
        query: "SELECT * WHERE { ?s ?p ?o }",
      }),
    ).rejects.toThrow("SPARQL endpoint must target a public remote host");
  });

  test("rejects non-select queries", async () => {
    const prolog = { query: mock() } as unknown as PrologProcess;

    await expect(
      handleSparql(prolog, {
        endpoint: "https://example.org/sparql",
        query: "CONSTRUCT WHERE { ?s ?p ?o }",
      }),
    ).rejects.toThrow("SPARQL query must be a SELECT query");
  });

  test("calls sparql_client.pl with escaped endpoint, query, and timeout", async () => {
    let capturedGoal = "";
    const query = mock(async (goal: string) => {
      capturedGoal = goal;
      return {
        success: true,
        bindings: { JsonString: JSON.stringify({ rows: [{ s: "subject" }] }) },
      };
    });
    const prolog = { query } as unknown as PrologProcess;

    const result = await handleSparql(prolog, {
      endpoint: "https://example.org/sparql",
      query: "SELECT * WHERE { ?s ?p 'literal' }",
      timeoutMs: 5000,
    });

    expect(capturedGoal).toContain("sparql_client.pl");
    expect(capturedGoal).toContain(
      "kibi_sparql_client:remote_sparql_select_json",
    );
    expect(capturedGoal).toContain("'https://example.org/sparql'");
    expect(capturedGoal).toContain("'SELECT * WHERE { ?s ?p ''literal'' }'");
    expect(capturedGoal).toContain("[timeout(5)]");
    expect(result.structuredContent?.rows).toEqual([{ s: "subject" }]);
  });

  test("surfaces Prolog failures as readable handler errors", async () => {
    const query = mock(async () => ({
      success: false,
      bindings: {},
      error: "network unavailable",
    }));
    const prolog = { query } as unknown as PrologProcess;

    await expect(
      handleSparql(prolog, {
        endpoint: "https://example.org/sparql",
        query: "SELECT * WHERE { ?s ?p ?o }",
      }),
    ).rejects.toThrow(
      "SPARQL remote query failed: SPARQL remote query query failed: network unavailable",
    );
  });
});
