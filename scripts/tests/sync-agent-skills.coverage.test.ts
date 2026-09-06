// implements REQ-cursor-agent-plugin-standard-v1
import { afterEach, describe, expect, spyOn, test } from "bun:test";
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
  parseArgs,
  processTarget,
  syncAgentSkills,
  syncAgentSkillsUnlocked,
} from "../sync-agent-skills";

const roots: string[] = [];
const spies: Array<{ mockRestore: () => void }> = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-sync-skills-cov-"));
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

describe("sync-agent-skills remaining CLI and drift branches", () => {
  test("parseArgs accepts write after check and both targets", () => {
    expect(parseArgs(["--check", "--write", "--target", "codex"])).toEqual({
      mode: "write",
      targets: ["codex"],
    });
  });

  test("processTarget check mode summarizes added, removed, modified, and hash drift", () => {
    const root = tempRoot();
    writeCanonical(root);
    processTarget(root, canonicalSkillsDir(root), "cursor", "write");
    writeFileSync(
      join(root, "packages/cursor/skills/kibi-usage/SKILL.md"),
      "# mutated\n",
    );
    writeFileSync(join(root, "packages/cursor/skills/extra.txt"), "gone\n");
    rmSync(join(root, "packages/cursor/skills/kibi-usage/resources/guide.md"));
    writeFileSync(
      join(root, "packages/cursor/skills", HASH_MANIFEST_NAME),
      JSON.stringify({ extra: "deadbeef" }, null, 2),
    );
    const checked = processTarget(
      root,
      canonicalSkillsDir(root),
      "cursor",
      "check",
    );
    expect(checked.drifted).toBe(true);
    expect(checked.summary).toMatch(/added|removed|modified|hash manifest/);
  });

  test("unlocked write reports drift summaries to stderr during check", () => {
    const root = tempRoot();
    writeCanonical(root);
    syncAgentSkillsUnlocked(root, { mode: "write", targets: ["codex"] });
    writeFileSync(
      join(root, "packages/codex/skills/kibi-freshness/SKILL.md"),
      "# drift\n",
    );
    const writes: string[] = [];
    const stderr = spyOn(process.stderr, "write").mockImplementation(((
      chunk: unknown,
    ) => {
      writes.push(String(chunk));
      return true;
    }) as typeof process.stderr.write);
    spies.push(stderr);
    const result = syncAgentSkillsUnlocked(root, {
      mode: "check",
      targets: ["codex"],
    });
    expect(result.driftedTargets).toEqual(["codex"]);
    expect(writes.join("")).toContain("skill mirror drift detected");
  });

  test("main checks the real repo mirrors and exits 2 on usage errors", async () => {
    const stdout: string[] = [];
    const out = spyOn(process.stdout, "write").mockImplementation(((
      chunk: unknown,
    ) => {
      stdout.push(String(chunk));
      return true;
    }) as typeof process.stdout.write);
    const err = spyOn(process.stderr, "write").mockImplementation((() => true) as typeof process.stderr.write);
    const exit = spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`exit ${code}`);
    }) as typeof process.exit);
    spies.push(out, err, exit);

    await main(["--check", "--target", "cursor"]);
    expect(stdout.join("")).toMatch(/checked 1 mirror/);
    await expect(main(["--target"])).rejects.toThrow(/exit 2/);
  });

  test("locked check mode does not take the exclusive writer lock path", async () => {
    const root = tempRoot();
    writeCanonical(root);
    syncAgentSkillsUnlocked(root, { mode: "write", targets: ["cursor"] });
    const result = await syncAgentSkills(root, {
      mode: "check",
      targets: ["cursor"],
    });
    expect(result.driftedTargets).toEqual([]);
  });
});
