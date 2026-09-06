import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ContractIntegrityError } from "../contracts/common";
import {
  assertRunLockMatches,
  parseRunLockText,
} from "../contracts/run-lock";

afterEach(() => {
  if (process.exitCode === 1) process.exitCode = 0;
});

const FIXTURE = join(import.meta.dir, "fixtures/valid-run-lock.json");

describe("run-lock remaining dirty and hash mismatch guards", () => {
  test("rejects a dirty expected lock", () => {
    const lock = parseRunLockText(readFileSync(FIXTURE, "utf8"));
    const dirty = {
      ...lock,
      dirtyState: { isDirty: true, diffHash: "c".repeat(64) },
    };
    expect(() => assertRunLockMatches(dirty, lock)).toThrow(
      ContractIntegrityError,
    );
  });

  test("rejects an immutable hash mismatch", () => {
    const lock = parseRunLockText(readFileSync(FIXTURE, "utf8"));
    const other = {
      ...lock,
      catalogHash: "d".repeat(64),
    };
    expect(() => assertRunLockMatches(lock, other)).toThrow(
      ContractIntegrityError,
    );
  });
});
