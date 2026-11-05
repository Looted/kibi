import { describe, expect, test } from "bun:test";
import {
  MIGRATION_PLAN_REFUSED,
  MigrationActionRefusedError,
} from "../../../src/operations/planning/migration-refusal.js";

describe("migration refusal", () => {
  test("the refusal error carries its name and message", () => {
    const error = new MigrationActionRefusedError("planned file exists");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("MigrationActionRefusedError");
    expect(error.message).toBe("planned file exists");
  });

  test("the refused envelope code is stable", () => {
    expect(MIGRATION_PLAN_REFUSED).toBe("MIGRATION_PLAN_REFUSED");
  });
});
