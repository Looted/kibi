import { describe, test } from "bun:test";
import relationshipSchema from "../../src/public/schemas/relationship.js";
import { expectGolden } from "./helpers/golden.js";

describe("relationship schema", () => {
  test("matches the published contract", () => {
    expectGolden("relationship-schema", relationshipSchema);
  });
});
