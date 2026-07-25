import { expect, test } from "bun:test";
import { join } from "node:path";

test("preflight compatibility runner supports the documented focused pattern", async () => {
  // Given
  const runner = join(import.meta.dir, "..", "test-preflight.ts");

  // When
  const child = Bun.spawn(
    [
      "bun",
      "run",
      runner,
      "--test-name-pattern",
      "preflight (accepts qualified host|rejects every unsupported primitive before spawn)",
    ],
    { stdout: "ignore", stderr: "ignore" },
  );

  // Then
  expect(await child.exited).toBe(0);
}, 15_000);
