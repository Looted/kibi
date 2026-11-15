import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseDocument } from "yaml";
import { reviseRequirementBody } from "../../../src/entity-body-context.js";
import * as authoring from "../../../src/operations/mutation/source-authoring.js";
import {
  authoredFrontmatter,
  canonicalSourcePath,
  isUntrackedByGit,
  manifestRelationships,
  newEntitySourceTarget,
  normalizeAuthoredSourcePath,
  readFileTimes,
  renderMarkdownRelationshipDeletion,
  renderSourceDeletion,
  renderSourceDocument,
  renderSourceWrite,
  renderYamlRelationshipDeletion,
  republishPendingSourceReceipt,
  resolveContainedSourcePath,
  restoreFileTimes,
  retirePendingSourceReceipt,
  writePendingSourceReceipt,
  writeSourceForUpsert,
} from "../../../src/operations/mutation/source-authoring.js";
import type { UpsertInput } from "../../../src/operations/mutation/types.js";
import { nodeFilesystem } from "../../../src/public/operations/node-ports.js";
import type {
  FilesystemPort,
  OperationContext,
} from "../../../src/public/operations/runtime-types.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0).reverse()) restore();
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function workspace(): string {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(tmpdir(), "kibi-source-authoring-")),
  );
  roots.push(root);
  return root;
}

function context(
  workspaceRoot: string,
  port: FilesystemPort = nodeFilesystem,
): OperationContext {
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-08-15T00:00:00.000Z"),
    fs: port,
  };
}

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function receiptFile(root: string, relative: string): string {
  return path.join(
    root,
    ".kb",
    "recovery",
    "pending-sources",
    `${sha(relative)}.json`,
  );
}

function modeOf(file: string): number {
  return fs.statSync(file).mode & 0o777;
}

function codeOf(run: () => unknown): string | undefined {
  try {
    run();
  } catch (error) {
    return (error as { code?: string }).code;
  }
  return undefined;
}

function failure(run: () => unknown): {
  code?: string;
  message: string;
  retryable?: boolean;
} {
  try {
    run();
  } catch (error) {
    return error as { code?: string; message: string; retryable?: boolean };
  }
  throw new Error("expected a failure");
}

function input(type: string, id: string, extra: object = {}): UpsertInput {
  return { type, id, properties: {}, ...extra } as unknown as UpsertInput;
}

function markdown(
  type: string,
  entity: Record<string, unknown>,
  existing: string | undefined,
  extra: object = {},
): string {
  return renderSourceDocument(
    input(type, String(entity.id), extra),
    entity,
    existing,
    "doc.md",
  );
}

describe("pending source receipts", () => {
  test("write an owner-only receipt that binds the path to its hash", () => {
    const root = workspace();
    writePendingSourceReceipt(root, "docs/a.md", "h1");
    const file = receiptFile(root, "docs/a.md");
    const receipt = JSON.parse(fs.readFileSync(file, "utf8"));
    expect(receipt).toEqual({
      version: 1,
      path: "docs/a.md",
      afterHash: "h1",
      createdAt: expect.any(String),
    });
    expect(modeOf(file)).toBe(0o600);
  });

  test("retire a receipt, a missing one, and refuse other failures", () => {
    const root = workspace();
    writePendingSourceReceipt(root, "a.md", "h");
    retirePendingSourceReceipt(root, "a.md");
    expect(fs.existsSync(receiptFile(root, "a.md"))).toBe(false);
    expect(() => retirePendingSourceReceipt(root, "a.md")).not.toThrow();
    fs.mkdirSync(receiptFile(root, "dir.md"), { recursive: true });
    expect(() => retirePendingSourceReceipt(root, "dir.md")).toThrow();
  });

  test("republish only an existing receipt and keep its other fields", () => {
    const root = workspace();
    expect(republishPendingSourceReceipt(root, "a.md", "h2")).toBe(false);
    expect(fs.existsSync(receiptFile(root, "a.md"))).toBe(false);
    const file = receiptFile(root, "a.md");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(
      file,
      JSON.stringify({ version: 3, path: "old", afterHash: "old", note: "n" }),
    );
    expect(republishPendingSourceReceipt(root, "a.md", "h2")).toBe(true);
    expect(JSON.parse(fs.readFileSync(file, "utf8"))).toEqual({
      version: 3,
      path: "a.md",
      afterHash: "h2",
      note: "n",
      rebasedAt: expect.any(String),
    });
  });

  test("rebuild a receipt that is not a JSON object", () => {
    const root = workspace();
    const file = receiptFile(root, "a.md");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    for (const raw of ['"ab"', "null", "{broken"]) {
      fs.writeFileSync(file, raw);
      expect(republishPendingSourceReceipt(root, "a.md", "h")).toBe(true);
      expect(JSON.parse(fs.readFileSync(file, "utf8"))).toEqual({
        version: 1,
        path: "a.md",
        afterHash: "h",
        rebasedAt: expect.any(String),
      });
    }
  });
});

describe("file times", () => {
  test("read the times of a file, or null when it is missing", () => {
    const root = workspace();
    const file = path.join(root, "a.md");
    fs.writeFileSync(file, "x");
    const stat = fs.statSync(file);
    expect(readFileTimes(file)).toEqual({
      atime: stat.atime,
      mtime: stat.mtime,
    });
    expect(readFileTimes(path.join(root, "missing.md"))).toBeNull();
  });

  test("put the times back, skipping a null snapshot and a missing file", () => {
    const root = workspace();
    const file = path.join(root, "a.md");
    fs.writeFileSync(file, "x");
    const old = new Date("2020-01-02T03:04:05.000Z");
    restoreFileTimes(file, { atime: old, mtime: old });
    expect(fs.statSync(file).mtime.toISOString()).toBe(old.toISOString());
    const before = fs.statSync(file).mtimeMs;
    expect(() => restoreFileTimes(file, null)).not.toThrow();
    expect(fs.statSync(file).mtimeMs).toBe(before);
    expect(() =>
      restoreFileTimes(path.join(root, "missing.md"), {
        atime: old,
        mtime: old,
      }),
    ).not.toThrow();
  });
});

describe("source paths", () => {
  test("contain document paths inside the workspace", () => {
    const root = workspace();
    expect(resolveContainedSourcePath(root, ".")).toBe(root);
    expect(resolveContainedSourcePath(root, "docs/a.md")).toBe(
      path.join(root, "docs/a.md"),
    );
    for (const bad of ["/etc/a.md", "../a.md", "docs//a.md", "a\\..\\b.md"]) {
      const error = failure(() => resolveContainedSourcePath(root, bad));
      expect(error.code).toBe("SOURCE_PATH_INVALID");
      expect(error.message).toContain("without traversal");
    }
    const derived = failure(() =>
      resolveContainedSourcePath(root, ".kb/branches/main/x.md"),
    );
    expect(derived.code).toBe("SOURCE_PATH_INVALID");
    expect(derived.message).toContain("derived state");
  });

  test("refuse a path that a symlink takes outside the workspace", () => {
    const root = workspace();
    const outside = workspace();
    fs.symlinkSync(outside, path.join(root, "out"));
    const error = failure(() => resolveContainedSourcePath(root, "out/a.md"));
    expect(error.code).toBe("SOURCE_PATH_INVALID");
    expect(error.message).toContain("resolves outside the workspace");
  });

  test("refuse a resolved path that escapes the workspace", () => {
    const root = workspace();
    const resolve = path.resolve;
    const spy = spyOn(path, "resolve").mockImplementation(
      (...parts: string[]) =>
        parts[1] === "escape.md" ? "/elsewhere/escape.md" : resolve(...parts),
    );
    restores.push(() => spy.mockRestore());
    const error = failure(() => resolveContainedSourcePath(root, "escape.md"));
    expect(error.code).toBe("SOURCE_PATH_INVALID");
    expect(error.message).toContain("escapes the workspace");
  });

  test("normalize authored paths, keeping in-workspace aliases", () => {
    const root = workspace();
    expect(normalizeAuthoredSourcePath(root, "docs\\a.md")).toBe("docs/a.md");
    fs.mkdirSync(path.join(root, "real"));
    fs.symlinkSync(path.join(root, "real"), path.join(root, "link"));
    expect(
      normalizeAuthoredSourcePath(root, path.join(root, "link", "a.md")),
    ).toBe("link/a.md");
    expect(codeOf(() => normalizeAuthoredSourcePath(root, root))).toBe(
      "SOURCE_PATH_INVALID",
    );
  });

  test("rebase an absolute path through a symlinked workspace root", () => {
    const real = workspace();
    const alias = `${real}-alias`;
    fs.symlinkSync(real, alias);
    roots.push(alias);
    expect(
      normalizeAuthoredSourcePath(alias, path.join(real, "docs", "a.md")),
    ).toBe("docs/a.md");
  });

  test("choose the requested, the stored, then the canonical target", () => {
    const root = workspace();
    const ctx = context(root);
    const at = (
      type: string,
      existing?: Record<string, unknown>,
      extra: object = {},
    ) =>
      canonicalSourcePath(
        ctx,
        input(type, "E-1", extra),
        { id: "E-1" },
        existing,
      );
    expect(at("req")).toBe(".kb/requirements/E-1.md");
    expect(at("symbol")).toBe(".kb/symbols.yaml");
    expect(at("req", { source: "docs\\a.md" })).toBe("docs/a.md");
    expect(at("symbol", { source: ".kb/x.yml" })).toBe(".kb/x.yml");
    expect(at("req", { source: "docs/a.mdx" })).toBe("docs/a.mdx");
    for (const source of [
      "abc://host/x.md",
      "docs/a.md.txt",
      "docs/a.txt",
      "",
      7,
    ]) {
      expect(at("req", { source })).toBe(".kb/requirements/E-1.md");
    }
    expect(codeOf(() => at("req", { source: "1ab://x.md" }))).toBe(
      "SOURCE_PATH_INVALID",
    );
    expect(
      at("req", { source: "docs/b.md" }, { document: { path: "docs/c.md" } }),
    ).toBe("docs/c.md");
    expect(at("req", { source: path.join(root, "docs", "abs.md") })).toBe(
      "docs/abs.md",
    );
  });

  test("refuse a target that is missing or outside the workspace", () => {
    const root = workspace();
    const ctx = context(root);
    const missing = failure(() =>
      canonicalSourcePath(ctx, input("widget", "W-1"), { id: "W-1" }),
    );
    expect(missing.code).toBe("DOCUMENT_PATH_REQUIRED");
    const outside = failure(() =>
      canonicalSourcePath(
        ctx,
        input("req", "R-1"),
        { id: "R-1" },
        {
          source: "/elsewhere/x.md",
        },
      ),
    );
    expect(outside.code).toBe("SOURCE_PATH_INVALID");
    expect(outside.message).toContain("resolves outside the workspace");
    const self = failure(() =>
      canonicalSourcePath(
        ctx,
        input("req", "R-1", { document: { path: root } }),
        { id: "R-1" },
      ),
    );
    expect(self.code).toBe("SOURCE_PATH_INVALID");
    expect(self.message).toContain("without traversal");
  });

  test("name the document a new entity would be written to", () => {
    const root = workspace();
    expect(newEntitySourceTarget(context(root), input("req", "REQ-9"))).toBe(
      path.join(root, ".kb/requirements/REQ-9.md"),
    );
    expect(
      newEntitySourceTarget(context(root), input("widget", "W-1")),
    ).toBeUndefined();
  });
});

describe("authored front matter", () => {
  test("read only a fenced mapping", () => {
    expect(authoredFrontmatter("---\nid: A\n---\nbody")).toEqual({ id: "A" });
    expect(authoredFrontmatter("---abc\nid: A\n---\n")).toEqual({ id: "A" });
    for (const content of [
      "no front matter",
      "---",
      "---\nid: A",
      "title\nid: A\n---\n",
      "---\n- a\n---\n",
      "---\n5\n---\n",
      "---\n\n---\n",
    ]) {
      expect(authoredFrontmatter(content)).toEqual({});
    }
  });
});

describe("new Markdown documents", () => {
  test("state a requirement's trimmed statement as its body", () => {
    expect(
      markdown(
        "req",
        {
          id: "REQ-1",
          title: "T",
          type: "req",
          semantic_text: "  The system shall X.  ",
        },
        undefined,
      ),
    ).toBe(
      "---\ntitle: T\nsemantic_text: '  The system shall X.  '\nid: REQ-1\ntype: req\n---\nThe system shall X.\n",
    );
    expect(markdown("req", { id: "REQ-1", type: "req" }, undefined)).toBe(
      "---\nid: REQ-1\ntitle: REQ-1\ntype: req\n---\n",
    );
    expect(
      markdown("req", { id: "REQ-1", type: "req" }, undefined, {
        document: { body: "" },
      }),
    ).toBe("---\nid: REQ-1\ntitle: REQ-1\ntype: req\n---\n");
  });

  test("give other entities an empty body and only authored keys", () => {
    expect(
      markdown(
        "scenario",
        { id: "S-1", type: "scenario", semantic_text: "S" },
        undefined,
      ),
    ).toBe("---\nsemantic_text: S\nid: S-1\ntitle: S-1\ntype: scenario\n---\n");
    expect(
      markdown(
        "scenario",
        {
          id: "S-1",
          type: "scenario",
          links: ["a"],
          relationships: [],
          source: "x",
          created_at: "c",
          updated_at: "u",
          priority: undefined,
          status: "draft",
        },
        undefined,
      ),
    ).toBe("---\nstatus: draft\nid: S-1\ntitle: S-1\ntype: scenario\n---\n");
    expect(
      markdown("scenario", { id: "S-1", type: "scenario", title: "T" }, ""),
    ).toBe("---\ntitle: T\nid: S-1\ntype: scenario\n---\n");
  });

  test("write a created_at the caller states, never a filled-in one", () => {
    const entity = {
      id: "S-1",
      type: "scenario",
      created_at: "2026-01-01T00:00:00.000Z",
    };
    expect(
      markdown("scenario", entity, undefined, {
        properties: { created_at: "2026-01-01T00:00:00.000Z" },
      }),
    ).toBe(
      "---\nid: S-1\ntitle: S-1\ntype: scenario\ncreated_at: '2026-01-01T00:00:00.000Z'\n---\n",
    );
    expect(markdown("scenario", entity, undefined)).toBe(
      "---\nid: S-1\ntitle: S-1\ntype: scenario\n---\n",
    );
    // An existing document gets the stated value in place.
    expect(
      markdown(
        "scenario",
        { ...entity, created_at: "2026-02-01" },
        "---\nid: S-1\ntitle: S-1\ntype: scenario\ncreated_at: 2025-01-01\n---\n",
        { properties: { created_at: "2026-02-01" } },
      ),
    ).toBe(
      "---\nid: S-1\ntitle: S-1\ntype: scenario\ncreated_at: '2026-02-01'\n---\n",
    );
  });

  test("dump long values on one line without anchors", () => {
    const shared = { k: 1 };
    expect(
      markdown(
        "scenario",
        {
          id: "S-1",
          type: "scenario",
          title: "L".repeat(90),
          meta: [shared, shared],
        },
        undefined,
      ),
    ).toBe(
      `---\ntitle: ${"L".repeat(90)}\nmeta:\n  - k: 1\n  - k: 1\nid: S-1\ntype: scenario\n---\n`,
    );
  });

  test("refuse formats other than Markdown and symbol manifests", () => {
    const entity = { id: "REQ-1", type: "req" };
    const yaml = failure(() =>
      renderSourceDocument(input("req", "REQ-1"), entity, undefined, "a.yaml"),
    );
    expect(yaml.code).toBe("SOURCE_FORMAT_UNSUPPORTED");
    expect(yaml.message).toContain("not req");
    const text = failure(() =>
      renderSourceDocument(input("req", "REQ-1"), entity, undefined, "a.txt"),
    );
    expect(text.code).toBe("SOURCE_FORMAT_UNSUPPORTED");
    expect(text.message).toBe("Unsupported authored source format: .txt");
    expect(
      failure(() =>
        renderSourceDocument(
          input("req", "REQ-1"),
          entity,
          undefined,
          "README",
        ),
      ).message,
    ).toBe("Unsupported authored source format: unknown");
    expect(
      renderSourceDocument(input("req", "REQ-1"), entity, undefined, "a.MDX"),
    ).toBe("---\nid: REQ-1\ntitle: REQ-1\ntype: req\n---\n");
    expect(
      renderSourceDocument(
        input("symbol", "SYM-1"),
        { id: "SYM-1", type: "symbol" },
        undefined,
        "a.yml",
      ),
    ).toBe("symbols:\n  - id: SYM-1\n");
  });
});

describe("subject definitions in existing documents", () => {
  const fact = { id: "F-1", type: "fact", fact_kind: "subject" };
  const existing = (body: string) => `---\nid: F-1\ntype: fact\n---\n${body}`;
  const gap =
    "Definition not stated: the subject shop.cart is named by REQ-A.\n";

  test("a generated gap never replaces an authored definition", () => {
    const authored = "The cart a signed-in customer fills before checkout.\n";
    expect(
      markdown("fact", fact, existing(authored), { document: { body: gap } }),
    ).toEndWith(`---\n${authored}`);
  });

  test("a gap fills an empty body and replaces an earlier gap", () => {
    expect(
      markdown("fact", fact, existing(""), { document: { body: gap } }),
    ).toEndWith(gap);
    expect(
      markdown("fact", fact, existing("Definition not stated: old.\n"), {
        document: { body: gap },
      }),
    ).toEndWith(gap);
  });
});

describe("requirement statements in existing documents", () => {
  const existing = (frontmatter: string, body: string) =>
    `---\nid: REQ-1\ntype: req\n${frontmatter}---${body}`;
  const req = (semantic?: string) =>
    semantic === undefined
      ? { id: "REQ-1", type: "req" }
      : { id: "REQ-1", type: "req", semantic_text: semantic };
  const rendered = (semantic: string, body: string) =>
    `---\nid: REQ-1\ntype: req\nsemantic_text: ${semantic}\ntitle: REQ-1\n---${body}`;

  test("keep the body while the statement only changes its spacing", () => {
    for (const stored of ["A  B", "'A B '"]) {
      expect(
        markdown(
          "req",
          req("A B"),
          existing(`semantic_text: ${stored}\n`, "\n\nOld body.\n"),
        ),
      ).toBe(rendered("A B", "\n\nOld body.\n"));
    }
    expect(
      markdown(
        "req",
        req("Statement one."),
        existing("", "\n\nStatement one.\n"),
      ),
    ).toBe(rendered("Statement one.", "\n\nStatement one.\n"));
  });

  test("revise the body when the statement changes", () => {
    expect(
      markdown(
        "req",
        req("A B"),
        existing("semantic_text: AB\n", "\n\nOld body.\n"),
      ),
    ).toBe(rendered("A B", "\n\nA B\n"));
    const revised = reviseRequirementBody({
      existingBody: "\nOld.",
      statement: "New.",
    });
    expect(
      markdown("req", req("New."), existing("semantic_text: Old.\n", "\nOld.")),
    ).toBe(rendered("New.", `\n${revised}`));
    expect(
      markdown(
        "req",
        req("New."),
        existing("semantic_text: Old.\n", "Old.\nmore"),
      ),
    ).toBe(rendered("New.", "\n\nNew.\n"));
    expect(
      markdown(
        "req",
        req("New."),
        existing("semantic_text: Old.\n", "\n\n\nOld.\n"),
      ),
    ).toBe(rendered("New.", "\n\n\nNew.\n"));
  });

  test("keep the body of other entities", () => {
    expect(
      markdown(
        "scenario",
        { id: "S-1", type: "scenario", semantic_text: "New." },
        "---\nid: S-1\ntype: scenario\nsemantic_text: Old.\n---\n\nOld.\n",
      ),
    ).toBe(
      "---\nid: S-1\ntype: scenario\nsemantic_text: New.\ntitle: S-1\n---\n\nOld.\n",
    );
  });

  test("derive a missing statement from the body, never over a stated one", () => {
    expect(
      markdown(
        "req",
        req(),
        existing("semantic_text: '  '\n", "\n\nDerived statement.\n"),
      ),
    ).toBe(rendered("Derived statement.", "\n\nDerived statement.\n"));
    expect(
      markdown("req", req("A."), existing("", "\n\nOld.\n"), {
        document: { body: "Other." },
      }),
    ).toBe(rendered("A.", "\nOther."));
  });
});

describe("front matter patches", () => {
  const scenario = (extra: object) => ({
    id: "S-1",
    type: "scenario",
    title: "T",
    ...extra,
  });
  const patch = (extra: object, raw: string, body = "\n") =>
    markdown("scenario", scenario(extra), `---\n${raw}\n---${body}`);

  test("rewrite only the keys whose value changes", () => {
    expect(
      patch(
        { title: "New", released: "2026-01-01", status: "draft" },
        "id: S-1\ntitle: 'Old'\nreleased: 2026-01-01\nstatus: draft # c",
        "\n\nBody.\n",
      ),
    ).toBe(
      "---\nid: S-1\ntitle: New\nreleased: 2026-01-01\nstatus: draft # c\ntype: scenario\n---\n\nBody.\n",
    );
    expect(
      patch(
        { a: 10, b: 200, c: 3000 },
        "id: S-1\ntype: scenario\ntitle: T\na: 1\nb: 2\nc: 3",
      ),
    ).toBe(
      "---\nid: S-1\ntype: scenario\ntitle: T\na: 10\nb: 200\nc: 3000\n---\n",
    );
    expect(
      patch(
        { status: undefined },
        "id: S-1\ntype: scenario\ntitle: T\nstatus: kept",
      ),
    ).toBe("---\nid: S-1\ntype: scenario\ntitle: T\nstatus: kept\n---\n");
    expect(
      markdown(
        "scenario",
        { id: "S-1", type: "scenario" },
        "---\nid: S-1\ntype: scenario\ntitle: Kept\n---\n",
      ),
    ).toBe("---\nid: S-1\ntype: scenario\ntitle: Kept\n---\n");
  });

  test("keep block and flow lists in their style", () => {
    expect(
      patch(
        { tags: ["a", "b"] },
        "id: S-1\ntype: scenario\ntitle: T\ntags:\n  - a\nstatus: x",
      ),
    ).toBe(
      "---\nid: S-1\ntype: scenario\ntitle: T\ntags:\n  - a\n  - b\nstatus: x\n---\n",
    );
    expect(
      patch(
        { tags: ["a", "b"] },
        "id: S-1\ntype: scenario\ntitle: T\ntags: [a]\nstatus: x",
      ),
    ).toBe(
      "---\nid: S-1\ntype: scenario\ntitle: T\ntags: [a, b]\nstatus: x\n---\n",
    );
    expect(
      patch(
        { tags: ["a", "b"], more: ["c"] },
        "id: S-1\ntype: scenario\ntitle: T",
      ),
    ).toBe(
      "---\nid: S-1\ntype: scenario\ntitle: T\ntags:\n  - a\n  - b\nmore:\n  - c\n---\n",
    );
  });

  test("write mappings in block style, in their key order, without anchors", () => {
    const shared = { k: 1 };
    expect(
      patch(
        { meta: { b: 1, a: 2 } },
        "id: S-1\ntype: scenario\ntitle: T\nmeta: x",
      ),
    ).toBe(
      "---\nid: S-1\ntype: scenario\ntitle: T\nmeta:\n  b: 1\n  a: 2\n---\n",
    );
    expect(
      patch(
        { meta: [shared, shared] },
        "id: S-1\ntype: scenario\ntitle: T\nmeta: x",
      ),
    ).toBe(
      "---\nid: S-1\ntype: scenario\ntitle: T\nmeta:\n  - k: 1\n  - k: 1\n---\n",
    );
  });

  test("fill empty values and keep their comments", () => {
    expect(
      patch({ title: "New" }, "title: # note\nid: S-1\ntype: scenario"),
    ).toBe("---\ntitle: New # note\nid: S-1\ntype: scenario\n---\n");
    expect(patch({ title: "New" }, "title:\nid: S-1\ntype: scenario")).toBe(
      "---\ntitle: New\nid: S-1\ntype: scenario\n---\n",
    );
  });

  test("patch an indented mapping in place", () => {
    expect(
      patch({ title: "New" }, "  id: S-1\n  type: scenario\n  title: Old"),
    ).toBe("---\n  id: S-1\n  type: scenario\n  title: New\n---\n");
  });

  test("append to empty, blank and blank-line-terminated front matter", () => {
    expect(markdown("scenario", scenario({}), "---\n---\nbody\n")).toBe(
      "---\ntitle: T\nid: S-1\ntype: scenario\n---\nbody\n",
    );
    expect(patch({}, " ")).toBe(
      "---\n \ntitle: T\nid: S-1\ntype: scenario\n---\n",
    );
    expect(patch({}, "id: S-1\n")).toBe(
      "---\nid: S-1\ntitle: T\ntype: scenario\n---\n",
    );
  });

  test("append a key that only a merge key supplied", () => {
    expect(
      patch({}, "base: &b\n  title: T\n<<: *b\nid: S-1\ntype: scenario"),
    ).toBe(
      "---\nbase: &b\n  title: T\n<<: *b\nid: S-1\ntype: scenario\ntitle: T\n---\n",
    );
  });

  test("re-serialize front matter that cannot be patched in place", () => {
    const quoted = "note: 'q'";
    expect(
      patch({ a: 2 }, `id: S-1\ntype: scenario\ntitle: T\n${quoted}\n? a\n: 1`),
    ).toBe("---\nid: S-1\ntype: scenario\ntitle: T\nnote: q\na: 2\n---\n");
    expect(
      patch(
        { title: "New" },
        "{id: S-1, type: scenario, title: Old, note: 'q'}",
      ),
    ).toBe("---\nid: S-1\ntype: scenario\ntitle: New\nnote: q\n---\n");
    expect(patch({}, "- a")).toBe(
      "---\ntitle: T\nid: S-1\ntype: scenario\n---\n",
    );
    expect(patch({}, "# note")).toBe(
      "---\ntitle: T\nid: S-1\ntype: scenario\n---\n",
    );
    const longKey = "k".repeat(1100);
    expect(
      patch(
        { title: "New" },
        `id: S-1\ntype: scenario\ntitle: Old\n${quoted}\n${longKey}: 1`,
      ),
    ).toBe(
      `---\nid: S-1\ntype: scenario\ntitle: New\nnote: q\n? ${longKey}\n: 1\n---\n`,
    );
  });
});

describe("symbol manifests", () => {
  const symbol = (extra: object = {}) => ({
    id: "SYM-1",
    type: "symbol",
    title: "x",
    ...extra,
  });
  const manifest = (
    entity: Record<string, unknown>,
    existing: string | undefined,
    relationships?: unknown[],
  ) =>
    renderSourceDocument(
      input("symbol", String(entity.id), { relationships }),
      entity,
      existing,
      ".kb/symbols.yaml",
    );

  test("create a manifest with only authored fields and own relationships", () => {
    expect(
      manifest(
        symbol({
          source: "s",
          created_at: "c",
          updated_at: "u",
          sourceLine: 1,
          coordinatesGeneratedAt: "g",
          relationships: [{ type: "q" }],
        }),
        undefined,
        [
          { from: "SYM-1", type: "implements", to: "REQ-2", note: "n" },
          { from: "SYM-1", type: "implements", to: "REQ-1" },
          { from: "SYM-2", type: "implements", to: "REQ-3" },
          { from: "SYM-1", type: 5, to: "REQ-4" },
          { from: "SYM-1", type: "implements", to: 6 },
        ],
      ),
    ).toBe(
      "symbols:\n  - id: SYM-1\n    title: x\n    relationships:\n      - type: implements\n        target: REQ-1\n      - type: implements\n        note: n\n        target: REQ-2\n",
    );
    expect(manifest(symbol(), undefined)).toBe(
      "symbols:\n  - id: SYM-1\n    title: x\n",
    );
  });

  test("append a new symbol in block style after other entries", () => {
    expect(manifest(symbol(), "symbols: [{id: SYM-0, title: a}]\n")).toBe(
      "symbols:\n  - id: SYM-0\n    title: a\n  - id: SYM-1\n    title: x\n",
    );
    expect(manifest(symbol(), "symbols:\n  - plain\n  - id: SYM-0\n")).toBe(
      "symbols:\n  - plain\n  - id: SYM-0\n  - id: SYM-1\n    title: x\n",
    );
  });

  test("merge every copy of a symbol into the first", () => {
    expect(
      manifest(
        symbol({ title: "y" }),
        "symbols:\n  - id: SYM-1\n    kind: f\n  - id: SYM-0\n  - id: SYM-1\n    extra: 1\n  - id: SYM-1\n  - id: SYM-9\n",
      ),
    ).toBe(
      "symbols:\n  - id: SYM-1\n    kind: f\n    extra: 1\n    title: y\n  - id: SYM-0\n  - id: SYM-9\n",
    );
  });

  test("refuse copies that disagree", () => {
    const conflict = (existing: string, relationships?: unknown[]) =>
      failure(() => manifest(symbol(), existing, relationships));
    const field = conflict(
      "symbols:\n  - id: SYM-1\n    kind: f\n  - id: SYM-1\n    kind: g\n",
    );
    expect(field.code).toBe("SOURCE_DUPLICATE_CONFLICT");
    expect(field.retryable).toBe(false);
    expect(field.message).toBe(
      'Duplicate symbol SYM-1 has conflicting authored field "kind"; no source was written',
    );
    expect(
      conflict("symbols:\n  - id: SYM-1\n    relationships: nope\n").message,
    ).toContain('field "relationships"');
    expect(
      conflict(
        "symbols:\n  - id: SYM-1\n    relationships:\n      - {type: a, target: X, note: n1}\n  - id: SYM-1\n    relationships:\n      - {type: a, target: X, note: n2}\n",
      ).message,
    ).toContain('field "relationship a -> X.note"');
    expect(
      conflict(
        "symbols:\n  - id: SYM-1\n    relationships:\n      - {type: a, target: X, note: n}\n",
        [{ from: "SYM-1", type: "a", to: "X", note: "other" }],
      ).message,
    ).toContain('field "relationship a -> X.note"');
    expect(
      failure(() =>
        manifest({ id: "undefined", type: "symbol" }, "symbols:\n  - [a]\n"),
      ).message,
    ).toContain('field "record"');
  });

  test("merge relationships: typed rows sorted, other rows once each", () => {
    expect(
      manifest(
        symbol(),
        "symbols:\n  - id: SYM-1\n    relationships:\n      - {type: b, target: Y}\n      - {type: a, to: X, note: n}\n      - null\n      - x\n      - x\n      - [1]\n      - [1]\n      - {type: c}\n      - {type: c}\n      - {target: Z}\n  - id: SYM-1\n    relationships:\n      - {type: a, target: X, weight: 2}\n",
      ),
    ).toBe(
      "symbols:\n  - id: SYM-1\n    title: x\n    relationships:\n      - type: a\n        note: n\n        target: X\n        weight: 2\n      - type: b\n        target: Y\n      - null\n      - x\n      - - 1\n      - type: c\n      - target: Z\n",
    );
    expect(
      manifest(
        symbol(),
        "symbols:\n  - id: SYM-1\n    relationships:\n      - {type: a, target: X, note: n}\n",
        [
          { from: "SYM-1", type: "a", to: "X", weight: 1 },
          { from: "SYM-1", type: "b", to: "Y", note: "k" },
        ],
      ),
    ).toBe(
      "symbols:\n  - id: SYM-1\n    title: x\n    relationships:\n      - type: a\n        target: X\n        note: n\n        weight: 1\n      - type: b\n        note: k\n        target: Y\n",
    );
  });

  test("merge links once each and add none when there are none", () => {
    expect(
      manifest(
        symbol({ links: ["REQ-1", "REQ-2"] }),
        "symbols:\n  - id: SYM-1\n    links: REQ-1\n  - id: SYM-1\n    links: [REQ-3, REQ-1]\n",
      ),
    ).toBe(
      "symbols:\n  - id: SYM-1\n    title: x\n    links:\n      - REQ-1\n      - REQ-3\n      - REQ-2\n",
    );
    expect(manifest(symbol(), "symbols:\n  - id: SYM-1\n    kind: f\n")).toBe(
      "symbols:\n  - id: SYM-1\n    kind: f\n    title: x\n",
    );
  });

  test("refuse a manifest without a symbols list", () => {
    for (const existing of [
      "symbols: 5\n",
      "other: 1\n",
      "symbols: {a: 1}\n",
    ]) {
      const error = failure(() => manifest(symbol(), existing));
      expect(error.code).toBe("SOURCE_FORMAT_INVALID");
      expect(error.message).toBe(
        "Symbol manifest must contain a symbols array",
      );
    }
  });

  test("read typed relationships from a manifest entry", () => {
    const entry = parseDocument(
      "id: SYM-1\nrelationships:\n  - {type: a, target: X}\n  - {type: b, to: Y}\n  - {type: 5, target: Z}\n  - {type: c, target: 6}\n  - null\n  - plain\n",
    ).contents;
    expect(manifestRelationships(entry)).toEqual([
      { type: "a", target: "X" },
      { type: "b", target: "Y" },
    ]);
    expect(manifestRelationships(parseDocument("- a").contents)).toEqual([]);
  });
});

describe("source deletions", () => {
  test("delete a Markdown document only when it holds the entity", () => {
    for (const file of ["a.md", "a.MDX"]) {
      expect(
        renderSourceDeletion(file, "REQ-1", "req", "---\nid: REQ-1\n---\n"),
      ).toEqual({ mode: "delete" });
    }
    for (const content of ["---\nid: REQ-2\n---\n", "no front matter"]) {
      const error = failure(() =>
        renderSourceDeletion("a.md", "REQ-1", "req", content),
      );
      expect(error.code).toBe("SOURCE_ENTITY_MISMATCH");
      expect(error.message).toBe(
        "Authored document a.md does not contain REQ-1",
      );
    }
  });

  test("remove every copy of a symbol from a manifest", () => {
    expect(
      renderSourceDeletion(
        "a.yml",
        "SYM-1",
        "symbol",
        "symbols:\n  - id: SYM-1\n  - id: SYM-2 # keep\n  - id: SYM-1\n",
      ),
    ).toEqual({ mode: "write", body: "symbols:\n  - id: SYM-2 # keep\n" });
    const missing = failure(() =>
      renderSourceDeletion(
        "a.yaml",
        "SYM-3",
        "symbol",
        "symbols:\n  - id: SYM-2\n",
      ),
    );
    expect(missing.code).toBe("SOURCE_ENTITY_MISMATCH");
    expect(missing.message).toBe(
      "Symbol manifest a.yaml does not contain SYM-3",
    );
    expect(
      codeOf(() => renderSourceDeletion("a.yaml", "SYM-3", "symbol", "x: 1\n")),
    ).toBe("SOURCE_FORMAT_INVALID");
  });

  test("refuse other formats", () => {
    const yaml = failure(() =>
      renderSourceDeletion("a.yaml", "REQ-1", "req", "symbols: []\n"),
    );
    expect(yaml.code).toBe("SOURCE_FORMAT_UNSUPPORTED");
    expect(yaml.message).toContain("not req");
    const text = failure(() => renderSourceDeletion("a.txt", "X", "req", ""));
    expect(text.code).toBe("SOURCE_FORMAT_UNSUPPORTED");
    expect(text.message).toBe("Unsupported authored source format: .txt");
    expect(
      failure(() => renderSourceDeletion("README", "X", "req", "")).message,
    ).toBe("Unsupported authored source format: unknown");
  });
});

describe("Markdown relationship deletions", () => {
  const selector = { type: "implements", from: "X", to: "REQ-1" };

  test("patch only Markdown documents with front matter", () => {
    const error = failure(() =>
      renderMarkdownRelationshipDeletion("a.yaml", "", selector),
    );
    expect(error.code).toBe("SOURCE_FORMAT_UNSUPPORTED");
    expect(error.message).toContain("Markdown documents: a.yaml");
    for (const content of ["plain", "---\nlinks: [REQ-1]"]) {
      expect(
        renderMarkdownRelationshipDeletion("a.md", content, selector),
      ).toEqual({ body: content, removed: false });
    }
  });

  test("remove every bare link to the target", () => {
    expect(
      renderMarkdownRelationshipDeletion(
        "a.md",
        "---\nid: X\nlinks:\n  - kb:entity/REQ-1\n  - REQ-2\n  - a/kb:entity/REQ-1\n  - 5\n  - REQ-1\n---\n\nBody\n",
        selector,
      ),
    ).toEqual({
      body: "---\nid: X\nlinks:\n  - REQ-2\n  - a/kb:entity/REQ-1\n  - 5\n---\n\nBody\n",
      removed: true,
    });
  });

  test("remove typed and untyped declarations of the same edge", () => {
    expect(
      renderMarkdownRelationshipDeletion(
        "a.mdx",
        "---\nid: X\nrelationships:\n  - {type: implements, target: REQ-1}\n  - {type: other, target: REQ-1}\n  - {target: REQ-1}\n  - {type: implements, to: kb:entity/REQ-1}\n  - REQ-1\n  - [REQ-1]\nlinks:\n  - {type: other, target: REQ-1}\n  - [REQ-1]\n---\nText",
        selector,
      ),
    ).toEqual({
      body: "---\nid: X\nrelationships:\n  - { type: other, target: REQ-1 }\n  - REQ-1\n  - [ REQ-1 ]\nlinks:\n  - [ REQ-1 ]\n---\nText",
      removed: true,
    });
  });

  test("skip aliases and prefixes that are not leading", () => {
    const content =
      "---\nrelationships:\n  - &r {type: other, target: Y}\n  - *r\nlinks:\n  - xkb:entity/R\n---\n";
    expect(
      renderMarkdownRelationshipDeletion("a.md", content, {
        type: "implements",
        from: "X",
        to: "xR",
      }),
    ).toEqual({ body: content, removed: false });
  });

  test("leave a document without the edge byte for byte", () => {
    const content = "---\nid:   X   # c\nlinks: [REQ-2]\n---\n";
    expect(
      renderMarkdownRelationshipDeletion("a.md", content, selector),
    ).toEqual({ body: content, removed: false });
  });

  test("close the front matter of a document without a body", () => {
    expect(
      renderMarkdownRelationshipDeletion(
        "a.md",
        "---\nlinks: [REQ-1]\n---",
        selector,
      ),
    ).toEqual({ body: "---\nlinks: []\n---\n", removed: true });
  });
});

describe("manifest relationship deletions", () => {
  const selector = (type = "implements") => ({
    type,
    from: "SYM-1",
    to: "REQ-1",
  });

  test("patch only valid YAML symbol manifests", () => {
    const format = failure(() =>
      renderYamlRelationshipDeletion("a.md", "", selector()),
    );
    expect(format.code).toBe("SOURCE_FORMAT_UNSUPPORTED");
    expect(format.message).toContain("YAML symbol manifests: a.md");
    const invalid = failure(() =>
      renderYamlRelationshipDeletion("a.yml", "symbols: [\n", selector()),
    );
    expect(invalid.code).toBe("SOURCE_FORMAT_INVALID");
    expect(invalid.message).toStartWith(
      "Symbol manifest contains invalid YAML: Flow sequence",
    );
    const list = failure(() =>
      renderYamlRelationshipDeletion("a.yml", "x: 1\n", selector()),
    );
    expect(list.code).toBe("SOURCE_FORMAT_INVALID");
    const absent = "symbols:\n  - plain\n  - id: SYM-2\n";
    expect(
      renderYamlRelationshipDeletion("a.yaml", absent, selector()),
    ).toEqual({
      body: absent,
      removed: false,
    });
  });

  test("remove the exact typed edge and its legacy links", () => {
    expect(
      renderYamlRelationshipDeletion(
        "a.yml",
        "symbols:\n  - plain\n  - id: SYM-1\n    relationships:\n      - {type: implements, target: REQ-1}\n      - {type: implements, to: kb:entity/REQ-1}\n      - {type: verifies, target: REQ-1}\n      - {type: implements, target: 5}\n      - junk\n    links: [REQ-1, REQ-2, REQ-1, 7]\n",
        selector(),
      ),
    ).toEqual({
      body: "symbols:\n  - plain\n  - id: SYM-1\n    relationships:\n      - { type: verifies, target: REQ-1 }\n      - { type: implements, target: 5 }\n      - junk\n    links: [ REQ-2, 7 ]\n",
      removed: true,
    });
    expect(
      renderYamlRelationshipDeletion(
        "a.yml",
        "symbols:\n  - id: SYM-1\n    links: [REQ-1]\n    kind: f\n",
        selector(),
      ),
    ).toEqual({
      body: "symbols:\n  - id: SYM-1\n    kind: f\n",
      removed: true,
    });
  });

  test("keep links for other edge types and report nothing removed", () => {
    const content = "symbols:\n  - id: SYM-1\n    links: [REQ-1]\n";
    expect(
      renderYamlRelationshipDeletion("a.yml", content, selector("verifies")),
    ).toEqual({ body: content, removed: false });
  });
});

function gitWorkspace(): string {
  const root = workspace();
  execFileSync("git", ["-C", root, "init", "-q"], { stdio: "ignore" });
  return root;
}

describe("Git tracking", () => {
  test("tell untracked files from tracked ones and from no repository", () => {
    const root = gitWorkspace();
    fs.writeFileSync(path.join(root, "tracked.md"), "t");
    fs.writeFileSync(path.join(root, "untracked.md"), "u");
    execFileSync("git", ["-C", root, "add", "tracked.md"], { stdio: "ignore" });
    expect(isUntrackedByGit(root, "tracked.md")).toBe(false);
    expect(isUntrackedByGit(root, "untracked.md")).toBe(true);
    expect(isUntrackedByGit(workspace(), "untracked.md")).toBe(false);
  });
});

type Call = string;

/** A node filesystem that records its calls and can drop or replace methods. */
function recordingPort(
  calls: Call[],
  options: {
    omit?: ReadonlyArray<"rename" | "unlink">;
    rename?: (from: string, to: string) => Promise<void>;
    unlink?: (file: string) => Promise<void>;
  } = {},
): FilesystemPort {
  const label = (file: string) =>
    path
      .basename(file)
      .replace(/\.kibi-source-.*$/, ".source-temp")
      .replace(/\.kibi-rollback-.*$/, ".rollback-temp");
  const port: FilesystemPort = {
    readFile: async (file) => {
      calls.push(`read ${label(file)}`);
      return nodeFilesystem.readFile(file);
    },
    writeFile: async (file, data) => {
      calls.push(`write ${label(file)}`);
      return nodeFilesystem.writeFile(file, data);
    },
    mkdir: async (dir) => {
      calls.push(`mkdir ${label(dir)}`);
      return nodeFilesystem.mkdir(dir);
    },
    stat: (file) => nodeFilesystem.stat(file),
  };
  if (!options.omit?.includes("rename")) {
    port.rename = async (from, to) => {
      calls.push(`rename ${label(from)} ${label(to)}`);
      return (options.rename ?? nodeFilesystem.rename)?.(from, to);
    };
  }
  if (!options.omit?.includes("unlink")) {
    port.unlink = async (file) => {
      calls.push(`unlink ${label(file)}`);
      return (options.unlink ?? nodeFilesystem.unlink)?.(file);
    };
  }
  return port;
}

const scenarioInput = (extra: object = {}) =>
  input("scenario", "S-1", { document: { path: "docs/a.md" }, ...extra });
const scenarioEntity = { id: "S-1", type: "scenario", title: "T" };
const rendered = "---\ntitle: T\nid: S-1\ntype: scenario\n---\n";

describe("rendering a source write", () => {
  test("report the workspace path with forward slashes", async () => {
    const root = workspace();
    const result = await renderSourceWrite(
      input("scenario", "S-1", { document: { path: "docs\\x.md" } }),
      scenarioEntity,
      undefined,
      context(root) as OperationContext & { fs: FilesystemPort },
    );
    expect(result.relative).toBe("docs/x.md");
    expect(result.before).toBeUndefined();
    expect(result.after).toBe(rendered);
  });

  test("publish override bytes only over an existing document", async () => {
    const root = workspace();
    const ctx = context(root) as OperationContext & { fs: FilesystemPort };
    const fresh = await renderSourceWrite(
      scenarioInput(),
      scenarioEntity,
      undefined,
      ctx,
      "override",
    );
    expect(fresh.after).toBe(rendered);
    fs.mkdirSync(path.join(root, "docs"));
    fs.writeFileSync(path.join(root, "docs/a.md"), "---\nid: S-1\n---\n");
    const existing = await renderSourceWrite(
      scenarioInput(),
      scenarioEntity,
      undefined,
      ctx,
      "override",
    );
    expect(existing).toEqual({
      absolute: path.join(root, "docs/a.md"),
      relative: "docs/a.md",
      before: "---\nid: S-1\n---\n",
      after: "override",
    });
    const plain = await renderSourceWrite(
      scenarioInput(),
      scenarioEntity,
      undefined,
      ctx,
    );
    expect(plain.after).toBe("---\nid: S-1\ntitle: T\ntype: scenario\n---\n");
  });
});

describe("writing a source for an upsert", () => {
  const write = (ctx: OperationContext | undefined, extra: object = {}) =>
    writeSourceForUpsert(scenarioInput(extra), scenarioEntity, undefined, ctx);
  const target = (root: string) => path.join(root, "docs/a.md");
  const prepare = (root: string, content: string) => {
    fs.mkdirSync(path.join(root, "docs"), { recursive: true });
    fs.writeFileSync(target(root), content);
  };
  const leftovers = (root: string) =>
    fs.readdirSync(path.join(root, "docs")).filter((name) => name !== "a.md");

  test("write nothing without a filesystem", async () => {
    expect(await write(undefined)).toBeNull();
    expect(await write({ ...context(workspace()), fs: undefined })).toBeNull();
  });

  test("publish a new document through a renamed temp file", async () => {
    const root = workspace();
    const calls: Call[] = [];
    const result = await write(context(root, recordingPort(calls)));
    expect(result?.receipt).toEqual({
      path: "docs/a.md",
      mode: "write",
      beforeHash: null,
      afterHash: sha(rendered),
      created: true,
    });
    expect(fs.readFileSync(target(root), "utf8")).toBe(rendered);
    expect(calls).toEqual([
      "read a.md",
      "mkdir docs",
      "write a.md.source-temp",
      "rename a.md.source-temp a.md",
    ]);
    expect(leftovers(root)).toEqual([]);
    const receipt = JSON.parse(
      fs.readFileSync(receiptFile(root, "docs/a.md"), "utf8"),
    );
    expect(receipt.afterHash).toBe(sha(rendered));
  });

  test("leave a tracked document without a receipt", async () => {
    const root = workspace();
    prepare(root, "---\nid: S-1\n---\n");
    const result = await write(context(root));
    expect(result?.receipt).toEqual({
      path: "docs/a.md",
      mode: "write",
      beforeHash: sha("---\nid: S-1\n---\n"),
      afterHash: sha("---\nid: S-1\ntitle: T\ntype: scenario\n---\n"),
      created: false,
    });
    expect(fs.existsSync(receiptFile(root, "docs/a.md"))).toBe(false);
  });

  test("republish the receipt of an existing or untracked document", async () => {
    const root = workspace();
    prepare(root, "---\nid: S-1\n---\n");
    writePendingSourceReceipt(root, "docs/a.md", "old");
    const result = await write(context(root));
    const receipt = JSON.parse(
      fs.readFileSync(receiptFile(root, "docs/a.md"), "utf8"),
    );
    expect(receipt.afterHash).toBe(result?.receipt.afterHash);
    const git = gitWorkspace();
    prepare(git, "---\nid: S-1\n---\n");
    await write(context(git));
    expect(fs.existsSync(receiptFile(git, "docs/a.md"))).toBe(true);
  });

  test("write in place on a port without rename", async () => {
    const root = workspace();
    const calls: Call[] = [];
    await write(context(root, recordingPort(calls, { omit: ["rename"] })));
    expect(calls.slice(2)).toEqual([
      "write a.md.source-temp",
      "write a.md",
      "unlink a.md.source-temp",
    ]);
    expect(leftovers(root)).toEqual([]);
    const bare = workspace();
    await write(
      context(bare, recordingPort([], { omit: ["rename", "unlink"] })),
    );
    expect(fs.readFileSync(target(bare), "utf8")).toBe(rendered);
  });

  test("remove the temp file when the rename fails", async () => {
    const root = workspace();
    const calls: Call[] = [];
    const failed = new Error("rename failed");
    const rename = async () => {
      throw failed;
    };
    await expect(
      write(context(root, recordingPort(calls, { rename }))),
    ).rejects.toBe(failed);
    expect(calls.at(-1)).toBe("unlink a.md.source-temp");
    expect(leftovers(root)).toEqual([]);
    await expect(
      write(
        context(workspace(), recordingPort([], { rename, omit: ["unlink"] })),
      ),
    ).rejects.toBe(failed);
  });

  test("roll a new document back, with the receipt it found", async () => {
    const root = workspace();
    const result = await write(context(root));
    await result?.rollback();
    expect(fs.existsSync(target(root))).toBe(false);
    expect(fs.existsSync(receiptFile(root, "docs/a.md"))).toBe(false);

    const prior = workspace();
    writePendingSourceReceipt(prior, "docs/a.md", "prior");
    const bytes = fs.readFileSync(receiptFile(prior, "docs/a.md"), "utf8");
    const again = await write(context(prior));
    await again?.rollback();
    expect(fs.readFileSync(receiptFile(prior, "docs/a.md"), "utf8")).toBe(
      bytes,
    );

    const bare = workspace();
    const blank = await write(
      context(bare, recordingPort([], { omit: ["unlink"] })),
    );
    await blank?.rollback();
    expect(fs.readFileSync(target(bare), "utf8")).toBe("");
  });

  test("roll an existing document back to its bytes, times and receipt", async () => {
    const root = gitWorkspace();
    prepare(root, "before");
    const old = new Date("2020-01-02T03:04:05.000Z");
    fs.utimesSync(target(root), old, old);
    const calls: Call[] = [];
    const result = await write(context(root, recordingPort(calls)));
    expect(fs.existsSync(receiptFile(root, "docs/a.md"))).toBe(true);
    calls.length = 0;
    await result?.rollback();
    expect(calls).toEqual([
      "read a.md",
      "write a.md.rollback-temp",
      "rename a.md.rollback-temp a.md",
    ]);
    expect(fs.readFileSync(target(root), "utf8")).toBe("before");
    expect(fs.statSync(target(root)).mtime.toISOString()).toBe(
      old.toISOString(),
    );
    expect(fs.existsSync(receiptFile(root, "docs/a.md"))).toBe(false);

    writePendingSourceReceipt(root, "docs/a.md", "prior");
    const bytes = fs.readFileSync(receiptFile(root, "docs/a.md"), "utf8");
    const again = await write(context(root));
    await again?.rollback();
    expect(fs.readFileSync(receiptFile(root, "docs/a.md"), "utf8")).toBe(bytes);
  });

  test("restore a vanished document and write in place without rename", async () => {
    const root = workspace();
    prepare(root, "before");
    const calls: Call[] = [];
    const result = await write(
      context(root, recordingPort(calls, { omit: ["rename"] })),
    );
    fs.rmSync(target(root));
    calls.length = 0;
    await result?.rollback();
    expect(calls).toEqual([
      "read a.md",
      "write a.md.rollback-temp",
      "write a.md",
      "unlink a.md.rollback-temp",
    ]);
    expect(fs.readFileSync(target(root), "utf8")).toBe("before");
    expect(leftovers(root)).toEqual([]);
  });

  test("keep bytes a concurrent writer published", async () => {
    const root = workspace();
    const result = await write(context(root));
    fs.writeFileSync(target(root), "newer");
    fs.rmSync(receiptFile(root, "docs/a.md"));
    const warn = spyOn(console, "warn").mockImplementation(() => {});
    restores.push(() => warn.mockRestore());
    await result?.rollback();
    expect(fs.readFileSync(target(root), "utf8")).toBe("newer");
    const receipt = JSON.parse(
      fs.readFileSync(receiptFile(root, "docs/a.md"), "utf8"),
    );
    expect(receipt.afterHash).toBe(sha(rendered));
    expect(warn).toHaveBeenCalledWith(
      "Skipped source rollback for docs/a.md: file changed after the Kibi write; kept concurrent content and recorded recovery metadata.",
    );
  });

  test("clean up a rollback temp file whose rename fails", async () => {
    const failed = new Error("rollback rename failed");
    const rename = async (from: string, to: string) => {
      if (from.includes(".kibi-rollback-")) throw failed;
      return nodeFilesystem.rename?.(from, to);
    };
    const root = workspace();
    prepare(root, "before");
    const calls: Call[] = [];
    const result = await write(context(root, recordingPort(calls, { rename })));
    await expect(result?.rollback()).rejects.toBe(failed);
    expect(calls.at(-1)).toBe("unlink a.md.rollback-temp");
    expect(leftovers(root)).toEqual([]);

    const bare = workspace();
    prepare(bare, "before");
    const plain = await write(
      context(bare, recordingPort([], { rename, omit: ["unlink"] })),
    );
    await expect(plain?.rollback()).rejects.toBe(failed);
  });

  test("unwind the write when its receipt cannot be published", async () => {
    const failed = new Error("receipt failed");
    const spy = spyOn(
      authoring,
      "writePendingSourceReceipt",
    ).mockImplementation(() => {
      throw failed;
    });
    restores.push(() => spy.mockRestore());
    const root = workspace();
    await expect(write(context(root))).rejects.toBe(failed);
    expect(fs.existsSync(target(root))).toBe(false);

    const broken = workspace();
    const unlink = async () => {
      throw new Error("unlink failed");
    };
    const error = await write(
      context(broken, recordingPort([], { unlink })),
    ).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors[0]).toBe(failed);
    expect((error as AggregateError).message).toBe(
      "Source published for docs/a.md, but pending receipt publication and rollback both failed; recover from the pending-source receipt or restore the authored file manually",
    );
  });

  test("restore a lost prior receipt as an owner-only file", async () => {
    for (const before of [undefined, "before"]) {
      const root = workspace();
      if (before !== undefined) prepare(root, before);
      writePendingSourceReceipt(root, "docs/a.md", "prior");
      const file = receiptFile(root, "docs/a.md");
      const bytes = fs.readFileSync(file, "utf8");
      const spy = spyOn(
        authoring,
        "writePendingSourceReceipt",
      ).mockImplementation(() => {
        fs.rmSync(file);
        throw new Error("receipt failed");
      });
      await expect(write(context(root))).rejects.toThrow("receipt failed");
      spy.mockRestore();
      expect(fs.readFileSync(file, "utf8")).toBe(bytes);
      expect(modeOf(file)).toBe(0o600);
    }
  });
});
