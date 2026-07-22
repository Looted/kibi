import { describe, expect, test } from "bun:test";
import { buildPrompt } from "../src/prompt";

describe("agent surface policy", () => {
  test("agent-visible prompt selects Kibi interfaces by capability", () => {
    const prompt = buildPrompt();
    expect(prompt).toContain("/init-kibi");
    expect(prompt).toContain("kb_autopilot_generate");
    expect(prompt).toContain("MCP tools are visible");
    expect(prompt).toContain("trusted local Kibi CLI");
    expect(prompt).toContain("--input");
    expect(prompt).toContain("neither interface is available");
    expect(prompt).toContain("Do not read or edit `.kb/` files directly");
    expect(prompt).toContain("Query before mutate");
    expect(prompt).toContain("sequentially");
    expect(prompt).toContain("`kb_check` before completion");
    expect(prompt).not.toContain("/brief-kibi");
    expect(prompt).not.toContain("kb_briefing_generate");
    expect(prompt).not.toMatch(/MCP[- ]only|exclusively through MCP/i);
    expect(prompt).not.toMatch(/do not invoke.*Kibi CLI/i);
  });
});
