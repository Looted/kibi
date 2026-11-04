import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { sourceExtractionRemediation } from "../../../src/commands/sync/cache.js";
import type { UpsertInput } from "../../../src/operations/mutation/types.js";
import {
  type UncompiledAuthoredSource,
  assertAuthoredWriteCompiles,
  authoredEntityLookup,
  readUncompiledAuthoredSource,
} from "../../../src/operations/mutation/uncompiled-source.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";
import type { BranchAttachment } from "../../../src/utils/branch-resolver.js";
import { branchStorePath } from "../../../src/utils/branch-store-locator.js";

const COMPILES =
  "---\nid: REQ-a\ntitle: Drafts\ntype: req\nstatus: open\n---\n\nBody.\n";
const FAILS =
  "---\nid: REQ-a\ntitle: Drafts\ntype: req\nstatus: wip\n---\n\nBody.\n";
const REL = ".kb/requirements/REQ-a.md";

let root = "";
beforeEach(() => {
  root = realpathSync(mkdtempSync(path.join(os.tmpdir(), "kibi-uncompiled-")));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function write(relative: string, content: string): string {
  const absolute = path.join(root, relative);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, content);
  return absolute;
}

const ATTACHED: BranchAttachment = {
  gitBranch: "main",
  kbBranch: "main",
  storePath: "unused",
  kind: "exact",
  migrationRequired: false,
};

function contextWith(
  extra: Partial<OperationContext> & { noFs?: boolean } = {},
): OperationContext {
  const { noFs, ...rest } = extra;
  return {
    workspaceRoot: root,
    signal: new AbortController().signal,
    clock: () => new Date(0),
    ...(noFs
      ? {}
      : {
          fs: {
            readFile: async (file: string) => readFileSync(file, "utf8"),
            writeFile: async () => {},
            mkdir: async () => {},
            stat: async () => ({
              isFile: () => true,
              isDirectory: () => false,
            }),
          },
        }),
    branchAttachment: ATTACHED,
    ...rest,
  };
}

function input(extra: Partial<UpsertInput> = {}): UpsertInput {
  return {
    id: "REQ-a",
    type: "req",
    properties: { title: "Drafts", status: "open" },
    ...extra,
  } as UpsertInput;
}

function recordFailure(relative: string, failure: Record<string, unknown>) {
  const store = branchStorePath(root, "main");
  mkdirSync(store, { recursive: true });
  writeFileSync(
    path.join(store, "sync-cache.json"),
    JSON.stringify({ extractionFailures: { [relative]: failure } }),
  );
}

describe("readUncompiledAuthoredSource", () => {
  test("reads a compiling file that declares the entity", async () => {
    const absolute = write(REL, COMPILES);
    const source = await readUncompiledAuthoredSource(contextWith(), input());
    expect(source).toMatchObject({
      path: REL,
      absolute,
      content: COMPILES,
      stored: { id: "REQ-a", type: "req", title: "Drafts", status: "open" },
      extractionError: null,
      syncFailure: undefined,
    });
    expect(Object.keys(source ?? {}).sort()).toStrictEqual([
      "absolute",
      "content",
      "extractionError",
      "path",
      "stored",
      "syncFailure",
    ]);
  });

  test("carries the last sync failure recorded for the file", async () => {
    write(REL, FAILS);
    const failure = { hash: "h", message: "bad status", baseline: true };
    recordFailure(REL, failure);
    const source = await readUncompiledAuthoredSource(contextWith(), input());
    expect(source?.syncFailure).toStrictEqual(failure);
    write(".kb/requirements/REQ-b.md", COMPILES.replace("REQ-a", "REQ-b"));
    recordFailure(".kb/requirements/REQ-b.md", failure);
    expect(
      (
        await readUncompiledAuthoredSource(
          contextWith(),
          input({ id: "REQ-b" }),
        )
      )?.syncFailure,
    ).toStrictEqual(failure);
  });

  test("records no failure without a branch store", async () => {
    write(REL, FAILS);
    recordFailure(REL, { hash: "h", message: "m" });
    const source = await readUncompiledAuthoredSource(
      contextWith({
        branchAttachment: undefined as unknown as BranchAttachment,
      }),
      input(),
    );
    expect(source?.syncFailure).toBeUndefined();
    expect(source?.extractionError).toContain("/status");
  });

  test("is off for a runtime that writes the store directly", async () => {
    write(REL, COMPILES);
    expect(
      await readUncompiledAuthoredSource(
        contextWith({ sourceFirst: false }),
        input(),
      ),
    ).toBeNull();
    expect(
      await readUncompiledAuthoredSource(
        contextWith({ sourceFirst: true }),
        input(),
      ),
    ).not.toBeNull();
    expect(
      await readUncompiledAuthoredSource(contextWith({ noFs: true }), input()),
    ).toBeNull();
  });

  test("never reads a symbol's file", async () => {
    write("docs/sym.md", COMPILES.replace("type: req", "type: symbol"));
    expect(
      await readUncompiledAuthoredSource(
        contextWith(),
        input({ type: "symbol", document: { path: "docs/sym.md" } } as never),
      ),
    ).toBeNull();
  });

  test("reads only markdown targets", async () => {
    for (const [file, found] of [
      ["docs/a.md.txt", false],
      ["docs/a.MD", true],
      ["docs/a.mdx", true],
      ["docs/a.m", false],
    ] as const) {
      write(file, COMPILES);
      const source = await readUncompiledAuthoredSource(
        contextWith(),
        input({ document: { path: file } } as never),
      );
      expect([file, source !== null]).toStrictEqual([file, found]);
    }
    expect(
      await readUncompiledAuthoredSource(
        contextWith(),
        input({ type: "no-such-type" } as never),
      ),
    ).toBeNull();
  });

  test("skips a missing file or one that declares another entity", async () => {
    expect(
      await readUncompiledAuthoredSource(contextWith(), input()),
    ).toBeNull();
    write(REL, COMPILES.replace("id: REQ-a", "id: REQ-other"));
    expect(
      await readUncompiledAuthoredSource(contextWith(), input()),
    ).toBeNull();
    write(REL, FAILS.replace("id: REQ-a", "id: REQ-other"));
    expect(
      await readUncompiledAuthoredSource(contextWith(), input()),
    ).toBeNull();
    write(REL, FAILS.replace("type: req", "type: scenario"));
    expect(
      await readUncompiledAuthoredSource(contextWith(), input()),
    ).toBeNull();
  });

  test("states the input's id and type over a failing file's front matter", async () => {
    write(REL, "---\ntitle: Drafts\nstatus: wip\n---\n\nBody.\n");
    const source = await readUncompiledAuthoredSource(contextWith(), input());
    expect(source?.stored).toStrictEqual({
      title: "Drafts",
      status: "wip",
      id: "REQ-a",
      type: "req",
    });
  });

  test("refuses a file whose front matter does not parse", async () => {
    write(REL, "---\nid: [unterminated\n---\n\nBody.\n");
    const refusal = await readUncompiledAuthoredSource(
      contextWith(),
      input(),
    ).catch((error: { code: string; message: string }) => error);
    expect((refusal as { code: string }).code).toBe("UNCOMPILED_SOURCE");
    expect((refusal as { message: string }).message).toStartWith(
      `Upsert of REQ-a refused: ${REL} exists but kibi sync cannot compile it (`,
    );
  });
});

function sourceWith(
  extra: Partial<UncompiledAuthoredSource> = {},
): UncompiledAuthoredSource {
  return {
    path: REL,
    absolute: path.join("/ws", REL),
    content: FAILS,
    stored: { id: "REQ-a" },
    extractionError: "bad status",
    syncFailure: undefined,
    ...extra,
  };
}

describe("authoredEntityLookup", () => {
  test("reads the file's own state", async () => {
    const source = sourceWith();
    const lookup = authoredEntityLookup(source);
    expect(await lookup.exists()).toBe(true);
    expect(await lookup.entity()).toBe(source.stored);
    expect(lookup.keepsSemanticBaseline?.("h")).toBe(false);
  });

  test("keeps the baseline the last failure recorded", () => {
    const keeps = authoredEntityLookup(
      sourceWith({ syncFailure: { hash: "x", message: "m", baseline: true } }),
    ).keepsSemanticBaseline;
    expect(keeps?.("h")).toBe(true);
    const hashed = authoredEntityLookup(
      sourceWith({
        syncFailure: { hash: "x", message: "m", semanticHash: "h" },
      }),
    ).keepsSemanticBaseline;
    expect([hashed?.("h"), hashed?.("other")]).toStrictEqual([true, false]);
  });
});

describe("assertAuthoredWriteCompiles", () => {
  const entity = (status: string) => ({
    id: "REQ-a",
    type: "req",
    title: "Drafts",
    status,
  });

  test("returns the relationships of a file that compiles", () => {
    expect(
      assertAuthoredWriteCompiles(sourceWith(), input(), entity("open")),
    ).toStrictEqual([]);
  });

  test("refuses a write that leaves the file uncompilable", () => {
    for (const extractionError of ["bad status", null]) {
      let refusal: { code?: string; message?: string } = {};
      try {
        assertAuthoredWriteCompiles(
          sourceWith({ extractionError }),
          input(),
          entity("wip"),
        );
      } catch (error) {
        refusal = error as { code: string; message: string };
      }
      const message = refusal.message ?? "";
      const cause = message.slice(
        message.indexOf("uncompilable: ") + "uncompilable: ".length,
        message.indexOf(
          `. ${sourceExtractionRemediation(REL, "")}`.slice(0, 2),
        ),
      );
      expect(refusal.code).toBe("UNCOMPILED_SOURCE");
      expect(message).toStartWith(
        `Upsert of REQ-a refused: REQ-a exists in ${REL} but is not compiled${extractionError === null ? "" : " (bad status)"}, and this write would leave the file uncompilable: `,
      );
      expect(cause).toContain("/status");
    }
  });
});
