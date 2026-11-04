import { describe, expect, test } from "bun:test";
import { withContractDefaults } from "../../../../src/public/operations/catalog.js";
import type { OperationContext } from "../../../../src/public/operations/runtime-types.js";
import {
  type SparqlRemoteInput,
  sparqlRemoteSpec,
} from "../../../../src/public/operations/specs/sparql.js";
import { expectGolden } from "../../helpers/golden.js";

type Call = { url: unknown; init: RequestInit | undefined };

function net(respond: (init: RequestInit | undefined) => Promise<Response>) {
  const calls: Call[] = [];
  return {
    calls,
    port: {
      async fetch(url: string | URL, init?: RequestInit) {
        calls.push({ url, init });
        return respond(init);
      },
    },
  };
}

function json(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

function ctx(port?: unknown, signal = new AbortController().signal) {
  return { signal, net: port } as unknown as OperationContext;
}

const run = (input: unknown, context: OperationContext) =>
  sparqlRemoteSpec.execute(input as SparqlRemoteInput, context);

const SELECT = "SELECT ?s WHERE { ?s ?p ?o }";
const ENDPOINT = "https://example.test/sparql";

describe("kb_sparql_remote spec", () => {
  test("declares its contract", () => {
    expectGolden("spec-sparql-remote", withContractDefaults(sparqlRemoteSpec));
  });
});

describe("kb_sparql_remote input validation", () => {
  test.each([
    [{ query: SELECT }, "SPARQL endpoint is required"],
    [{ endpoint: 5, query: SELECT }, "SPARQL endpoint is required"],
    [{ endpoint: "  ", query: SELECT }, "SPARQL endpoint is required"],
    [{ endpoint: ENDPOINT }, "SPARQL query is required"],
    [{ endpoint: ENDPOINT, query: 1 }, "SPARQL query is required"],
    [{ endpoint: ENDPOINT, query: " " }, "SPARQL query is required"],
    [
      { endpoint: "not a url", query: SELECT },
      "SPARQL endpoint must be an http:// or https:// URL",
    ],
    [
      { endpoint: "ftp://example.test/x", query: SELECT },
      "SPARQL endpoint must be an http:// or https:// URL",
    ],
    [
      { endpoint: ENDPOINT, query: "ASK { ?s ?p ?o }" },
      "SPARQL query must be a SELECT query",
    ],
    [
      { endpoint: ENDPOINT, query: "selection" },
      "SPARQL query must be a SELECT query",
    ],
    [
      { endpoint: ENDPOINT, query: "# x\nSELECT ?s" },
      "SPARQL query must be a SELECT query",
    ],
    ...[0, -1, Number.NaN, Number.POSITIVE_INFINITY].map(
      (timeoutMs) =>
        [
          { endpoint: ENDPOINT, query: SELECT, timeoutMs },
          "SPARQL timeoutMs must be a positive number when provided",
        ] as const,
    ),
  ])("%p is rejected", async (input, message) => {
    const { calls, port } = net(() => json({}));
    await expect(run(input, ctx(port))).rejects.toThrow(new Error(message));
    expect(calls).toStrictEqual([]);
  });

  test("requires a network port", async () => {
    await expect(
      run({ endpoint: ENDPOINT, query: SELECT }, ctx()),
    ).rejects.toThrow(new Error("SPARQL remote query requires a network port"));
  });
});

describe("kb_sparql_remote execution", () => {
  test("posts the query and decodes bindings", async () => {
    const signal = new AbortController().signal;
    const { calls, port } = net(() =>
      json({
        results: {
          bindings: [
            { s: { type: "uri", value: "urn:a" }, o: { value: "1" } },
            {},
          ],
        },
      }),
    );
    const result = await run(
      { endpoint: "http://example.test/q", query: "  select ?s" },
      ctx(port, signal),
    );
    expect(result).toStrictEqual({
      content: [{ type: "text", text: "Remote SPARQL query returned 2 rows." }],
      structuredContent: { rows: [{ s: "urn:a", o: "1" }, {}] },
    });
    expect(calls).toHaveLength(1);
    const [{ url, init }] = calls as [Call];
    expect(url).toBeInstanceOf(URL);
    expect(String(url)).toBe("http://example.test/q");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toStrictEqual({
      accept: "application/sparql-results+json",
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
    });
    expect(String(init?.body)).toBe("query=++select+%3Fs");
    expect(init?.signal).toBe(signal);
  });

  test("uses the singular for one row and accepts an empty result", async () => {
    const one = net(() =>
      json({ results: { bindings: [{ x: { value: "v" } }] } }),
    );
    expect(
      (await run({ endpoint: ENDPOINT, query: SELECT }, ctx(one.port))).content,
    ).toStrictEqual([
      { type: "text", text: "Remote SPARQL query returned 1 row." },
    ]);
    const none = net(() => json({ results: { bindings: [] } }));
    expect(
      (await run({ endpoint: ENDPOINT, query: SELECT }, ctx(none.port)))
        .content,
    ).toStrictEqual([
      { type: "text", text: "Remote SPARQL query returned 0 rows." },
    ]);
  });

  test("combines the caller signal with a timeout", async () => {
    const aborted = new AbortController();
    aborted.abort();
    const { calls, port } = net(() => json({ results: { bindings: [] } }));
    await run(
      { endpoint: ENDPOINT, query: SELECT, timeoutMs: 5000 },
      ctx(port, aborted.signal),
    );
    const signal = calls[0]?.init?.signal as AbortSignal;
    expect(signal).not.toBe(aborted.signal);
    expect(signal.aborted).toBe(true);
  });

  test("rounds the timeout up to whole seconds", async () => {
    const started = Date.now();
    const { port } = net(
      (init) =>
        new Promise((_resolve, reject) => {
          const signal = init?.signal as AbortSignal;
          expect(signal.aborted).toBe(false);
          signal.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );
    await expect(
      run({ endpoint: ENDPOINT, query: SELECT, timeoutMs: 1 }, ctx(port)),
    ).rejects.toThrow(new Error("SPARQL remote query failed: aborted"));
    const elapsed = Date.now() - started;
    expect(elapsed).toBeGreaterThanOrEqual(900);
    expect(elapsed).toBeLessThan(1900);
  });

  test("wraps HTTP failures", async () => {
    const { port } = net(() => json({}, 503));
    await expect(
      run({ endpoint: ENDPOINT, query: SELECT }, ctx(port)),
    ).rejects.toThrow(
      new Error(
        "SPARQL remote query failed: SPARQL endpoint returned HTTP 503",
      ),
    );
  });

  test("wraps non-Error failures", async () => {
    const { port } = net(() => Promise.reject("socket closed"));
    await expect(
      run({ endpoint: ENDPOINT, query: SELECT }, ctx(port)),
    ).rejects.toThrow(new Error("SPARQL remote query failed: socket closed"));
  });

  test.each([
    [null, "SPARQL endpoint returned an invalid result document"],
    [[], "SPARQL endpoint returned an invalid result document"],
    ["text", "SPARQL endpoint returned an invalid result document"],
    [{}, "SPARQL endpoint returned an invalid result document"],
    [{ results: null }, "SPARQL endpoint returned an invalid result document"],
    [{ results: [] }, "SPARQL endpoint returned an invalid result document"],
    [{ results: {} }, "SPARQL endpoint returned an invalid bindings array"],
    [
      { results: { bindings: {} } },
      "SPARQL endpoint returned an invalid bindings array",
    ],
    [
      { results: { bindings: [null] } },
      "SPARQL endpoint returned an invalid binding",
    ],
    [
      { results: { bindings: [[]] } },
      "SPARQL endpoint returned an invalid binding",
    ],
    [
      { results: { bindings: [{ s: "x" }] } },
      "SPARQL endpoint returned an invalid s term",
    ],
    [
      { results: { bindings: [{ s: [] }] } },
      "SPARQL endpoint returned an invalid s term",
    ],
    [
      { results: { bindings: [{ s: { value: 1 } }] } },
      "SPARQL endpoint returned an invalid s term",
    ],
  ])("rejects result document %p", async (body, message) => {
    const { port } = net(() => json(body));
    await expect(
      run({ endpoint: ENDPOINT, query: SELECT }, ctx(port)),
    ).rejects.toThrow(new Error(`SPARQL remote query failed: ${message}`));
  });
});
