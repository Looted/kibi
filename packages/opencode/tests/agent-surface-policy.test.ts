import { describe, expect, test } from "bun:test";
import { buildPrompt } from "../src/prompt";

describe("agent surface policy", () => {
  test("agent-visible prompt routes through canonical Kibi skills", () => {
    const prompt = buildPrompt();
    expect(prompt).toContain("/kibi-bootstrap");
    expect(prompt).toContain("kibi-usage");
    expect(prompt).toContain("kibi-freshness");
    expect(prompt).toContain("kibi-traceability");
    expect(prompt).toContain("Never read or edit `.kb/` directly");
    expect(prompt).not.toContain("/brief-kibi");
    expect(prompt).not.toContain("kb_briefing_generate");
    expect(prompt).not.toMatch(/MCP[- ]only|exclusively through MCP/i);
    expect(prompt).not.toMatch(/do not invoke.*Kibi CLI/i);
  });
});
