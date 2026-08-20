import { describe, expect, test } from "bun:test";

import {
  formatAbsoluteUtc,
  formatRelativeAge,
  parseTimestamp,
} from "../../src/report/relative-time.js";

const NOW = Date.parse("2026-08-18T13:06:00.000Z");

describe("relative time", () => {
  test("formats absolute UTC without baking a relative phrase", () => {
    const date = new Date("2026-08-18T11:17:00.000Z");
    expect(formatAbsoluteUtc(date)).toBe("2026-08-18 11:17 UTC");
    expect(formatAbsoluteUtc(date)).not.toContain("ago");
    expect(formatAbsoluteUtc(date)).not.toContain("just now");
  });

  test("formats seconds, minutes, hours, and days from a controlled clock", () => {
    expect(formatRelativeAge(NOW - 8_000, NOW)).toBe("just now");
    expect(formatRelativeAge(NOW - 120_000, NOW)).toBe("2m ago");
    expect(formatRelativeAge(NOW - (1 * 3_600_000 + 49 * 60_000), NOW)).toBe(
      "1h 49m ago",
    );
    expect(formatRelativeAge(NOW - 3 * 3_600_000, NOW)).toBe("3h ago");
    expect(formatRelativeAge(NOW - 26 * 3_600_000, NOW)).toBe("1d 2h ago");
    expect(formatRelativeAge(NOW - 10 * 86_400_000, NOW)).toBe("10d ago");
  });

  test("does not invent freshness for missing or invalid timestamps", () => {
    expect(parseTimestamp(undefined)).toBeUndefined();
    expect(parseTimestamp("not-a-date")).toBeUndefined();
    expect(formatRelativeAge(Number.NaN, NOW)).toBe("timestamp unavailable");
  });
});
