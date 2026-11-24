import { describe, expect, test } from "bun:test";
import { validateBootstrapPayload } from "../../../src/operations/bootstrap/validation.js";

describe("bootstrap payload guards", () => {
  test("rejects relationships that are not an array", () => {
    expect(() =>
      validateBootstrapPayload(
        { id: "REQ-1", type: "req", relationships: "none" },
        new Date(),
      ),
    ).toThrow("Relationship validation failed: relationships must be an array");
  });
});
