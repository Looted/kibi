import { expect } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const GOLDEN_DIR = path.join(import.meta.dir, "..", "golden");

function toJson(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, entry: unknown) =>
      typeof entry === "function" ? `[function ${entry.name}]` : entry,
    ),
  );
}

/**
 * Compare a value with its committed JSON golden file. Set
 * KIBI_UPDATE_GOLDEN=1 to rewrite the file from the current value.
 */
export function expectGolden(name: string, value: unknown): void {
  const file = path.join(GOLDEN_DIR, `${name}.golden.json`);
  const actual = toJson(value);
  if (process.env.KIBI_UPDATE_GOLDEN === "1") {
    writeFileSync(file, `${JSON.stringify(actual, null, 2)}\n`);
  }
  expect(actual).toStrictEqual(JSON.parse(readFileSync(file, "utf8")));
}
