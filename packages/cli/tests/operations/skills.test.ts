import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  skillsListSpec,
  skillsLoadSpec,
  skillsReadSpec,
} from "../../src/public/operations/specs/skills.js";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";

function testContext(): OperationContext {
  return {
    workspaceRoot: process.cwd(),
    signal: new AbortController().signal,
    clock: () => new Date(),
  };
}

describe("shared skill operation executors", () => {
  test("skills specs use the monorepo-local public skills module", async () => {
    // Given: the shared operation source file.
    const sourcePath = new URL(
      "../../src/public/operations/specs/skills.ts",
      import.meta.url,
    );

    // When: its module dependencies are inspected.
    const source = await readFile(sourcePath, "utf8");

    // Then: the executor resolves the local public implementation directly.
    expect(source).toContain('from "../../skills.js"');
    expect(source).not.toContain('from "kibi-cli/skills"');
  });

  test("skillsListSpec.execute returns bundled skill manifests", async () => {
    const result = await skillsListSpec.execute({}, testContext());

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

  test("skillsLoadSpec.execute returns metadata, body, resources, hash, and source type", async () => {
    const result = await skillsLoadSpec.execute(
      { id: "kibi-usage" },
      testContext(),
    );
    const sc = result.structuredContent as Record<string, unknown>;
    const body = sc.body as string;

    expect((sc.metadata as Record<string, unknown>).id).toBe("kibi-usage");
    expect(body).toContain("# Kibi Usage");
    expect(sc.resources as string[]).toEqual(
      expect.arrayContaining(["resources/relationship-directions.md"]),
    );
    expect(sc.contentHash).toBe(
      createHash("sha256").update(body, "utf8").digest("hex"),
    );
    expect(sc.sourceType).toBe("bundled");
    expect(result.content[0]?.text).toContain(
      "Loaded bundled skill kibi-usage",
    );
  });

  test("skillsLoadSpec.execute throws for missing skill", async () => {
    await expect(
      skillsLoadSpec.execute({ id: "missing-skill" }, testContext()),
    ).rejects.toThrow("Skill not found: missing-skill");
  });

  test("skillsLoadSpec.execute throws for empty id", async () => {
    await expect(
      skillsLoadSpec.execute({ id: "" }, testContext()),
    ).rejects.toThrow("id must be a non-empty string");
  });

  test("skillsReadSpec.execute returns resource content", async () => {
    const result = await skillsReadSpec.execute(
      { id: "kibi-usage", resource: "resources/workflows.md" },
      testContext(),
    );
    const sc = result.structuredContent as Record<string, unknown>;

    expect(sc.content as string).toContain("# Workflows");
    expect(result.content[0]?.text).toContain("Read bundled skill resource");
  });

  test("skillsReadSpec.execute throws for missing resource", async () => {
    await expect(
      skillsReadSpec.execute(
        { id: "kibi-usage", resource: "resources/missing.md" },
        testContext(),
      ),
    ).rejects.toThrow("Skill resource not found");
  });

  test("skillsReadSpec.execute throws for empty id", async () => {
    await expect(
      skillsReadSpec.execute(
        { id: "", resource: "resources/workflows.md" },
        testContext(),
      ),
    ).rejects.toThrow("id must be a non-empty string");
  });

  test("skillsReadSpec.execute throws for empty resource", async () => {
    await expect(
      skillsReadSpec.execute({ id: "kibi-usage", resource: "" }, testContext()),
    ).rejects.toThrow("resource must be a non-empty string");
  });
});
