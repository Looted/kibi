// implements REQ-cursor-kibi-plugin-v1
import { afterEach, describe, expect, test } from "bun:test";
import { isFreshnessLane, isKbFreshnessRelevantPath } from "../src/path-policy.js";

afterEach(() => {
  process.exitCode = 0;
});

describe("path-policy leftover freshness lanes", () => {
  test("isFreshnessLane covers each KB lane and rejects others", () => {
    expect(isFreshnessLane("requirements")).toBe(true);
    expect(isFreshnessLane("symbol-coordinates.yaml")).toBe(true);
    expect(isFreshnessLane("manifest.json")).toBe(false);
    expect(isKbFreshnessRelevantPath(".kb/requirements/REQ-1.md")).toBe(true);
  });
});
