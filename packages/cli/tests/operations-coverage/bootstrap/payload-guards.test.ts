import { describe, expect, test } from "bun:test";
import { pluginOffers } from "../../../src/operations/bootstrap/plugin-offers.js";
import { validateBootstrapPayload } from "../../../src/operations/bootstrap/validation.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";

describe("bootstrap payload guards", () => {
  test("rejects relationships that are not an array", () => {
    expect(() =>
      validateBootstrapPayload(
        { id: "REQ-1", type: "req", relationships: "none" },
        new Date(),
      ),
    ).toThrow("Relationship validation failed: relationships must be an array");
  });

  test("offers nothing when the requirements lane cannot be listed", async () => {
    const context = {
      workspaceRoot: "/nonexistent-kibi-workspace",
      fs: {
        glob: async () => {
          throw new Error("unreadable");
        },
      },
    } as unknown as OperationContext;
    expect(await pluginOffers(context, [])).toStrictEqual([]);
  });
});
