// implements REQ-kibi-operation-interface-parity
export const SPARQL_FIXTURE_ROWS = [
  { subject: "https://example.test/resource/1", label: "Fixture label" },
] as const;

// implements REQ-kibi-operation-interface-parity
export type SparqlFixtureRequest = {
  readonly method: string;
  readonly accept: string | null;
  readonly contentType: string | null;
  readonly body: string;
};

// implements REQ-kibi-operation-interface-parity
export function startSparqlHttpFixture(options?: {
  readonly delayMs?: number;
  readonly status?: number;
}): {
  readonly endpoint: string;
  readonly requests: SparqlFixtureRequest[];
  readonly stop: () => Promise<void>;
} {
  const requests: SparqlFixtureRequest[] = [];
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: async (request) => {
      requests.push({
        method: request.method,
        accept: request.headers.get("accept"),
        contentType: request.headers.get("content-type"),
        body: await request.text(),
      });
      if (options?.delayMs !== undefined) {
        await Bun.sleep(options.delayMs);
      }
      if (options?.status !== undefined) {
        return new Response("fixture failure", { status: options.status });
      }
      return Response.json({
        head: { vars: ["subject", "label"] },
        results: {
          bindings: [
            {
              subject: {
                type: "uri",
                value: SPARQL_FIXTURE_ROWS[0].subject,
              },
              label: {
                type: "literal",
                value: SPARQL_FIXTURE_ROWS[0].label,
                "xml:lang": "en",
              },
            },
          ],
        },
      });
    },
  });
  return {
    endpoint: new URL("sparql", server.url).href,
    requests,
    stop: () => server.stop(true),
  };
}
