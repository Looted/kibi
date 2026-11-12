import { describe, expect, test } from "bun:test";
import {
  LATEST_KB_SCHEMA_VERSION,
  getSchemaVersionStatus,
  normalizeSchemaVersion,
} from "../../src/utils/schema-version.js";

const MISSING = {
  status: "missing",
  currentVersion: null,
  latestVersion: LATEST_KB_SCHEMA_VERSION,
  needsMigration: true,
  warning:
    "KB schemaVersion is missing; the repository should be initialized or migrated.",
};
const INVALID = {
  ...MISSING,
  status: "invalid",
  warning:
    "KB schemaVersion is invalid; run 'kibi migrate' to plan the repair.",
};

describe("schema version status", () => {
  test("the latest schema is 14", () => {
    expect(LATEST_KB_SCHEMA_VERSION).toBe(14);
  });

  test("normalizes integers and integer strings only", () => {
    expect(normalizeSchemaVersion(undefined)).toBeNull();
    expect(normalizeSchemaVersion(null)).toBeNull();
    expect(normalizeSchemaVersion(3)).toBe(3);
    expect(normalizeSchemaVersion(3.5)).toBeNull();
    expect(normalizeSchemaVersion(" 4 ")).toBe(4);
    expect(normalizeSchemaVersion("  ")).toBeNull();
    expect(normalizeSchemaVersion("4.5")).toBeNull();
    expect(normalizeSchemaVersion("x")).toBeNull();
  });

  test("a missing version needs migration", () => {
    expect<unknown>(getSchemaVersionStatus()).toStrictEqual(MISSING);
    expect<unknown>(getSchemaVersionStatus(null)).toStrictEqual(MISSING);
    expect<unknown>(
      getSchemaVersionStatus({ schemaVersion: undefined }),
    ).toStrictEqual(MISSING);
  });

  test("a recorded but unusable version is invalid", () => {
    expect<unknown>(
      getSchemaVersionStatus({ schemaVersion: null }),
    ).toStrictEqual(INVALID);
    expect<unknown>(
      getSchemaVersionStatus({ schemaVersion: "x" }),
    ).toStrictEqual(INVALID);
  });

  test("older, current and newer versions", () => {
    const latest = LATEST_KB_SCHEMA_VERSION;
    expect(getSchemaVersionStatus({ schemaVersion: latest - 1 })).toStrictEqual(
      {
        status: "older",
        currentVersion: latest - 1,
        latestVersion: latest,
        needsMigration: true,
        warning: `KB schemaVersion ${latest - 1} is older than the latest version ${latest}; run 'kibi migrate' to plan the upgrade.`,
      },
    );
    expect(getSchemaVersionStatus({ schemaVersion: latest })).toStrictEqual({
      status: "current",
      currentVersion: latest,
      latestVersion: latest,
      needsMigration: false,
      warning: null,
    });
    expect(getSchemaVersionStatus({ schemaVersion: latest + 1 })).toStrictEqual(
      {
        status: "newer",
        currentVersion: latest + 1,
        latestVersion: latest,
        needsMigration: false,
        warning: `KB schemaVersion ${latest + 1} is newer than the latest supported version ${latest}.`,
      },
    );
  });
});
