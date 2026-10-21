import { afterEach, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createIsolationWorkspace } from "../runtime/isolation-workspace";
import { stageKibiMcpRuntime } from "../runtime/staged-mcp";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

test("kb_skills in the staged runtime serves the assembled variant body", async () => {
  // Given a cell workspace whose assembled kibi-usage skill differs from the
  // shipped one.
  const artifactRoot = await mkdtemp(join(tmpdir(), "skillopt-staged-skills-"));
  roots.push(artifactRoot);
  const isolation = await createIsolationWorkspace({
    artifactRoot,
    runId: "staged-skills",
    role: "target",
  });
  const marker = "Variant body marker for the staged skills test.";
  const assembled = join(isolation.target, ".agents/skills/kibi-usage");
  await mkdir(assembled, { recursive: true });
  await writeFile(
    join(assembled, "SKILL.md"),
    `---\nname: kibi-usage\n---\n${marker}\n`,
  );

  try {
    // When
    const stagedRoot = resolve(isolation.target, ".runtime/kibi-mcp");
    await stageKibiMcpRuntime(isolation, process.cwd(), { stagedRoot });

    // Then the variant replaces the shipped body and other skills stay.
    const skills = resolve(stagedRoot, "dist/skills");
    expect(
      await readFile(join(skills, "kibi-usage/SKILL.md"), "utf8"),
    ).toContain(marker);
    expect(existsSync(join(skills, "kibi-freshness/SKILL.md"))).toBe(true);
  } finally {
    await isolation.cleanup();
  }
}, 120_000);
