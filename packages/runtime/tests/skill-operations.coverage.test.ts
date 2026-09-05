import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { OperationContext } from "kibi-cli/operations/runtime-types";

import {
  skillsListSpec,
  skillsLoadSpec,
  skillsReadSpec,
} from "../src/skill-operations.js";
import {
  resetBundledSkillsDir,
  setBundledSkillsDir,
} from "../src/skill-system/loader.js";

function testContext(): OperationContext {
  return {
    workspaceRoot: process.cwd(),
    signal: new AbortController().signal,
    clock: () => new Date(),
  };
}

const tempDirs: string[] = [];

afterEach(() => {
  resetBundledSkillsDir();
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("runtime skill operations", () => {
  test("skillsListSpec lists bundled skills including kibi-usage", async () => {
    const result = await skillsListSpec.execute({}, testContext());
    const skills = result.structuredContent?.skills ?? [];
    expect(skills.some((skill) => skill.id === "kibi-usage")).toBe(true);
    expect(result.content[0]?.text).toContain("kibi-usage");
    expect(skillsListSpec.requiresProlog).toBe(false);
    expect(skillsListSpec.effects).toEqual(["local-read"]);
  });

  test("skillsListSpec reports none when the skills directory is empty", async () => {
    const empty = mkdtempSync(join(tmpdir(), "kibi-runtime-empty-skills-"));
    tempDirs.push(empty);
    mkdirSync(empty, { recursive: true });
    setBundledSkillsDir(empty);
    const result = await skillsListSpec.execute({}, testContext());
    expect(result.structuredContent?.skills).toEqual([]);
    expect(result.content[0]?.text).toBe("Found 0 bundled skills: none");
  });

  test("skillsLoadSpec returns metadata, body, hash, and source type", async () => {
    const result = await skillsLoadSpec.execute(
      { id: "kibi-usage" },
      testContext(),
    );
    const sc = result.structuredContent as Record<string, unknown>;
    const body = sc.body as string;
    expect((sc.metadata as Record<string, unknown>).id).toBe("kibi-usage");
    expect(body).toContain("# Kibi Usage");
    expect(sc.resources as string[]).toEqual(
      expect.arrayContaining(["resources/workflows.md"]),
    );
    expect(sc.contentHash).toBe(
      createHash("sha256").update(body, "utf8").digest("hex"),
    );
    expect(sc.sourceType).toBe("bundled");
    expect(result.content[0]?.text).toContain("Loaded bundled skill kibi-usage");
  });

  test("skillsLoadSpec rejects empty and unknown ids", async () => {
    await expect(
      skillsLoadSpec.execute({ id: "" }, testContext()),
    ).rejects.toThrow("id must be a non-empty string");
    await expect(
      skillsLoadSpec.execute({ id: "   " }, testContext()),
    ).rejects.toThrow("id must be a non-empty string");
    await expect(
      skillsLoadSpec.execute({}, testContext()),
    ).rejects.toThrow("id must be a non-empty string");
    await expect(
      skillsLoadSpec.execute({ id: "missing-skill" }, testContext()),
    ).rejects.toThrow("Skill not found: missing-skill");
  });

  test("skillsReadSpec reads a declared resource and rejects bad input", async () => {
    const result = await skillsReadSpec.execute(
      { id: "kibi-usage", resource: "resources/workflows.md" },
      testContext(),
    );
    expect(result.structuredContent?.content).toContain("workflow");
    expect(result.content[0]?.text).toBe(
      "Read bundled skill resource kibi-usage/resources/workflows.md",
    );

    await expect(
      skillsReadSpec.execute(
        { id: "kibi-usage", resource: "" },
        testContext(),
      ),
    ).rejects.toThrow("resource must be a non-empty string");
    await expect(
      skillsReadSpec.execute({ id: "kibi-usage" }, testContext()),
    ).rejects.toThrow("resource must be a non-empty string");
    await expect(
      skillsReadSpec.execute(
        { id: "kibi-usage", resource: "resources/hidden.md" },
        testContext(),
      ),
    ).rejects.toThrow("Skill resource not found");
  });
});
