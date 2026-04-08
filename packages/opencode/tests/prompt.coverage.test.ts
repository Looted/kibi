import { describe, test } from "bun:test";
import { strict as assert } from "node:assert";
import { SENTINEL, buildPrompt } from "../src/prompt";

describe("prompt coverage", () => {
  test("emits partial-setup posture guidance", () => {
    const prompt = buildPrompt({
      recentEdits: [],
      posture: "root_partial",
    });

    assert.ok(prompt.includes(SENTINEL));
    assert.match(prompt, /Partial KB setup detected/);
  });

  test("shows degraded advisory even when no other guidance block is selected", () => {
    const prompt = buildPrompt({
      recentEdits: [],
      posture: "root_active",
      maintenanceDegraded: true,
      degradedMode: "warn-once",
      showDegradedAdvisory: true,
    });

    assert.ok(prompt.includes(SENTINEL));
    assert.match(prompt, /Maintenance degraded/);
  });
});
