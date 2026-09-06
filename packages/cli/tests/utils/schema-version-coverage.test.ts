// implements REQ-003
import { describe, expect, test } from "bun:test";
import {
  LATEST_KB_SCHEMA_VERSION,
  getSchemaVersionStatus,
  normalizeSchemaVersion,
} from "../../src/utils/schema-version.js";

describe("schema version helpers", () => {
  test("normalizes missing, numeric, and string versions", () => {
    expect(normalizeSchemaVersion(undefined)).toBeNull();
    expect(normalizeSchemaVersion(null)).toBeNull();
    expect(normalizeSchemaVersion(1.5)).toBeNull();
    expect(normalizeSchemaVersion(4)).toBe(4);
    expect(normalizeSchemaVersion("")).toBeNull();
    expect(normalizeSchemaVersion("  ")).toBeNull();
    expect(normalizeSchemaVersion("5")).toBe(5);
    expect(normalizeSchemaVersion("nope")).toBeNull();
  });

  test("classifies missing, invalid, older, current, and newer schemas", () => {
    expect(getSchemaVersionStatus(undefined).status).toBe("missing");
    expect(getSchemaVersionStatus(null).status).toBe("missing");
    expect(getSchemaVersionStatus({ schemaVersion: "bad" }).status).toBe(
      "invalid",
    );
    expect(getSchemaVersionStatus({ schemaVersion: 1 }).status).toBe("older");
    expect(
      getSchemaVersionStatus({ schemaVersion: LATEST_KB_SCHEMA_VERSION }).status,
    ).toBe("current");
    expect(
      getSchemaVersionStatus({ schemaVersion: LATEST_KB_SCHEMA_VERSION + 1 })
        .status,
    ).toBe("newer");
    expect(getSchemaVersionStatus({ schemaVersion: 1 }).needsMigration).toBe(
      true,
    );
    expect(
      getSchemaVersionStatus({ schemaVersion: LATEST_KB_SCHEMA_VERSION })
        .warning,
    ).toBeNull();
  });
});
