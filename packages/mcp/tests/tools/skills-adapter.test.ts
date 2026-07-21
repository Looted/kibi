import { describe, expect, test } from "bun:test";
import { getSpec } from "kibi-cli/operations";
import {
  handleKbSkillsList,
  handleKbSkillsLoad,
  handleKbSkillsRead,
} from "../../src/tools/skills.js";

describe("MCP skills thin adapter", () => {
  test("delegates list to shared executor", async () => {
    const specResult = await getSpec("kb_skills_list").execute(
      {},
      {
        workspaceRoot: process.cwd(),
        signal: new AbortController().signal,
        clock: () => new Date(),
      },
    );
    const adapterResult = await handleKbSkillsList({});

    expect(JSON.stringify(adapterResult.structuredContent)).toBe(
      JSON.stringify(specResult.structuredContent),
    );
    expect(JSON.stringify(adapterResult.content)).toBe(
      JSON.stringify(specResult.content),
    );
  });

  test("delegates load to shared executor", async () => {
    const args = { id: "kibi-usage" };
    const specResult = await getSpec("kb_skills_load").execute(args, {
      workspaceRoot: process.cwd(),
      signal: new AbortController().signal,
      clock: () => new Date(),
    });
    const adapterResult = await handleKbSkillsLoad(args);

    expect(JSON.stringify(adapterResult.structuredContent)).toBe(
      JSON.stringify(specResult.structuredContent),
    );
    expect(JSON.stringify(adapterResult.content)).toBe(
      JSON.stringify(specResult.content),
    );
  });

  test("delegates read to shared executor", async () => {
    const args = { id: "kibi-usage", resource: "resources/workflows.md" };
    const specResult = await getSpec("kb_skills_read").execute(args, {
      workspaceRoot: process.cwd(),
      signal: new AbortController().signal,
      clock: () => new Date(),
    });
    const adapterResult = await handleKbSkillsRead(args);

    expect(JSON.stringify(adapterResult.structuredContent)).toBe(
      JSON.stringify(specResult.structuredContent),
    );
    expect(JSON.stringify(adapterResult.content)).toBe(
      JSON.stringify(specResult.content),
    );
  });
});
