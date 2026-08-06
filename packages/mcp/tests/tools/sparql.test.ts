import { describe, expect, test } from "bun:test";
import {
  SPARQL_FIXTURE_ROWS,
  startSparqlHttpFixture,
} from "../../../cli/tests/fixtures/sparql-http-server.js";
import { type SparqlArgs, handleSparql } from "../../src/tools/sparql.js";

describe("MCP remote SPARQL tool handler", () => {
  test("rejects missing endpoint", async () => {
    const args = { query: "SELECT * WHERE { ?s ?p ?o }" } as SparqlArgs;

    await expect(handleSparql(args)).rejects.toThrow(
      "SPARQL endpoint is required",
    );
  });

  test("rejects missing query", async () => {
    const args = { endpoint: "https://example.org/sparql" } as SparqlArgs;

    await expect(handleSparql(args)).rejects.toThrow(
      "SPARQL query is required",
    );
  });

  test("rejects local file endpoints", async () => {
    await expect(
      handleSparql({
        endpoint: "file:///tmp/kibi.ttl",
        query: "SELECT * WHERE { ?s ?p ?o }",
      }),
    ).rejects.toThrow("SPARQL endpoint must be an http:// or https:// URL");
  });

  test("rejects malformed endpoint URLs as non-remote", async () => {
    await expect(
      handleSparql({
        endpoint: "not a url",
        query: "SELECT * WHERE { ?s ?p ?o }",
      }),
    ).rejects.toThrow("SPARQL endpoint must be an http:// or https:// URL");
  });

  test("rejects non-select queries", async () => {
    await expect(
      handleSparql({
        endpoint: "https://example.org/sparql",
        query: "CONSTRUCT WHERE { ?s ?p ?o }",
      }),
    ).rejects.toThrow("SPARQL query must be a SELECT query");
  });

  test("decodes a local HTTP fixture without using Prolog", async () => {
    const fixture = startSparqlHttpFixture();
    try {
      const result = await handleSparql({
        endpoint: fixture.endpoint,
        query: "SELECT ?subject ?label WHERE { ?subject ?p ?label }",
        timeoutMs: 5_000,
      });

      expect(result.structuredContent?.rows).toEqual(SPARQL_FIXTURE_ROWS);
    } finally {
      await fixture.stop();
    }
  });

  test("surfaces HTTP failures as readable handler errors", async () => {
    const fixture = startSparqlHttpFixture({ status: 503 });
    try {
      await expect(
        handleSparql({
          endpoint: fixture.endpoint,
          query: "SELECT * WHERE { ?s ?p ?o }",
        }),
      ).rejects.toThrow(
        "SPARQL remote query failed: SPARQL endpoint returned HTTP 503",
      );
    } finally {
      await fixture.stop();
    }
  });
});
