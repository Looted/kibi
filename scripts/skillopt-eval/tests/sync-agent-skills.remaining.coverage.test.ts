// implements REQ-cursor-agent-plugin-standard-v1
import { afterAll, afterEach, describe, expect, spyOn, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  EXPECTED_SKILL_IDS,
  HASH_MANIFEST_NAME,
  canonicalSkillsDir,
  main,
  processTarget,
  requireSelectedTargets,
  runSyncAgentSkillsIfMain,
  syncAgentSkills,
  syncAgentSkillsUnlocked,
} from "../../sync-agent-skills";
import * as skills from "../../sync-agent-skills";

const roots: string[] = [];
const spies: Array<{ mockRestore: () => void }> = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
  process.exitCode = 0;
});

afterAll(() => {
  process.exitCode = 0;
});

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-sync-skills-rem-"));
  roots.push(root);
  return root;
}

function writeCanonical(root: string): void {
  for (const id of EXPECTED_SKILL_IDS) {
    mkdirSync(join(root, "packages/runtime/src/skills", id, "resources"), {
      recursive: true,
    });
    writeFileSync(
      join(root, "packages/runtime/src/skills", id, "SKILL.md"),
      `# ${id}\n`,
    );
    writeFileSync(
      join(root, "packages/runtime/src/skills", id, "resources", "guide.md"),
      "guide\n",
    );
  }
}

describe("sync-agent-skills remaining write lock, missing hash, and main exits", () => {
  test("check mode reports a missing hash manifest", () => {
    const root = tempRoot();
    writeCanonical(root);
    processTarget(root, canonicalSkillsDir(root), "cursor", "write");
    rmSync(join(root, "packages/cursor/skills", HASH_MANIFEST_NAME));
    const checked = processTarget(
      root,
      canonicalSkillsDir(root),
      "cursor",
      "check",
    );
    expect(checked.drifted).toBe(true);
    expect(checked.summary).toContain("hash manifest missing");
  });

  test("write mode takes the exclusive mirror writer lock", async () => {
    const root = tempRoot();
    writeCanonical(root);
    const result = await syncAgentSkills(root, {
      mode: "write",
      targets: ["cursor"],
    });
    expect(result.driftedTargets).toEqual([]);
    expect(
      syncAgentSkillsUnlocked(root, { mode: "check", targets: ["cursor"] })
        .driftedTargets,
    ).toEqual([]);
  });

  test("main exits 1 when sync throws or mirrors have drifted", async () => {
    const stderr: string[] = [];
    const err = spyOn(process.stderr, "write").mockImplementation(((
      chunk: unknown,
    ) => {
      stderr.push(String(chunk));
      return true;
    }) as typeof process.stderr.write);
    const exit = spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`exit ${code}`);
    }) as typeof process.exit);
    spies.push(err, exit);

    const failing = spyOn(skills, "syncAgentSkills").mockImplementation(
      async () => {
        throw new Error("mirror exploded");
      },
    );
    spies.push(failing);
    await expect(main(["--check", "--target", "cursor"])).rejects.toThrow(
      /exit 1/,
    );
    expect(stderr.join("")).toContain("mirror exploded");
    failing.mockRestore();

    const drifted = spyOn(skills, "syncAgentSkills").mockResolvedValue({
      driftedTargets: ["cursor"],
    });
    spies.push(drifted);
    await expect(main(["--check", "--target", "cursor"])).rejects.toThrow(
      /exit 1/,
    );
    expect(stderr.join("")).toContain("drift detected in: cursor");
    process.exitCode = 0;
  });

  test("requireSelectedTargets and runSyncAgentSkillsIfMain leftovers", async () => {
    expect(() => requireSelectedTargets([])).toThrow("No targets selected");
    expect(requireSelectedTargets(["cursor"])).toEqual(["cursor"]);
    let started = 0;
    await runSyncAgentSkillsIfMain(false, [], async () => {
      started += 1;
    });
    expect(started).toBe(0);
    await runSyncAgentSkillsIfMain(true, ["--check"], async () => {
      started += 1;
    });
    expect(started).toBe(1);
  });
});
