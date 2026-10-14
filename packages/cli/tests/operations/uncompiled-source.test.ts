import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  SOURCE_EXTRACTION_FAILED,
  SYNC_CACHE_VERSION,
  hashFile,
  sourceExtractionFailureReasons,
  sourceExtractionRemediation,
} from "../../src/commands/sync/cache.js";
import { processExtractions } from "../../src/commands/sync/extraction.js";
import {
  assertAuthoredWriteCompiles,
  authoredEntityLookup,
  readUncompiledAuthoredSource,
} from "../../src/operations/mutation/uncompiled-source.js";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";

// implements REQ-kibi-uncompiled-source-visibility

function context(root: string): OperationContext {
  return {
    workspaceRoot: root,
    signal: new AbortController().signal,
    clock: () => new Date("2026-10-14T00:00:00Z"),
    fs: {
      readFile: async (file) => readFileSync(file, "utf8"),
      writeFile: async (file, data) => writeFileSync(file, data),
      mkdir: async (dir) => {
        mkdirSync(dir, { recursive: true });
      },
      stat: async () => ({ isFile: () => true, isDirectory: () => false }),
    },
  };
}

function write(root: string, relative: string, content: string): string {
  const absolute = path.join(root, relative);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, content);
  return absolute;
}

const LEGACY =
  "---\nid: REQ-a\ntitle: Drafts\ntype: req\nstatus: implemented\nsemantic_text: The editor must save drafts.\norigin:\n  kind: migration\n---\n\nThe editor must save drafts.\n";

describe("authored sources sync cannot extract", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), "kibi-uncompiled-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  test("sync reports every failed source, in every mode", async () => {
    const file = write(root, ".kb/requirements/REQ-a.md", LEGACY);
    const result = await processExtractions([file], [], false, root);
    expect(result.errors).toEqual([]);
    expect(result.failures).toEqual([
      { file, message: expect.stringContaining("/status") },
    ]);
  });

  test("kb_status reasons name each failed file that still has the failing bytes", () => {
    const failing = write(root, ".kb/requirements/REQ-a.md", LEGACY);
    write(root, ".kb/requirements/REQ-b.md", "edited since");
    const store = path.join(root, "store");
    mkdirSync(store);
    writeFileSync(
      path.join(store, "sync-cache.json"),
      JSON.stringify({
        version: SYNC_CACHE_VERSION,
        hashes: {},
        seenAt: {},
        semanticHashes: {},
        semanticContracts: {},
        extractionFailures: {
          ".kb/requirements/REQ-a.md": {
            hash: hashFile(root, failing),
            message: "Entity validation failed: /status: bad",
          },
          ".kb/requirements/REQ-b.md": { hash: "old", message: "x" },
          ".kb/requirements/REQ-gone.md": { hash: "old", message: "x" },
        },
      }),
    );

    expect(sourceExtractionFailureReasons(root, store)).toEqual([
      {
        code: SOURCE_EXTRACTION_FAILED,
        path: ".kb/requirements/REQ-a.md",
        entityIds: [],
        detail:
          ".kb/requirements/REQ-a.md cannot be compiled, so the entities it declares are missing from the KB: Entity validation failed: /status: bad",
        remediation: expect.stringContaining("kibi migrate --yes"),
        blocking: true,
      },
    ]);
    expect(
      sourceExtractionFailureReasons(root, path.join(root, "none")),
    ).toEqual([]);
    expect(sourceExtractionRemediation("x.md", "bad yaml")).toContain(
      "Fix the front matter of x.md",
    );
  });

  test("an upsert of an entity the store lacks reads the file it would merge into", async () => {
    expect(
      await readUncompiledAuthoredSource(context(root), {
        id: "REQ-a",
        type: "req",
        properties: { title: "Drafts", status: "closed" },
      }),
    ).toBeNull();

    write(root, ".kb/requirements/REQ-a.md", LEGACY);
    const input = {
      id: "REQ-a",
      type: "req",
      properties: { title: "Drafts", status: "closed" },
    };
    const source = await readUncompiledAuthoredSource(context(root), input);
    expect(source).toMatchObject({
      path: ".kb/requirements/REQ-a.md",
      extractionError: expect.stringContaining("/status"),
      stored: {
        id: "REQ-a",
        status: "implemented",
        semantic_text: "The editor must save drafts.",
        origin: { kind: "migration" },
      },
    });
    if (source === null) throw new Error("expected the authored source");
    expect(await authoredEntityLookup(source).entity()).toBe(source.stored);
    // Closing it compiles, so the write may proceed to the other checks.
    expect(
      assertAuthoredWriteCompiles(source, input, {
        id: "REQ-a",
        type: "req",
        title: "Drafts",
        status: "closed",
      }),
    ).toEqual([]);
    // A file that declares another entity is not this entity's history.
    write(root, ".kb/requirements/REQ-c.md", LEGACY);
    expect(
      await readUncompiledAuthoredSource(context(root), {
        ...input,
        id: "REQ-c",
      }),
    ).toBeNull();
  });

  test("a write that leaves the file uncompilable, or a file that does not parse, is refused", async () => {
    write(
      root,
      ".kb/requirements/REQ-a.md",
      "---\nid: REQ-a\ntitle: Drafts\ntype: req\nstatus: wip\npriority: 5\n---\n\nBody.\n",
    );
    const input = {
      id: "REQ-a",
      type: "req",
      properties: { title: "Drafts", status: "open" },
    };
    const source = await readUncompiledAuthoredSource(context(root), input);
    if (source === null) throw new Error("expected the authored source");
    let refusal = "";
    try {
      assertAuthoredWriteCompiles(source, input, {
        id: "REQ-a",
        type: "req",
        title: "Drafts",
        status: "open",
      });
    } catch (error) {
      refusal = (error as Error).message;
    }
    expect(refusal).toContain(
      "Upsert of REQ-a refused: REQ-a exists in .kb/requirements/REQ-a.md but is not compiled (Entity validation failed: /status",
    );
    expect(refusal).toContain(
      "this write would leave the file uncompilable: Entity validation failed: /priority",
    );

    write(
      root,
      ".kb/requirements/REQ-b.md",
      "---\nid: [unterminated\n---\n\nBody.\n",
    );
    await expect(
      readUncompiledAuthoredSource(context(root), { ...input, id: "REQ-b" }),
    ).rejects.toThrow(
      "Upsert of REQ-b refused: .kb/requirements/REQ-b.md exists but kibi sync cannot compile it",
    );
  });
});
