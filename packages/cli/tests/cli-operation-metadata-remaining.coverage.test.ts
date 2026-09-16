// implements REQ-kibi-operation-interface-parity
import { afterEach, describe, expect, test } from "bun:test";
import { getCliOperationMetadata } from "../src/cli-operation-metadata.js";
import type { OperationName } from "../src/public/operations/types.js";

afterEach(() => {
  process.exitCode = 0;
});

describe("cli operation metadata leftover unknown name", () => {
  test("throws for an operation name that is not in the CLI catalog", () => {
    expect(() =>
      getCliOperationMetadata("not_a_real_operation" as OperationName),
    ).toThrow(/Unknown Kibi CLI operation/);
    expect(getCliOperationMetadata("kb_status").name).toBe("kb_status");
  });
});
