import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseDocument } from "yaml";
import {
  manifestRelationships,
  renderSourceDocument,
  republishPendingSourceReceipt,
  writeSourceForUpsert,
} from "../../../src/operations/mutation/source-authoring.js";
import { nodeFilesystem } from "../../../src/public/operations/node-ports.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function workspace(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "kibi-source-authoring-"));
  roots.push(root);
  return root;
}

function context(
  workspaceRoot: string,
  fsPort: OperationContext["fs"] = nodeFilesystem,
): OperationContext {
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-05T00:00:00.000Z"),
    fs: fsPort,
  };
}

const receiptFile = (root: string, relative: string) =>
  path.join(
    root,
    ".kb",
    "recovery",
    "pending-sources",
    `${createHash("sha256").update(relative).digest("hex")}.json`,
  );

const req = (fields: Record<string, unknown> = {}) => ({
  id: "REQ-src",
  type: "req",
  ...fields,
});
const upsert = (fields: Record<string, unknown> = {}) =>
  ({ type: "req", id: "REQ-src", properties: {}, ...fields }) as never;

describe("republishPendingSourceReceipt", () => {
  test("rebinds a receipt whose bytes are not JSON", async () => {
    const root = await workspace();
    const file = receiptFile(root, "docs/a.md");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "{not json");
    expect(republishPendingSourceReceipt(root, "docs/a.md", "h1")).toBe(true);
    expect(JSON.parse(fs.readFileSync(file, "utf8"))).toMatchObject({
      version: 1,
      path: "docs/a.md",
      afterHash: "h1",
    });
  });
});

describe("renderSourceDocument for markdown", () => {
  test("titles a new document without a title after its id", () => {
    expect(
      renderSourceDocument(
        upsert({ document: { body: "Body.\n" } }),
        { id: "TEST-x", type: "test" },
        undefined,
        "docs/x.md",
      ),
    ).toBe("---\nid: TEST-x\ntitle: TEST-x\ntype: test\n---\nBody.\n");
  });

  test("re-serializes a flow-mapping front matter block", () => {
    expect(
      renderSourceDocument(
        upsert({ document: { body: "Body.\n" } }),
        { id: "TEST-x", type: "test", title: "New" },
        "---\n{id: TEST-x, title: Old}\n---\nOld body.\n",
        "docs/x.md",
      ),
    ).toBe("---\nid: TEST-x\ntitle: New\ntype: test\n---\nBody.\n");
  });

  test("replaces a key that was written without a value", () => {
    expect(
      renderSourceDocument(
        upsert({ document: { body: "Body.\n" } }),
        { id: "TEST-x", type: "test", title: "Named" },
        "---\nid: TEST-x\ntype: test\ntitle:\n---\nBody.\n",
        "docs/x.md",
      ),
    ).toBe("---\nid: TEST-x\ntype: test\ntitle: Named\n---\nBody.\n");
    expect(
      renderSourceDocument(
        upsert({ document: { body: "Body.\n" } }),
        { id: "TEST-x", type: "test", title: "Named" },
        "---\nid: TEST-x\ntitle:\ntype: test\n---\nBody.\n",
        "docs/x.md",
      ),
    ).toBe("---\nid: TEST-x\ntitle: Named\ntype: test\n---\nBody.\n");
  });

  test("keeps the comment after a key that had no value", () => {
    expect(
      renderSourceDocument(
        upsert({ document: { body: "Body.\n" } }),
        { id: "TEST-x", type: "test", title: "Named" },
        "---\nid: TEST-x\ntitle: # pending\ntype: test\n---\nBody.\n",
        "docs/x.md",
      ),
    ).toBe("---\nid: TEST-x\ntitle: Named # pending\ntype: test\n---\nBody.\n");
  });

  test("re-serializes front matter that uses an explicit key", () => {
    for (const block of ["? title\n", "? title\n: Old\n"])
      expect(
        renderSourceDocument(
          upsert({ document: { body: "Body.\n" } }),
          { id: "TEST-x", type: "test", title: "Named" },
          `---\nid: TEST-x\ntype: test\n${block}---\nBody.\n`,
          "docs/x.md",
        ),
      ).toBe("---\nid: TEST-x\ntype: test\ntitle: Named\n---\nBody.\n");
  });
});

describe("symbol manifests", () => {
  const symbol = (relationships: unknown[] = []) =>
    ({ type: "symbol", id: "SYM-a", properties: {}, relationships }) as never;

  test("reads typed relationships off a manifest entry", () => {
    const doc = parseDocument(
      [
        "id: SYM-a",
        "relationships:",
        "  - null",
        "  - type: implements",
        "  - type: implements",
        "    to: REQ-1",
        "  - type: covered_by",
        "    target: TEST-1",
      ].join("\n"),
    );
    expect(manifestRelationships(doc.contents)).toStrictEqual([
      { type: "implements", target: "REQ-1" },
      { type: "covered_by", target: "TEST-1" },
    ]);
    for (const entry of ["id: SYM-a\nrelationships: x", "id: SYM-a"])
      expect(
        manifestRelationships(parseDocument(entry).contents),
      ).toStrictEqual([]);
  });

  test("merges duplicate relationship rows and sorts them", () => {
    const manifest = [
      "symbols:",
      "  - id: SYM-a",
      "    title: A",
      "    relationships:",
      "      - type: implements",
      "        to: REQ-2",
      "      - type: covered_by",
      "        target: TEST-1",
      "  - id: SYM-a",
      "    relationships:",
      "      - type: implements",
      "        target: REQ-2",
      "",
    ].join("\n");
    expect(
      renderSourceDocument(
        symbol([
          { type: "implements", from: "SYM-a", to: "REQ-2" },
          { type: "implements", from: "SYM-other", to: "REQ-3" },
        ]),
        { id: "SYM-a", type: "symbol", title: "A" },
        manifest,
        ".kb/symbols.yaml",
      ),
    ).toBe(
      [
        "symbols:",
        "  - id: SYM-a",
        "    title: A",
        "    relationships:",
        "      - type: covered_by",
        "        target: TEST-1",
        "      - type: implements",
        "        target: REQ-2",
        "",
      ].join("\n"),
    );
  });

  test("refuses a matching entry that is not a mapping", () => {
    expect(() =>
      renderSourceDocument(
        symbol(),
        { id: "undefined", type: "symbol" },
        "symbols:\n  - [a, b]\n",
        ".kb/symbols.yaml",
      ),
    ).toThrow('conflicting authored field "record"');
  });
});

describe("writeSourceForUpsert rollback", () => {
  const relative = ".kb/requirements/REQ-src.md";

  test("restores a prior receipt when a new file is rolled back", async () => {
    const root = await workspace();
    const receipt = receiptFile(root, relative);
    fs.mkdirSync(path.dirname(receipt), { recursive: true });
    fs.writeFileSync(receipt, "prior");
    const write = await writeSourceForUpsert(
      upsert({ document: { body: "Body.\n" } }),
      req({ title: "T" }),
      undefined,
      context(root),
    );
    expect(write?.receipt.created).toBe(true);
    await write?.rollback();
    expect(fs.existsSync(path.join(root, relative))).toBe(false);
    expect(fs.readFileSync(receipt, "utf8")).toBe("prior");
  });

  test("restores a prior receipt when an existing file is rolled back", async () => {
    const root = await workspace();
    const absolute = path.join(root, relative);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    const before = "---\nid: REQ-src\ntitle: T\ntype: req\n---\nOld.\n";
    fs.writeFileSync(absolute, before);
    const receipt = receiptFile(root, relative);
    fs.mkdirSync(path.dirname(receipt), { recursive: true });
    fs.writeFileSync(receipt, "prior");
    const write = await writeSourceForUpsert(
      upsert({ document: { body: "New.\n" } }),
      req({ title: "T" }),
      { id: "REQ-src", source: relative },
      context(root),
    );
    expect(fs.readFileSync(receipt, "utf8")).not.toBe("prior");
    await write?.rollback();
    expect(fs.readFileSync(absolute, "utf8")).toBe(before);
    expect(fs.readFileSync(receipt, "utf8")).toBe("prior");
  });

  test("removes the rollback temp file when restoring fails", async () => {
    const root = await workspace();
    const absolute = path.join(root, relative);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, "---\nid: REQ-src\ntype: req\n---\nOld.\n");
    const unlinked: string[] = [];
    const fsPort = { ...nodeFilesystem };
    const write = await writeSourceForUpsert(
      upsert({ document: { body: "New.\n" } }),
      req({ title: "T" }),
      { id: "REQ-src", source: relative },
      context(root, fsPort),
    );
    fsPort.rename = async () => {
      throw new Error("rename refused");
    };
    fsPort.unlink = async (file: string) => {
      unlinked.push(file);
      await nodeFilesystem.unlink?.(file);
    };
    await expect(write?.rollback()).rejects.toThrow("rename refused");
    expect(unlinked).toHaveLength(1);
    expect(unlinked[0]).toContain(".kibi-rollback-");
    expect(fs.existsSync(unlinked[0] as string)).toBe(false);
  });

  test("reports both failures when the receipt and the rollback fail", async () => {
    const root = await workspace();
    // A file where the receipt directory belongs makes the receipt write fail.
    fs.mkdirSync(path.join(root, ".kb", "recovery"), { recursive: true });
    fs.writeFileSync(path.join(root, ".kb", "recovery", "pending-sources"), "");
    const fsPort = {
      ...nodeFilesystem,
      unlink: async () => {
        throw new Error("unlink refused");
      },
    };
    const failure = await writeSourceForUpsert(
      upsert({ document: { body: "Body.\n" } }),
      req({ title: "T" }),
      undefined,
      context(root, fsPort),
    ).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(AggregateError);
    expect((failure as AggregateError).message).toBe(
      `Source published for ${relative}, but pending receipt publication and rollback both failed; recover from the pending-source receipt or restore the authored file manually`,
    );
    expect(
      (failure as AggregateError).errors.map((error: Error) => error.message),
    ).toContain("unlink refused");
  });
});
