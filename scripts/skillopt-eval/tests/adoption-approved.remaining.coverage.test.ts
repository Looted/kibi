import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as skills from "../../sync-agent-skills";
import {
  adoptApprovedSnapshot,
  defaultRunMirrorSync,
} from "../adoption-approved";
import { AdoptionTransactionError } from "../adoption-types";

const spies: Array<{ mockRestore: () => void }> = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("adoption-approved remaining mirror-sync wrapping", () => {
  test("wraps mirror-sync failures in AdoptionTransactionError", async () => {
    const spy = spyOn(skills, "syncAgentSkillsUnlocked").mockImplementation(
      () => {
        throw new Error("mirror failed");
      },
    );
    spies.push(spy);
    await expect(
      defaultRunMirrorSync("/tmp/missing-skillopt-repo"),
    ).rejects.toBeInstanceOf(AdoptionTransactionError);
  });
});

describe("adoption-approved rollback", () => {
  test("a failed mirror sync restores the canonical file and only the mirrors that existed", async () => {
    const repo = await mkdtemp(join(tmpdir(), "skillopt-adoption-rollback-"));
    try {
      const cursor = join(repo, "packages/cursor/skills");
      const codex = join(repo, "packages/codex/skills");
      await mkdir(cursor, { recursive: true });
      await writeFile(join(cursor, "SKILL.md"), "cursor mirror\n");
      const canonicalPath = join(repo, "SKILL.md");
      await writeFile(canonicalPath, "current\n");
      await expect(
        adoptApprovedSnapshot(
          repo,
          {
            skill: "kibi-usage",
            canonicalPath,
            currentBodyHash: "a".repeat(64),
            candidateBodyHash: "b".repeat(64),
            mutationRequired: true,
            markdown: "current\n",
            frontmatter: "",
            candidateMarkdown: "candidate\n",
          } as never,
          {
            runMirrorSync: async () => {
              await mkdir(codex, { recursive: true });
              await writeFile(join(cursor, "SKILL.md"), "partial\n");
              throw new Error("mirror sync failed");
            },
          },
        ),
      ).rejects.toBeInstanceOf(AdoptionTransactionError);
      expect(await readFile(canonicalPath, "utf8")).toBe("current\n");
      expect(await readFile(join(cursor, "SKILL.md"), "utf8")).toBe(
        "cursor mirror\n",
      );
      await expect(readFile(join(codex, "SKILL.md"))).rejects.toThrow();
      await expect(mkdir(codex)).resolves.toBeUndefined();
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  });
});
