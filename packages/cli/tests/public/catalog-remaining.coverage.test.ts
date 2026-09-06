// implements REQ-kibi-operation-interface-parity
import { afterEach, describe, expect, test } from "bun:test";
import { getSpec } from "../../src/public/operations/catalog.js";
import type { OperationName } from "../../src/public/operations/types.js";

afterEach(() => {
  process.exitCode = 0;
});

describe("operation catalog leftover unknown spec", () => {
  test("throws for an unknown operation name", () => {
    expect(() => getSpec("not_a_real_operation" as OperationName)).toThrow(
      /Unknown Kibi operation/,
    );
    expect(getSpec("kb_status").name).toBe("kb_status");
  });
});
