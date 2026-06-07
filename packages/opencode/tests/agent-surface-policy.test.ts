import { describe, expect, test } from "bun:test";
import { buildPrompt } from "../src/prompt";

describe("agent surface policy", () => {
  test("agent-visible prompt allows init-kibi but not removed briefing surfaces", () => {
    const prompt = buildPrompt();
    expect(prompt).toContain("/init-kibi");
    expect(prompt).toContain("kb_autopilot_generate");
    expect(prompt).not.toContain("/brief-kibi");
    expect(prompt).not.toContain("kb_briefing_generate");
  });
});
