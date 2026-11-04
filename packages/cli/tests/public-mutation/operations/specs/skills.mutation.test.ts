import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { withContractDefaults } from "../../../../src/public/operations/catalog.js";
import type { OperationContext } from "../../../../src/public/operations/runtime-types.js";
import {
  skillsListSpec,
  skillsLoadSpec,
  skillsReadSpec,
} from "../../../../src/public/operations/specs/skills.js";
import {
  resetBundledSkillsDir,
  setBundledSkillsDir,
} from "../../../../src/public/skills.js";
import { expectGolden } from "../../helpers/golden.js";

const roots: string[] = [];
afterEach(() => {
  resetBundledSkillsDir();
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

const context = {} as OperationContext;

function skillsDir(withSkills: boolean): string {
  const dir = mkdtempSync(join(tmpdir(), "kibi-skills-spec-"));
  roots.push(dir);
  if (!withSkills) return dir;
  const write = (folder: string, id: string, resources: string) => {
    mkdirSync(join(dir, folder, "res"), { recursive: true });
    writeFileSync(
      join(dir, folder, "SKILL.md"),
      `---\nid: ${id}\nname: ${id}\ndescription: d\nversion: 1.0.0\nkibiCompatibility: "*"\n${resources}---\nbody é ${id}\n`,
    );
  };
  write("one", "skill-one", "resources:\n  - res/a.md\n  - res/b.md\n");
  writeFileSync(join(dir, "one", "res", "a.md"), "resource é");
  writeFileSync(join(dir, "one", "res", "b.md"), "b");
  write("two", "skill-two", "");
  return dir;
}

describe("skills operation specs", () => {
  test("declare their contracts", () => {
    // The catalog resolves each spec's result contract in place, so the
    // golden holds the resolved form whether or not the catalog loaded first.
    expectGolden(
      "spec-skills",
      [skillsListSpec, skillsLoadSpec, skillsReadSpec].map(
        withContractDefaults,
      ),
    );
  });

  test("list reports bundled skills", async () => {
    setBundledSkillsDir(skillsDir(true));
    const result = await skillsListSpec.execute({}, context);
    expect(result.content).toStrictEqual([
      {
        type: "text",
        text: "Found 2 bundled skills: skill-one, skill-two",
      },
    ]);
    expect(
      result.structuredContent?.skills.map((skill) => skill.id),
    ).toStrictEqual(["skill-one", "skill-two"]);
  });

  test("list reports none for an empty directory", async () => {
    setBundledSkillsDir(skillsDir(false));
    expect(await skillsListSpec.execute({}, context)).toStrictEqual({
      content: [{ type: "text", text: "Found 0 bundled skills: none" }],
      structuredContent: { skills: [] },
    });
  });

  test("load returns the bundle with its hash", async () => {
    setBundledSkillsDir(skillsDir(true));
    const result = await skillsLoadSpec.execute({ id: "skill-one" }, context);
    const body = "body é skill-one\n";
    expect(result).toStrictEqual({
      content: [
        {
          type: "text",
          text: "Loaded bundled skill skill-one with 2 resources: res/a.md, res/b.md",
        },
      ],
      structuredContent: {
        metadata: {
          id: "skill-one",
          name: "skill-one",
          description: "d",
          version: "1.0.0",
          kibiCompatibility: "*",
          resources: ["res/a.md", "res/b.md"],
        },
        body,
        resources: ["res/a.md", "res/b.md"],
        contentHash: createHash("sha256")
          .update(Buffer.from(body, "utf8"))
          .digest("hex"),
        sourceType: "bundled",
      },
    });
  });

  test("load reports a skill without resources", async () => {
    setBundledSkillsDir(skillsDir(true));
    const result = await skillsLoadSpec.execute({ id: "skill-two" }, context);
    expect(result.content).toStrictEqual([
      {
        type: "text",
        text: "Loaded bundled skill skill-two with 0 resources: none",
      },
    ]);
    expect(result.structuredContent?.resources).toStrictEqual([]);
  });

  test("load rejects a missing or blank id", async () => {
    for (const input of [{}, { id: 7 }, { id: "  " }]) {
      await expect(skillsLoadSpec.execute(input, context)).rejects.toThrow(
        new Error("id must be a non-empty string"),
      );
    }
  });

  test("read returns a declared resource", async () => {
    setBundledSkillsDir(skillsDir(true));
    expect(
      await skillsReadSpec.execute(
        { id: "skill-one", resource: "res/a.md" },
        context,
      ),
    ).toStrictEqual({
      content: [
        {
          type: "text",
          text: "Read bundled skill resource skill-one/res/a.md",
        },
      ],
      structuredContent: { content: "resource é" },
    });
  });

  test("read rejects missing or blank arguments", async () => {
    await expect(
      skillsReadSpec.execute({ resource: "res/a.md" }, context),
    ).rejects.toThrow(new Error("id must be a non-empty string"));
    for (const resource of [undefined, 3, " "]) {
      await expect(
        skillsReadSpec.execute({ id: "skill-one", resource }, context),
      ).rejects.toThrow(new Error("resource must be a non-empty string"));
    }
  });
});
