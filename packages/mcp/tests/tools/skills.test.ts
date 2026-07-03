import { describe, expect, test } from "bun:test";
import {
  handleKbSkillsList,
  handleKbSkillsLoad,
  handleKbSkillsRead,
} from "../../src/tools/skills.js";

describe("MCP skills tool handlers", () => {
  test("lists bundled skills with the real kibi-usage bundle", async () => {
    const result = await handleKbSkillsList({});

    expect(result.structuredContent?.skills).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "kibi-usage",
          name: "Kibi Usage",
          resources: expect.arrayContaining(["resources/workflows.md"]),
        }),
      ]),
    );
    expect(result.content[0]?.text).toContain("kibi-usage");
  });

  test("loads bundled skill metadata, body, resources, content hash, and source type", async () => {
    const result = await handleKbSkillsLoad({ id: "kibi-usage" });

    expect(result.structuredContent?.metadata.id).toBe("kibi-usage");
    expect(result.structuredContent?.body).toContain("# Kibi Usage");
    expect(result.structuredContent?.resources).toEqual(
      expect.arrayContaining(["resources/relationship-directions.md"]),
    );
    expect(result.structuredContent?.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.structuredContent?.sourceType).toBe("bundled");
    expect(result.content[0]?.text).toContain(
      "Loaded bundled skill kibi-usage",
    );
    expect(result.content[0]?.text).toContain(
      "resources/relationship-directions.md",
    );
    expect(result.content[0]?.text).toContain("resources/fact-lanes.md");
    expect(result.content[0]?.text).toContain("resources/workflows.md");
  });

  test("reads declared bundled skill resources", async () => {
    const result = await handleKbSkillsRead({
      id: "kibi-usage",
      resource: "resources/workflows.md",
    });

    expect(result.structuredContent?.content).toContain("# Workflows");
    expect(result.content[0]?.text).toContain("Read bundled skill resource");
  });

  test("wraps invalid skill id errors", async () => {
    await expect(handleKbSkillsLoad({ id: "missing-skill" })).rejects.toThrow(
      "Skills load failed: Skill not found: missing-skill",
    );
  });

  test("wraps invalid skill resource errors", async () => {
    await expect(
      handleKbSkillsRead({
        id: "kibi-usage",
        resource: "resources/missing.md",
      }),
    ).rejects.toThrow(
      /Skills read failed: Skill resource not found: kibi-usage\/resources\/missing.md[\s\S]*Declared resources: resources\/relationship-directions.md, resources\/fact-lanes.md, resources\/workflows.md/,
    );
  });

  test("wraps empty id error for load", async () => {
    await expect(handleKbSkillsLoad({ id: "" })).rejects.toThrow(
      "Skills load failed: id must be a non-empty string",
    );
  });

  test("wraps empty id error for read", async () => {
    await expect(
      handleKbSkillsRead({ id: "", resource: "resources/workflows.md" }),
    ).rejects.toThrow("Skills read failed: id must be a non-empty string");
  });

  test("wraps empty resource error for read", async () => {
    await expect(
      handleKbSkillsRead({ id: "kibi-usage", resource: "" }),
    ).rejects.toThrow(
      "Skills read failed: resource must be a non-empty string",
    );
  });
});
