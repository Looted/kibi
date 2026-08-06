import { describe, expect, test } from "bun:test";
import {
  SPARQL_FIXTURE_ROWS,
  startSparqlHttpFixture,
} from "../fixtures/sparql-http-server.js";
import { compareResults, runCliJsonRoute, runMCPAdapter } from "./runner.js";

describe("remote SPARQL CLI and MCP parity", () => {
  test("returns identical decoded rows from a local HTTP fixture", async () => {
    // Given
    const fixture = startSparqlHttpFixture();
    const input = {
      endpoint: fixture.endpoint,
      query: "SELECT ?subject ?label WHERE { ?subject ?p ?label }",
      timeoutMs: 1_000,
    };
    try {
      // When
      const [cli, mcp] = await Promise.all([
        runCliJsonRoute(process.cwd(), "sparql-remote", input),
        runMCPAdapter(process.cwd(), "kb_sparql_remote", input),
      ]);

      // Then
      const comparison = compareResults(cli, mcp, (value) => value);
      expect(comparison.parity, comparison.diff).toBe(true);
      expect(JSON.parse(cli.stdout)).toEqual({ rows: SPARQL_FIXTURE_ROWS });
    } finally {
      await fixture.stop();
    }
  });
});
