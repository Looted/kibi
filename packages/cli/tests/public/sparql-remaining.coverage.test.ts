// implements REQ-kibi-operation-interface-parity
import { afterEach, describe, expect, test } from "bun:test";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";
import { sparqlRemoteSpec } from "../../src/public/operations/specs/sparql.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

function context(net?: OperationContext["net"]): OperationContext {
  return {
    workspaceRoot: process.cwd(),
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-05T00:00:00Z"),
    ...(net === undefined ? {} : { net }),
  };
}

describe("sparql remaining validation and decode branches", () => {
  test("rejects empty, non-HTTP, non-SELECT, and invalid timeout inputs", async () => {
    restores.push(isolateKibiEnv());
    const net = {
      fetch: async () => new Response("unused"),
    };
    await expect(
      sparqlRemoteSpec.execute(
        { endpoint: "  ", query: "SELECT * WHERE { ?s ?p ?o }" },
        context(net),
      ),
    ).rejects.toThrow("SPARQL endpoint is required");
    await expect(
      sparqlRemoteSpec.execute(
        { endpoint: "https://example.test/sparql", query: "" },
        context(net),
      ),
    ).rejects.toThrow("SPARQL query is required");
    await expect(
      sparqlRemoteSpec.execute(
        { endpoint: "not a url", query: "SELECT * WHERE { ?s ?p ?o }" },
        context(net),
      ),
    ).rejects.toThrow("SPARQL endpoint must be an http:// or https:// URL");
    await expect(
      sparqlRemoteSpec.execute(
        {
          endpoint: "ftp://example.test/sparql",
          query: "SELECT * WHERE { ?s ?p ?o }",
        },
        context(net),
      ),
    ).rejects.toThrow("SPARQL endpoint must be an http:// or https:// URL");
    await expect(
      sparqlRemoteSpec.execute(
        {
          endpoint: "https://example.test/sparql",
          query: "ASK WHERE { ?s ?p ?o }",
        },
        context(net),
      ),
    ).rejects.toThrow("SPARQL query must be a SELECT query");
    await expect(
      sparqlRemoteSpec.execute(
        {
          endpoint: "https://example.test/sparql",
          query: "SELECT * WHERE { ?s ?p ?o }",
          timeoutMs: 0,
        },
        context(net),
      ),
    ).rejects.toThrow("SPARQL timeoutMs must be a positive number");
  });

  test("rejects missing network, HTTP errors, and invalid result documents", async () => {
    restores.push(isolateKibiEnv());
    await expect(
      sparqlRemoteSpec.execute(
        {
          endpoint: "https://example.test/sparql",
          query: "SELECT * WHERE { ?s ?p ?o }",
        },
        context(),
      ),
    ).rejects.toThrow("SPARQL remote query requires a network port");

    await expect(
      sparqlRemoteSpec.execute(
        {
          endpoint: "https://example.test/sparql",
          query: "SELECT * WHERE { ?s ?p ?o }",
        },
        context({
          fetch: async () => new Response("nope", { status: 503 }),
        }),
      ),
    ).rejects.toThrow("SPARQL endpoint returned HTTP 503");

    await expect(
      sparqlRemoteSpec.execute(
        {
          endpoint: "https://example.test/sparql",
          query: "SELECT * WHERE { ?s ?p ?o }",
        },
        context({
          fetch: async () => Response.json({ results: "nope" }),
        }),
      ),
    ).rejects.toThrow("invalid result document");

    await expect(
      sparqlRemoteSpec.execute(
        {
          endpoint: "https://example.test/sparql",
          query: "SELECT * WHERE { ?s ?p ?o }",
        },
        context({
          fetch: async () =>
            Response.json({ results: { bindings: { not: "array" } } }),
        }),
      ),
    ).rejects.toThrow("invalid bindings array");

    await expect(
      sparqlRemoteSpec.execute(
        {
          endpoint: "https://example.test/sparql",
          query: "SELECT * WHERE { ?s ?p ?o }",
        },
        context({
          fetch: async () =>
            Response.json({ results: { bindings: ["not-a-record"] } }),
        }),
      ),
    ).rejects.toThrow("invalid binding");

    await expect(
      sparqlRemoteSpec.execute(
        {
          endpoint: "https://example.test/sparql",
          query: "SELECT * WHERE { ?s ?p ?o }",
        },
        context({
          fetch: async () =>
            Response.json({
              results: { bindings: [{ subject: { type: "uri" } }] },
            }),
        }),
      ),
    ).rejects.toThrow("invalid subject term");
  });
});
