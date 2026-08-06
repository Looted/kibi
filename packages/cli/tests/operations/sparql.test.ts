import { describe, expect, test } from "bun:test";
import { nodeNetwork } from "../../src/public/operations/node-ports.js";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";
import { sparqlRemoteSpec } from "../../src/public/operations/specs/sparql.js";
import {
  SPARQL_FIXTURE_ROWS,
  startSparqlHttpFixture,
} from "../fixtures/sparql-http-server.js";

function context(): OperationContext {
  return {
    workspaceRoot: process.cwd(),
    signal: new AbortController().signal,
    clock: () => new Date(),
    net: nodeNetwork,
  };
}

describe("shared remote SPARQL operation executor", () => {
  test("decodes SELECT bindings through the injected network port", async () => {
    // Given
    const fixture = startSparqlHttpFixture();
    try {
      // When
      const result = await sparqlRemoteSpec.execute(
        {
          endpoint: fixture.endpoint,
          query: "SELECT ?subject ?label WHERE { ?subject ?p ?label }",
          timeoutMs: 1_000,
        },
        context(),
      );

      // Then
      expect(result.structuredContent?.rows).toEqual(SPARQL_FIXTURE_ROWS);
      expect(fixture.requests).toHaveLength(1);
      expect(fixture.requests[0]).toMatchObject({
        method: "POST",
        accept: "application/sparql-results+json",
        contentType: "application/x-www-form-urlencoded;charset=UTF-8",
      });
      expect(fixture.requests[0]?.body).toBe(
        "query=SELECT+%3Fsubject+%3Flabel+WHERE+%7B+%3Fsubject+%3Fp+%3Flabel+%7D",
      );
    } finally {
      await fixture.stop();
    }
  });

  test("aborts a remote request after timeoutMs", async () => {
    // Given
    const fixture = startSparqlHttpFixture({ delayMs: 1_100 });
    try {
      // When / Then
      await expect(
        sparqlRemoteSpec.execute(
          {
            endpoint: fixture.endpoint,
            query: "SELECT * WHERE { ?s ?p ?o }",
            timeoutMs: 10,
          },
          context(),
        ),
      ).rejects.toThrow("SPARQL remote query failed");
    } finally {
      await fixture.stop();
    }
  });

  test("rejects non-HTTP endpoints before using the network port", async () => {
    // Given
    let calls = 0;
    const operationContext: OperationContext = {
      ...context(),
      net: {
        fetch: async () => {
          calls += 1;
          return Response.json({});
        },
      },
    };

    // When / Then
    await expect(
      sparqlRemoteSpec.execute(
        {
          endpoint: "file:///tmp/data.ttl",
          query: "SELECT * WHERE { ?s ?p ?o }",
        },
        operationContext,
      ),
    ).rejects.toThrow("SPARQL endpoint must be an http:// or https:// URL");
    expect(calls).toBe(0);
  });
});
