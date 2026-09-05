import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { OperationError } from "../../src/cli-errors.js";
import {
  canonicalSourcePath,
  hasConfiguredSourceTarget,
  renderMarkdownRelationshipDeletion,
  renderSourceDeletion,
  renderYamlRelationshipDeletion,
  resolveContainedSourcePath,
  writeSourceForUpsert,
} from "../../src/operations/mutation/source-authoring.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";

const workspaces: string[] = [];

afterEach(async () => {
  await Promise.all(
    workspaces
      .splice(0)
      .map((workspace) => rm(workspace, { recursive: true, force: true })),
  );
});

async function workspace(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "kibi-source-cov-"));
  workspaces.push(root);
  return root;
}

function context(
  workspaceRoot: string,
  fs: OperationContext["fs"] = nodeFilesystem,
): OperationContext {
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-05T00:00:00.000Z"),
    fs,
  };
}

describe("source-authoring path and format guards", () => {
  test("resolveContainedSourcePath rejects traversal, empty segments, and derived trees", async () => {
    const root = await workspace();
    expect(() => resolveContainedSourcePath(root, "../secret.md")).toThrow(
      OperationError,
    );
    expect(() => resolveContainedSourcePath(root, "docs//REQ.md")).toThrow(
      /without traversal/,
    );
    expect(() =>
      resolveContainedSourcePath(root, ".kb/branches/develop/kb.pl"),
    ).toThrow(/derived state/);
    expect(resolveContainedSourcePath(root, "docs/REQ.md")).toBe(
      path.join(root, "docs", "REQ.md"),
    );
  });

  test("resolveContainedSourcePath refuses a symlink that escapes the workspace", async () => {
    const root = await workspace();
    const outside = await mkdtemp(path.join(tmpdir(), "kibi-source-out-"));
    workspaces.push(outside);
    await writeFile(path.join(outside, "secret.md"), "secret\n");
    await mkdir(path.join(root, "docs"), { recursive: true });
    await symlink(
      path.join(outside, "secret.md"),
      path.join(root, "docs", "secret.md"),
    );
    expect(() => resolveContainedSourcePath(root, "docs/secret.md")).toThrow(
      /outside the workspace/,
    );
  });

  test("hasConfiguredSourceTarget and canonicalSourcePath use canonical lanes", async () => {
    const root = await workspace();
    expect(hasConfiguredSourceTarget(root, "req")).toBe(true);
    expect(hasConfiguredSourceTarget(root, "unknown")).toBe(false);
    expect(
      canonicalSourcePath(
        context(root),
        { type: "req", id: "REQ-CANON", properties: {} },
        { id: "REQ-CANON", type: "req" },
      ),
    ).toBe(".kb/requirements/REQ-CANON.md");
    expect(
      canonicalSourcePath(
        context(root),
        { type: "symbol", id: "SYM-CANON", properties: {} },
        { id: "SYM-CANON", type: "symbol" },
      ),
    ).toBe(".kb/symbols.yaml");
  });

  test("canonicalSourcePath rejects an absolute document path outside the workspace", async () => {
    const root = await workspace();
    expect(() =>
      canonicalSourcePath(
        context(root),
        {
          type: "req",
          id: "REQ-OUT",
          properties: {},
          document: { path: "/etc/passwd" },
        },
        { id: "REQ-OUT", type: "req" },
      ),
    ).toThrow(/outside the workspace/);
  });
});

describe("source deletion and relationship patching", () => {
  test("renderSourceDeletion covers markdown, yaml, and unsupported formats", () => {
    expect(
      renderSourceDeletion(
        "docs/REQ.md",
        "REQ-1",
        "req",
        "---\nid: REQ-1\ntype: req\n---\nbody\n",
      ),
    ).toEqual({ mode: "delete" });
    expect(() =>
      renderSourceDeletion(
        "docs/REQ.md",
        "REQ-OTHER",
        "req",
        "---\nid: REQ-1\ntype: req\n---\n",
      ),
    ).toThrow(/does not contain REQ-OTHER/);
    expect(() =>
      renderSourceDeletion("docs/REQ.yaml", "REQ-1", "req", "id: REQ-1\n"),
    ).toThrow(/YAML deletion is supported only for symbol manifests/);
    expect(() =>
      renderSourceDeletion("symbols.yaml", "SYM-1", "symbol", "title: none\n"),
    ).toThrow(/must contain a symbols array/);
    expect(() =>
      renderSourceDeletion(
        "symbols.yaml",
        "SYM-MISSING",
        "symbol",
        "symbols:\n  - id: SYM-KEEP\n",
      ),
    ).toThrow(/does not contain SYM-MISSING/);
    expect(
      renderSourceDeletion(
        "symbols.yaml",
        "SYM-1",
        "symbol",
        "symbols:\n  - id: SYM-1\n    title: One\n  - id: SYM-2\n    title: Two\n",
      ).mode,
    ).toBe("write");
    expect(() =>
      renderSourceDeletion("docs/REQ.json", "REQ-1", "req", "{}"),
    ).toThrow(/Unsupported authored source format/);
  });

  test("renderMarkdownRelationshipDeletion patches typed nodes and scalar links", () => {
    expect(() =>
      renderMarkdownRelationshipDeletion("docs/REQ.yaml", "---\nid: x\n---\n", {
        type: "verified_by",
        from: "REQ-1",
        to: "TEST-1",
      }),
    ).toThrow(/Markdown documents/);
    expect(
      renderMarkdownRelationshipDeletion("docs/REQ.md", "no frontmatter\n", {
        type: "verified_by",
        from: "REQ-1",
        to: "TEST-1",
      }),
    ).toEqual({ body: "no frontmatter\n", removed: false });
    expect(
      renderMarkdownRelationshipDeletion("docs/REQ.md", "---", {
        type: "verified_by",
        from: "REQ-1",
        to: "TEST-1",
      }),
    ).toEqual({ body: "---", removed: false });
    expect(
      renderMarkdownRelationshipDeletion("docs/REQ.md", "---\nid: REQ-1\n", {
        type: "verified_by",
        from: "REQ-1",
        to: "TEST-1",
      }),
    ).toEqual({ body: "---\nid: REQ-1\n", removed: false });

    const typed = [
      "---",
      "id: REQ-1",
      "relationships:",
      "  - type: verified_by",
      "    target: TEST-1",
      "  - type: specified_by",
      "    to: SCEN-1",
      "links:",
      "  - kb:entity/TEST-SCALAR",
      "---",
      "",
      "body",
      "",
    ].join("\n");
    const removedTyped = renderMarkdownRelationshipDeletion(
      "docs/REQ.md",
      typed,
      { type: "verified_by", from: "REQ-1", to: "TEST-1" },
    );
    expect(removedTyped.removed).toBe(true);
    expect(removedTyped.body).not.toContain("TEST-1");
    expect(removedTyped.body).toContain("SCEN-1");

    const removedScalar = renderMarkdownRelationshipDeletion(
      "docs/REQ.md",
      typed,
      { type: "relates_to", from: "REQ-1", to: "TEST-SCALAR" },
    );
    expect(removedScalar.removed).toBe(true);
    expect(removedScalar.body).not.toContain("TEST-SCALAR");
  });

  test("renderYamlRelationshipDeletion rejects non-yaml and invalid manifests", () => {
    expect(() =>
      renderYamlRelationshipDeletion("docs/REQ.md", "symbols: []\n", {
        type: "implements",
        from: "SYM-1",
        to: "REQ-1",
      }),
    ).toThrow(/YAML symbol manifests/);
    expect(() =>
      renderYamlRelationshipDeletion(
        ".kb/symbols.yaml",
        "symbols: [\n",
        { type: "implements", from: "SYM-1", to: "REQ-1" },
      ),
    ).toThrow(/invalid YAML/);
    expect(() =>
      renderYamlRelationshipDeletion(".kb/symbols.yaml", "title: none\n", {
        type: "implements",
        from: "SYM-1",
        to: "REQ-1",
      }),
    ).toThrow(/must contain a symbols array/);
    expect(
      renderYamlRelationshipDeletion(
        ".kb/symbols.yaml",
        "symbols:\n  - id: SYM-OTHER\n",
        { type: "implements", from: "SYM-1", to: "REQ-1" },
      ),
    ).toEqual({
      body: "symbols:\n  - id: SYM-OTHER\n",
      removed: false,
    });
  });
});

describe("writeSourceForUpsert rollback and format branches", () => {
  test("returns null without a filesystem and writes without rename", async () => {
    const root = await workspace();
    expect(
      await writeSourceForUpsert(
        { type: "req", id: "REQ-1", properties: { title: "One" } },
        { id: "REQ-1", type: "req", title: "One" },
        undefined,
        {
          workspaceRoot: root,
          signal: new AbortController().signal,
          clock: () => new Date("2026-09-05T00:00:00.000Z"),
        },
      ),
    ).toBeNull();

    const { rename: _ignored, ...withoutRename } = nodeFilesystem;
    const result = await writeSourceForUpsert(
      {
        type: "req",
        id: "REQ-NORENAME",
        properties: { title: "No rename" },
        document: { path: "docs/REQ-NORENAME.md", body: "body\n" },
      },
      { id: "REQ-NORENAME", type: "req", title: "No rename" },
      undefined,
      context(root, withoutRename),
    );
    expect(result?.receipt.created).toBe(true);
    expect(await readFile(path.join(root, "docs", "REQ-NORENAME.md"), "utf8")).toContain(
      "REQ-NORENAME",
    );
  });

  test("rolls back a created file, restores prior bytes, and skips concurrent edits", async () => {
    const root = await workspace();
    const created = await writeSourceForUpsert(
      {
        type: "req",
        id: "REQ-NEW",
        properties: { title: "New" },
        document: { path: "docs/REQ-NEW.md", body: "new body\n" },
      },
      { id: "REQ-NEW", type: "req", title: "New" },
      undefined,
      context(root),
    );
    expect(created?.receipt.created).toBe(true);
    await created?.rollback();
    await expect(
      readFile(path.join(root, "docs", "REQ-NEW.md"), "utf8"),
    ).rejects.toThrow();

    await mkdir(path.join(root, "docs"), { recursive: true });
    const original = "---\nid: REQ-OLD\ntitle: Old\ntype: req\n---\nexact\n";
    await writeFile(path.join(root, "docs", "REQ-OLD.md"), original);
    const updated = await writeSourceForUpsert(
      {
        type: "req",
        id: "REQ-OLD",
        properties: { title: "Updated" },
        document: { path: "docs/REQ-OLD.md" },
      },
      { id: "REQ-OLD", type: "req", title: "Updated" },
      { id: "REQ-OLD", source: "docs/REQ-OLD.md" },
      context(root),
    );
    await updated?.rollback();
    expect(await readFile(path.join(root, "docs", "REQ-OLD.md"), "utf8")).toBe(
      original,
    );

    const concurrent = await writeSourceForUpsert(
      {
        type: "req",
        id: "REQ-OLD",
        properties: { title: "Again" },
        document: { path: "docs/REQ-OLD.md" },
      },
      { id: "REQ-OLD", type: "req", title: "Again" },
      { id: "REQ-OLD", source: "docs/REQ-OLD.md" },
      context(root),
    );
    await writeFile(path.join(root, "docs", "REQ-OLD.md"), "concurrent writer\n");
    await concurrent?.rollback();
    expect(await readFile(path.join(root, "docs", "REQ-OLD.md"), "utf8")).toBe(
      "concurrent writer\n",
    );
  });

  test("rejects unsupported authored formats and YAML for non-symbols", async () => {
    const root = await workspace();
    await expect(
      writeSourceForUpsert(
        {
          type: "req",
          id: "REQ-JSON",
          properties: { title: "Json" },
          document: { path: "docs/REQ.json" },
        },
        { id: "REQ-JSON", type: "req", title: "Json" },
        undefined,
        context(root),
      ),
    ).rejects.toThrow(/Unsupported authored source format/);
    await expect(
      writeSourceForUpsert(
        {
          type: "req",
          id: "REQ-YAML",
          properties: { title: "Yaml" },
          document: { path: "docs/REQ.yaml" },
        },
        { id: "REQ-YAML", type: "req", title: "Yaml" },
        undefined,
        context(root),
      ),
    ).rejects.toThrow(/YAML source authoring is supported only for symbol manifests/);
  });
});
