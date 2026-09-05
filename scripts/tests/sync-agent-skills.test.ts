import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  EXPECTED_SKILL_IDS,
  HASH_MANIFEST_NAME,
  assertCanonicalSourceComplete,
  canonicalSkillsDir,
  computeHashManifest,
  diffMirror,
  mirrorSkillsDir,
  parseArgs,
  planSkillMirror,
  processTarget,
  repoRootFromScript,
  syncAgentSkills,
  syncAgentSkillsUnlocked,
  type PlannedFile,
} from "../sync-agent-skills";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-sync-skills-"));
  roots.push(root);
  return root;
}

function writeCanonical(root: string, extraFile?: { skill: string; rel: string; body: string }) {
  for (const id of EXPECTED_SKILL_IDS) {
    mkdirSync(join(root, "packages/runtime/src/skills", id), { recursive: true });
    writeFileSync(
      join(root, "packages/runtime/src/skills", id, "SKILL.md"),
      `# ${id}\n`,
    );
  }
  if (extraFile) {
    const path = join(
      root,
      "packages/runtime/src/skills",
      extraFile.skill,
      extraFile.rel,
    );
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, extraFile.body);
  }
}

describe("sync-agent-skills argument parsing", () => {
  test("defaults to write mode for both targets", () => {
    expect(parseArgs([])).toEqual({
      mode: "write",
      targets: ["cursor", "codex"],
    });
    expect(parseArgs(["--write"])).toEqual({
      mode: "write",
      targets: ["cursor", "codex"],
    });
    expect(parseArgs(["--check", "--target", "cursor"])).toEqual({
      mode: "check",
      targets: ["cursor"],
    });
    expect(parseArgs(["--target", "codex", "--target", "cursor"]).targets).toEqual(
      ["codex", "cursor"],
    );
  });

  test("rejects unknown flags, positionals, and bad targets", () => {
    expect(() => parseArgs(["--nope"])).toThrow("Unknown flag");
    expect(() => parseArgs(["extra"])).toThrow("Unexpected positional");
    expect(() => parseArgs(["--target"])).toThrow("--target requires");
    expect(() => parseArgs(["--target", "mcp"])).toThrow("--target requires");
  });
});

describe("sync-agent-skills planning and drift", () => {
  test("repo helpers resolve canonical and mirror directories", () => {
    expect(canonicalSkillsDir("/repo")).toBe(
      "/repo/packages/runtime/src/skills",
    );
    expect(mirrorSkillsDir("/repo", "cursor")).toBe("/repo/packages/cursor/skills");
    expect(repoRootFromScript()).toBeTruthy();
  });

  test("assertCanonicalSourceComplete fails for missing source, ids, and SKILL.md", () => {
    const root = tempRoot();
    expect(() =>
      assertCanonicalSourceComplete(join(root, "missing")),
    ).toThrow("Canonical skills source missing");

    mkdirSync(join(root, "skills"), { recursive: true });
    expect(() => assertCanonicalSourceComplete(join(root, "skills"))).toThrow(
      "Canonical skills source incomplete",
    );

    writeCanonical(root);
    rmSync(
      join(root, "packages/runtime/src/skills/kibi-usage/SKILL.md"),
      { force: true },
    );
    expect(() =>
      assertCanonicalSourceComplete(join(root, "packages/runtime/src/skills")),
    ).toThrow("missing its SKILL.md");
  });

  test("write then check reports no drift, then detects added removed modified and hash drift", async () => {
    const root = tempRoot();
    writeCanonical(root, {
      skill: "kibi-usage",
      rel: "resources/guide.md",
      body: "guide\n",
    });
    const canonicalRoot = canonicalSkillsDir(root);
    assertCanonicalSourceComplete(canonicalRoot);

    const wrote = syncAgentSkillsUnlocked(root, {
      mode: "write",
      targets: ["cursor"],
    });
    expect(wrote.driftedTargets).toEqual([]);
    const locked = await syncAgentSkills(root, {
      mode: "check",
      targets: ["cursor"],
    });
    expect(locked.driftedTargets).toEqual([]);
    expect(wrote.driftedTargets).toEqual([]);
    const manifestPath = join(
      root,
      "packages/cursor/skills",
      HASH_MANIFEST_NAME,
    );
    expect(readFileSync(manifestPath, "utf8")).toContain("kibi-usage/SKILL.md");

    const clean = syncAgentSkillsUnlocked(root, {
      mode: "check",
      targets: ["cursor"],
    });
    expect(clean.driftedTargets).toEqual([]);

    writeFileSync(
      join(root, "packages/cursor/skills/kibi-usage/SKILL.md"),
      "# mutated\n",
    );
    writeFileSync(
      join(root, "packages/cursor/skills/extra.txt"),
      "removed-from-canonical\n",
    );
    rmSync(
      join(root, "packages/cursor/skills/kibi-usage/resources/guide.md"),
    );
    const drifted = syncAgentSkillsUnlocked(root, {
      mode: "check",
      targets: ["cursor"],
    });
    expect(drifted.driftedTargets).toEqual(["cursor"]);
  });

  test("diffMirror reports missing and drifted hash manifests", () => {
    const root = tempRoot();
    writeCanonical(root);
    const planned: PlannedFile[] = planSkillMirror(
      canonicalSkillsDir(root),
      "kibi-usage",
    );
    const plannedManifest = computeHashManifest(planned);
    const mirrorRoot = join(root, "mirror");
    mkdirSync(mirrorRoot, { recursive: true });

    const missing = diffMirror(mirrorRoot, planned, plannedManifest);
    expect(missing.hashManifestMissing).toBe(true);
    expect(missing.added.length).toBeGreaterThan(0);

    writeFileSync(join(mirrorRoot, HASH_MANIFEST_NAME), "{not json");
    const unreadable = diffMirror(mirrorRoot, planned, plannedManifest);
    expect(unreadable.hashManifestMissing).toBe(true);

    writeFileSync(
      join(mirrorRoot, HASH_MANIFEST_NAME),
      JSON.stringify({ extra: "deadbeef", "kibi-usage/SKILL.md": "abcd" }, null, 2),
    );
    mkdirSync(join(mirrorRoot, "kibi-usage"), { recursive: true });
    writeFileSync(join(mirrorRoot, "kibi-usage/SKILL.md"), planned[0]?.content ?? "");
    const hashDrift = diffMirror(mirrorRoot, planned, plannedManifest);
    expect(hashDrift.hashManifestDrifted.length).toBeGreaterThan(0);
  });

  test("processTarget writes both mirrors in write mode", () => {
    const root = tempRoot();
    writeCanonical(root);
    const result = processTarget(
      root,
      canonicalSkillsDir(root),
      "codex",
      "write",
    );
    expect(result.drifted).toBe(false);
    expect(
      readFileSync(join(root, "packages/codex/skills/kibi-usage/SKILL.md"), "utf8"),
    ).toContain("kibi-usage");
  });
});
