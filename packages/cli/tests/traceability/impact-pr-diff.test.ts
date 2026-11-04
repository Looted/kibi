import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import type { GitChangeSnapshot } from "../../src/traceability/git-change-snapshot.js";
import type { StagedPath } from "../../src/traceability/git-staged.js";
import { assertTrustedPullRequestBaseline } from "../../src/traceability/impact-pr-diff.js";
import type { TrustedPullRequestSnapshot } from "../../src/traceability/trusted-pr-event.js";

// implements REQ-impact-policy-stage-e-content-bound-review

type Files = Record<
  string,
  | string
  | { mode?: string; type?: string; oid: string }
  | { mode: string; content: string }
>;

const oidOf = (content: string) =>
  createHash("sha1").update(content).digest("hex");

function snapshot(
  trees: Record<string, Files>,
  inventory: Partial<StagedPath>[] = [],
  base = "MB",
  head = "HD",
): GitChangeSnapshot {
  const blobs = new Map<string, Buffer>();
  const listings = new Map<string, string>();
  for (const [tree, files] of Object.entries(trees)) {
    let listing = "";
    for (const [path, value] of Object.entries(files)) {
      if (typeof value === "string" || "content" in value) {
        const content = typeof value === "string" ? value : value.content;
        const mode = typeof value === "string" ? "100644" : value.mode;
        blobs.set(oidOf(content), Buffer.from(content));
        listing += `${mode} blob ${oidOf(content)}\t${path}\0`;
      } else {
        listing += `${value.mode ?? "160000"} ${value.type ?? "commit"} ${value.oid}\t${path}\0`;
      }
    }
    listings.set(tree, listing);
  }
  return {
    baseTree: base,
    headTree: head,
    headCommit: null,
    inventory: inventory as StagedPath[],
    readGit(args) {
      expect(args.slice(0, 3)).toStrictEqual(["ls-tree", "-r", "-z"]);
      return Buffer.from(listings.get(args[3] as string) ?? "");
    },
    readBlobs: (oids) =>
      new Map(
        oids.flatMap((oid) => {
          const bytes = blobs.get(oid);
          return bytes ? [[oid, bytes] as const] : [];
        }),
      ),
    assertUnchanged() {},
  };
}

const EVENT: TrustedPullRequestSnapshot = {
  repository: "o/r",
  targetRef: "refs/heads/main",
  targetCommit: "tc",
  targetTree: "TG",
  headCommit: "hc",
  headTree: "HD",
  mergeBaseCommit: "mc",
  mergeBaseTree: "MB",
};

const ADVANCED =
  "Protected target knowledge, policy or provider configuration advanced; rebase and refresh the impact review";

function check(
  target: Files,
  mergeBase: Files,
  inventory: Partial<StagedPath>[] = [],
) {
  return () =>
    assertTrustedPullRequestBaseline(
      snapshot({ TG: target, MB: mergeBase }, inventory),
      EVENT,
    );
}

describe("assertTrustedPullRequestBaseline", () => {
  test("refuses a snapshot of other trees", () => {
    const message = "Diff snapshot does not match the verified PR event trees";
    expect(() =>
      assertTrustedPullRequestBaseline(snapshot({}, [], "X", "HD"), EVENT),
    ).toThrow(new Error(message));
    expect(() =>
      assertTrustedPullRequestBaseline(snapshot({}, [], "MB", "X"), EVENT),
    ).toThrow(new Error(message));
    expect(() =>
      assertTrustedPullRequestBaseline(snapshot({}, [], "MB", "HD"), EVENT),
    ).not.toThrow();
  });

  test("passes when protected state and reviewed paths match", () => {
    const tree = {
      ".kb/requirements/REQ-a.md": "---\nid: REQ-a\n---\n",
      "src/a.ts": "a",
      vendor: { oid: "c".repeat(40) },
    };
    expect(check(tree, { ...tree }, [{ path: "src/a.ts" }])).not.toThrow();
  });

  test("refuses an advanced protected path", () => {
    for (const path of [
      ".kb",
      ".kb/symbols.yaml",
      ".kibi",
      ".kibi/impact-policy.json",
      "package.json",
      "bun.lock",
      "bun.lockb",
      "package-lock.json",
      "pnpm-lock.yaml",
      "yarn.lock",
    ]) {
      expect(check({ [path]: "new" }, { [path]: "old" })).toThrow(
        new Error(ADVANCED),
      );
      expect(check({ [path]: "same" }, {})).toThrow(new Error(ADVANCED));
    }
  });

  test("ignores other advanced paths that the change does not touch", () => {
    for (const path of [
      ".kbx/a",
      ".kibix/a",
      "x/.kb/a",
      "docs/package.json",
      "src/a.ts",
    ]) {
      expect(check({ [path]: "new" }, { [path]: "old" })).not.toThrow();
    }
  });

  test("protected state includes mode and gitlink ids", () => {
    expect(
      check(
        { ".kb/x.sh": { mode: "100755", content: "x" } },
        { ".kb/x.sh": "x" },
      ),
    ).toThrow(new Error(ADVANCED));
    expect(
      check(
        { ".kb/sub": { oid: "a".repeat(40) } },
        { ".kb/sub": { oid: "b".repeat(40) } },
      ),
    ).toThrow(new Error(ADVANCED));
    expect(
      check(
        { ".kb/sub": { oid: "a".repeat(40) } },
        { ".kb/sub": { oid: "a".repeat(40), type: "tree", mode: "160000" } },
      ),
    ).toThrow(new Error(ADVANCED));
  });

  test("proof receipts in .kb Markdown do not advance the target", () => {
    const doc = (receipts: string) =>
      `---\nid: REQ-a\n${receipts}title: A\n---\nBody\n`;
    expect(
      check(
        { ".kb/requirements/REQ-a.md": doc("proof_receipts:\n  - r1\n") },
        { ".kb/requirements/REQ-a.md": doc("") },
      ),
    ).not.toThrow();
    expect(
      check(
        { ".kb/requirements/REQ-a.md": doc("") },
        { ".kb/requirements/REQ-a.md": doc("").replace("Body", "Other") },
      ),
    ).toThrow(new Error(ADVANCED));
  });

  test("proof receipts outside .kb are content", () => {
    const doc = (receipts: string) => `---\nid: x\n${receipts}---\n`;
    expect(
      check(
        { "docs/a.md": doc("proof_receipts:\n  - r1\n") },
        { "docs/a.md": doc("") },
        [{ path: "docs/a.md" }],
      ),
    ).toThrow(
      new Error(
        "Protected target changed a reviewed path (docs/a.md); rebase and refresh the impact review",
      ),
    );
  });

  test("refuses a change that edits the impact policy", () => {
    expect(check({}, {}, [{ path: ".kibi/impact-policy.json" }])).toThrow(
      new Error(
        "Impact policy changes must be merged to the protected target separately before reviewed changes",
      ),
    );
  });

  test("refuses a reviewed path, old path or copy source the target changed", () => {
    const changed = (path: string) =>
      new Error(
        `Protected target changed a reviewed path (${path}); rebase and refresh the impact review`,
      );
    const target = {
      "src/a.ts": "new",
      "src/old.ts": "new",
      "src/c.ts": "new",
    };
    const base = { "src/a.ts": "old", "src/old.ts": "old", "src/c.ts": "old" };
    expect(check(target, base, [{ path: "src/a.ts" }])).toThrow(
      changed("src/a.ts"),
    );
    expect(
      check(target, base, [{ path: "src/new.ts", oldPath: "src/old.ts" }]),
    ).toThrow(changed("src/old.ts"));
    expect(
      check(target, base, [{ path: "src/new.ts", copyFromPath: "src/c.ts" }]),
    ).toThrow(changed("src/c.ts"));
    expect(check(target, base, [{ path: "src/new.ts" }])).not.toThrow();
    expect(check({ "src/a.ts": "x" }, {}, [{ path: "src/a.ts" }])).toThrow(
      changed("src/a.ts"),
    );
  });
});
