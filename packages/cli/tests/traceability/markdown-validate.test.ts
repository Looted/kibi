import { describe, expect, it } from "bun:test";
import { FrontmatterError } from "../../src/extractors/markdown";

import { validateStagedMarkdown } from "../../src/traceability/markdown-validate";

function fm(obj: Record<string, any>) {
  const yaml = Object.entries(obj)
    .map(
      ([k, v]) =>
        `${k}: ${typeof v === "string" ? `"${v}"` : JSON.stringify(v)}`,
    )
    .join("\n");
  return `---\n${yaml}\n---\n`;
}

describe("validateStagedMarkdown", () => {
  it("returns no errors for valid requirement frontmatter", () => {
    const content = fm({ id: "REQ-1", title: "Req", status: "open" });
    const res = validateStagedMarkdown(
      "/some/requirements/req.md",
      content,
      (v) => {},
    );
    expect(res.errors.length).toBe(0);
  });

  it("returns no errors for valid scenario frontmatter", () => {
    const content = fm({
      id: "SCEN-1",
      title: "Scen",
      status: "draft",
      type: "scenario",
    });
    const res = validateStagedMarkdown(
      "/some/scenarios/sc.md",
      content,
      () => {},
    );
    expect(res.errors.length).toBe(0);
  });

  it("returns no errors for valid test frontmatter", () => {
    const content = fm({
      id: "TEST-1",
      title: "T",
      status: "pending",
      type: "test",
    });
    const res = validateStagedMarkdown("/some/tests/t.md", content, () => {});
    expect(res.errors.length).toBe(0);
  });

  it("handles missing fields gracefully (no embedded entities)", () => {
    const content = fm({});
    const res = validateStagedMarkdown("/requirements/a.md", content);
    expect(res.errors.length).toBe(0);
  });

  it("detects embedded scenario fields inside a requirement", () => {
    const content = fm({ title: "X", scenarios: [{ given: "a" }] });
    const res = validateStagedMarkdown("/requirements/req.md", content);
    expect(res.errors.length).toBe(1);
    expect(res.errors[0]).toBeInstanceOf(FrontmatterError);
    expect(String(res.errors[0].message)).toContain("Invalid embedded entity");
  });

  it("handles generic parse errors without throwing", () => {
    const content = "---\nfoo: [\n---\n";
    const res = validateStagedMarkdown("/requirements/req.md", content);
    expect(res).toHaveProperty("filePath", "/requirements/req.md");
    expect(Array.isArray(res.errors)).toBe(true);
  });

  it("returns early for unknown path types", () => {
    const content = fm({ title: "NoType" });
    const res = validateStagedMarkdown("/some/other/thing.md", content);
    expect(res.errors.length).toBe(0);
  });
});
