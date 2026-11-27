/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 */

// At level remember, kb_skills does not offer the kibi-provable-code skill.
// (The MCP tool listing is tested with the MCP server.)
import { afterEach, describe, expect, test } from "bun:test";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";
import {
  REMEMBER_UNOFFERED_SKILLS,
  offeredSkills,
  skillsListSpec,
} from "../../src/public/operations/specs/skills.js";
import {
  listBundledSkills,
  loadBundledSkill,
} from "../../src/public/skills.js";
import {
  atLevel,
  cleanupLevelWorkspaces,
  levelWorkspace,
} from "./workspace.js";

afterEach(cleanupLevelWorkspaces);

const context = (workspaceRoot: string) =>
  ({ workspaceRoot }) as OperationContext;

async function listed(workspaceRoot: string): Promise<string[]> {
  const result = await skillsListSpec.execute({}, context(workspaceRoot));
  return (
    result.structuredContent as { readonly skills: readonly { id: string }[] }
  ).skills.map((skill) => skill.id);
}

describe("kb_skills at level remember", () => {
  test("kibi-provable-code is the one skill remember does not offer", () => {
    expect([...REMEMBER_UNOFFERED_SKILLS]).toEqual(["kibi-provable-code"]);
  });

  test("at remember kb_skills lists every bundled skill but kibi-provable-code", async () => {
    const all = listBundledSkills().map((skill) => skill.id);
    expect(all).toContain("kibi-provable-code");
    expect(await listed(atLevel("remember"))).toEqual(
      all.filter((id) => id !== "kibi-provable-code"),
    );
    expect(
      offeredSkills(listBundledSkills(), atLevel("remember")).map(
        (skill) => skill.id,
      ),
    ).not.toContain("kibi-provable-code");
  });

  test("at test, or with no level set, kb_skills lists every bundled skill", async () => {
    const all = listBundledSkills().map((skill) => skill.id);
    expect(await listed(atLevel("test"))).toEqual(all);
    expect(await listed(levelWorkspace())).toEqual(all);
  });

  test("a skill remember does not offer still loads by id", () => {
    expect(loadBundledSkill("kibi-provable-code").manifest.id).toBe(
      "kibi-provable-code",
    );
  });
});
