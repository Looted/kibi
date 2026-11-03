import { describe, expect, test } from "bun:test";
import type { GitChangeSnapshot } from "../../src/traceability/git-change-snapshot.js";
import {
  blobBytes,
  entriesForTree,
  treeEntry,
} from "../../src/traceability/impact-git-tree.js";

// implements REQ-impact-policy-stage-e-content-bound-review

const OID = "a".repeat(40);
const OID2 = "b".repeat(64);

function snapshot(
  output: Buffer | string,
  blobs: Record<string, Buffer> = {},
): GitChangeSnapshot & { calls: (readonly string[])[] } {
  const calls: (readonly string[])[] = [];
  return {
    baseTree: "base",
    headTree: "head",
    headCommit: null,
    inventory: [],
    calls,
    readGit(args) {
      calls.push(args);
      return typeof output === "string" ? Buffer.from(output) : output;
    },
    readBlobs: (oids) =>
      new Map(oids.filter((o) => o in blobs).map((o) => [o, blobs[o]!])),
    assertUnchanged() {},
  };
}

const row = (mode: string, type: string, oid: string, path: string) =>
  `${mode} ${type} ${oid}\t${path}\0`;

describe("entriesForTree", () => {
  test("lists the tree recursively and parses every NUL-terminated row", () => {
    const snap = snapshot(
      row("100644", "blob", OID, "src/a.ts") +
        row("160000", "commit", OID2, "vendor/sub"),
    );
    expect(entriesForTree(snap, "tree1")).toStrictEqual([
      { mode: "100644", type: "blob", objectId: OID, path: "src/a.ts" },
      { mode: "160000", type: "commit", objectId: OID2, path: "vendor/sub" },
    ]);
    expect(snap.calls).toStrictEqual([["ls-tree", "-r", "-z", "tree1"]]);
  });

  test("an empty listing has no entries", () => {
    expect(entriesForTree(snapshot(""), "t")).toStrictEqual([]);
  });

  test("decodes UTF-8 paths and rejects invalid UTF-8", () => {
    const name = "docs/zażółć.md";
    expect(
      entriesForTree(snapshot(row("100644", "blob", OID, name)), "t")[0]?.path,
    ).toBe(name);
    const bad = Buffer.concat([
      Buffer.from(`100644 blob ${OID}\tbad`),
      Buffer.from([0xff, 0xfe]),
      Buffer.from("\0"),
    ]);
    expect(() => entriesForTree(snapshot(bad), "t")).toThrow(TypeError);
  });

  test("rejects a row without a tab", () => {
    expect(() =>
      entriesForTree(snapshot(`100644 blob ${OID} path\0`), "t"),
    ).toThrow(new Error("Malformed Git tree listing"));
  });

  test("rejects rows with missing or invalid header fields", () => {
    for (const header of [
      "",
      `\tpath`,
      "100644",
      "100644 blob",
      `100644 blob ${"g".repeat(40)}`,
      ` blob ${OID}`,
      `100644  ${OID}`,
    ]) {
      const text = header.includes("\t") ? `${header}\0` : `${header}\tp\0`;
      expect(() => entriesForTree(snapshot(text), "t")).toThrow(
        new Error("Malformed Git tree entry"),
      );
    }
  });

  test("rejects paths that are not normalized", () => {
    for (const path of ["/abs", "a\\b", "../x", "a/../b", "a/.."]) {
      expect(() =>
        entriesForTree(snapshot(row("100644", "blob", OID, path)), "t"),
      ).toThrow(new Error("Git snapshot path is not normalized"));
    }
    expect(
      entriesForTree(snapshot(row("100644", "blob", OID, "a/..b/c..")), "t")
        .length,
    ).toBe(1);
  });
});

describe("treeEntry", () => {
  test("asks for one literal path and returns only its exact entry", () => {
    const snap = snapshot(
      row("040000", "tree", OID2, "dir") + row("100644", "blob", OID, "dir/x"),
    );
    expect(treeEntry(snap, "tree9", "dir/x")).toStrictEqual({
      mode: "100644",
      type: "blob",
      objectId: OID,
      path: "dir/x",
    });
    expect(snap.calls).toStrictEqual([
      ["ls-tree", "-z", "tree9", "--", ":(literal)dir/x"],
    ]);
    expect(treeEntry(snap, "tree9", "dir/y")).toBeUndefined();
  });
});

describe("blobBytes", () => {
  const entry = { mode: "100644", type: "blob", objectId: OID, path: "f" };

  test("reads the blob bytes of a blob entry", () => {
    const bytes = Buffer.from("hello");
    expect(blobBytes(snapshot("", { [OID]: bytes }), entry)).toBe(bytes);
  });

  test("returns undefined for non-blob entries", () => {
    expect(
      blobBytes(snapshot("", { [OID]: Buffer.from("x") }), {
        ...entry,
        type: "commit",
      }),
    ).toBeUndefined();
  });

  test("throws when the snapshot has no bytes for the blob", () => {
    expect(() => blobBytes(snapshot(""), entry)).toThrow(
      new Error("Snapshot did not return blob bytes for f"),
    );
  });
});
