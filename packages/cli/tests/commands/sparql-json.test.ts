import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
import {
  SPARQL_FIXTURE_ROWS,
  startSparqlHttpFixture,
} from "../fixtures/sparql-http-server.js";

describe("sparql-remote JSON command adapter", () => {
  test("accepts endpoint and query through --input stdin", async () => {
    // Given
    const fixture = startSparqlHttpFixture();
    const kibiBin = fileURLToPath(new URL("../../bin/kibi", import.meta.url));
    try {
      // When
      const child = Bun.spawn(
        ["bun", "run", kibiBin, "sparql-remote", "--input", "-"],
        {
          cwd: process.cwd(),
          stdin: new Blob([
            JSON.stringify({
              endpoint: fixture.endpoint,
              query: "SELECT ?subject ?label WHERE { ?subject ?p ?label }",
            }),
          ]),
          stdout: "pipe",
          stderr: "pipe",
        },
      );
      const [exitCode, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ]);

      // Then
      expect(exitCode, stderr).toBe(0);
      expect(JSON.parse(stdout).data).toEqual({ rows: SPARQL_FIXTURE_ROWS });
    } finally {
      await fixture.stop();
    }
  });
});
