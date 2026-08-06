import { expect, test } from "bun:test";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const MAX_PURE_LINES = 250;

test("Todo-1 preflight modules stay within the focused size gate", async () => {
  // Given
  const root = join(import.meta.dir, "..");
  const files = (await readdir(root, { recursive: true }))
    .filter((path) => path.endsWith(".ts") && path.includes("preflight"))
    .sort();
  const counts = await Promise.all(
    files.map(async (path) => {
      const source = await readFile(join(root, path), "utf8");
      const pureLines = source
        .split("\n")
        .filter(
          (line) => line.trim() !== "" && !line.trimStart().startsWith("//"),
        ).length;
      return { path, pureLines };
    }),
  );

  // When
  const oversized = counts.filter((entry) => entry.pureLines >= MAX_PURE_LINES);

  // Then
  expect(oversized).toEqual([]);
});
