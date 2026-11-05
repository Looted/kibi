import { describe, test } from "bun:test";
import entitySchema from "../../src/public/schemas/entity.js";
import { expectGolden } from "./helpers/golden.js";

describe("entity schema", () => {
  test("matches the published contract", () => {
    expectGolden("entity-schema", entitySchema);
  });
});
