import { describe, expect, test } from "bun:test";
import { projectEntityProperties } from "../../../src/operations/mutation/entity-projection.js";
import { RELATIONSHIP_TYPES } from "../../../src/operations/mutation/relationships.js";

describe("projectEntityProperties", () => {
  test("drops id, type and every relationship projection", () => {
    const entity: Record<string, unknown> = {
      id: "REQ-1",
      type: "req",
      title: "Title",
      status: "open",
    };
    for (const type of RELATIONSHIP_TYPES) entity[type] = ["X"];
    expect(projectEntityProperties(entity)).toStrictEqual({
      title: "Title",
      status: "open",
    });
  });

  test("keeps authored keys that only resemble relationship names", () => {
    expect(
      projectEntityProperties({ depends: 1, implements_note: "n" }),
    ).toStrictEqual({ depends: 1, implements_note: "n" });
  });
});
