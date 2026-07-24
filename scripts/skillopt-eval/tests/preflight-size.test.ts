import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const MAX_PURE_LINES = 250;
const FILES = [
  "preflight-host.ts",
  "tests/preflight.test.ts",
  "tests/preflight-fixture.ts",
  "legacy-preflight.ts",
] as const;

test("Todo-1 preflight modules stay within the focused size gate", async () => {
  // Given
  const counts = await Promise.all(
    FILES.map(async (path) => {
      const source = await readFile(join(import.meta.dir, "..", path), "utf8");
      const pureLines = source
        .split("\n")
        .filter(
          (line) => line.trim() !== "" && !line.trimStart().startsWith("//"),
        ).length;
      return { path, pureLines };
    }),
  );

  // When
  const oversized = counts.filter((entry) => entry.pureLines > MAX_PURE_LINES);

  // Then
  expect(oversized).toEqual([]);
});
