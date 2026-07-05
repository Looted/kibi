import { afterEach, describe, expect, test } from "bun:test";
import {
  getBranchOverride,
  getKbPlPathOverride,
  isCliDebugEnabled,
  isCliTraceEnabled,
  isCliTraceOrDebugEnabled,
  isPrologDebugEnabled,
} from "../src/env.js";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("cli env helpers", () => {
  test("getBranchOverride returns trimmed branch override", () => {
    process.env.KIBI_BRANCH = "  feature/test  ";
    expect(getBranchOverride()).toBe("feature/test");

    process.env.KIBI_BRANCH = " ";
    expect(getBranchOverride()).toBeUndefined();

    process.env.KIBI_BRANCH = undefined;
    expect(getBranchOverride()).toBeUndefined();
  });

  test("getKbPlPathOverride returns kb.pl override", () => {
    process.env.KIBI_KB_PL_PATH = "/tmp/kb.pl";
    expect(getKbPlPathOverride()).toBe("/tmp/kb.pl");

    process.env.KIBI_KB_PL_PATH = "";
    expect(getKbPlPathOverride()).toBe("");

    process.env.KIBI_KB_PL_PATH = undefined;
    expect(getKbPlPathOverride()).toBeUndefined();
  });

  test("debug and trace helpers reflect env flags", () => {
    process.env.KIBI_DEBUG = "";
    process.env.KIBI_TRACE = "";
    process.env.KIBI_PROLOG_DEBUG = "";

    expect(isCliDebugEnabled()).toBe(false);
    expect(isCliTraceEnabled()).toBe(false);
    expect(isCliTraceOrDebugEnabled()).toBe(false);
    expect(isPrologDebugEnabled()).toBe(false);

    process.env.KIBI_DEBUG = "1";
    expect(isCliDebugEnabled()).toBe(true);
    expect(isCliTraceOrDebugEnabled()).toBe(true);

    process.env.KIBI_DEBUG = "";
    process.env.KIBI_TRACE = "1";
    process.env.KIBI_PROLOG_DEBUG = "1";

    expect(isCliTraceEnabled()).toBe(true);
    expect(isCliTraceOrDebugEnabled()).toBe(true);
    expect(isPrologDebugEnabled()).toBe(true);
  });
});
