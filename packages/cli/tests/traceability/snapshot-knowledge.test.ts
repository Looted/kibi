// executable_for TEST-source-analysis-v2-contract
import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { captureStagedSnapshot } from "../../src/traceability/git-change-snapshot.js";
import { readSnapshotKnowledge } from "../../src/traceability/snapshot-knowledge.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "kibi-knowledge-snapshot-"));
  roots.push(root);
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: root, stdio: "pipe" });
  git("init", "-q");
  const write = (file: string, content: string) => {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), content);
  };
  write(
    ".kb/requirements/REQ-snapshot.md",
    "---\nid: REQ-snapshot\ntitle: Snapshot requirement\nstatus: open\n---\nRetain source ownership.\n",
  );
  write(
    ".kb/symbols.yaml",
    "symbols:\n  - id: SYM-stable\n    title: Service.execute\n    sourceFile: service.py\n    status: active\n",
  );
  write(
    ".kb/relationships/aa.yaml",
    "relationships:\n  - id: REL-snapshot\n    type: implements\n    from: SYM-stable\n    to: REQ-snapshot\n",
  );
  git("add", ".kb");
  return { root, write, git };
}
describe("snapshot knowledge", () => {
  test("valid index knowledge survives invalid working files", () => {
    const f = fixture();
    f.write(".kb/symbols.yaml", "symbols: [broken");
    f.write(".kb/requirements/REQ-snapshot.md", "invalid worktree file");
    const snapshot = captureStagedSnapshot(f.root);
    const knowledge = readSnapshotKnowledge(
      snapshot.readGit,
      snapshot.headTree,
      snapshot.readBlobs,
    );
    expect(knowledge.map((row) => row.entity.id).sort()).toEqual([
      "REQ-snapshot",
      "SYM-stable",
    ]);
    expect(
      knowledge.find((row) => row.entity.id === "SYM-stable")?.relationships,
    ).toEqual([{ type: "implements", from: "SYM-stable", to: "REQ-snapshot" }]);
    snapshot.assertUnchanged();
  });
  test("working knowledge cannot legalize a missing staged relationship endpoint", () => {
    const f = fixture();
    f.git("rm", "--cached", ".kb/requirements/REQ-snapshot.md");
    const snapshot = captureStagedSnapshot(f.root);
    expect(() =>
      readSnapshotKnowledge(
        snapshot.readGit,
        snapshot.headTree,
        snapshot.readBlobs,
      ),
    ).toThrow("missing endpoint");
  });
  test("reports every duplicate authored ID in the captured manifest", () => {
    const f = fixture();
    f.write(
      ".kb/symbols.yaml",
      "symbols:\n  - id: SYM-stable\n    title: Service.execute\n    sourceFile: service.py\n    status: active\n  - id: SYM-stable\n    title: Service.execute\n    sourceFile: service.py\n    status: active\n  - id: SYM-other\n    title: Other\n    status: active\n  - id: SYM-other\n    title: Other\n    status: active\n",
    );
    f.git("add", ".kb/symbols.yaml");
    const snapshot = captureStagedSnapshot(f.root);
    expect(() =>
      readSnapshotKnowledge(
        snapshot.readGit,
        snapshot.headTree,
        snapshot.readBlobs,
      ),
    ).toThrow(/Duplicate snapshot entities: .*SYM-stable.*SYM-other/);
  });
  test("captured knowledge remains immutable and an index change invalidates the check", () => {
    const f = fixture();
    const snapshot = captureStagedSnapshot(f.root);
    f.write(".kb/symbols.yaml", "symbols: []\n");
    f.git("add", ".kb/symbols.yaml");
    expect(
      readSnapshotKnowledge(
        snapshot.readGit,
        snapshot.headTree,
        snapshot.readBlobs,
      ).some((row) => row.entity.id === "SYM-stable"),
    ).toBe(true);
    expect(() => snapshot.assertUnchanged()).toThrow();
  });
});
