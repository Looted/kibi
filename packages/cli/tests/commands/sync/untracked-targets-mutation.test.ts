import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import {
  adoptUpsertOnlySymbolManifest,
  findUntrackedDocumentMatches,
} from "../../../src/commands/sync/untracked-targets.js";
import {
  createGitWorkspace,
  createTempDir,
  removeTempDir,
} from "../../helpers/in-process-workspace.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) removeTempDir(root);
});

function tempRoot(): string {
  const root = createTempDir("kibi-untracked-mut-");
  roots.push(root);
  return root;
}

const receiptPath = (root: string, relative: string) =>
  path.join(
    root,
    ".kb",
    "recovery",
    "pending-sources",
    `${createHash("sha256").update(relative).digest("hex")}.json`,
  );

/** In-memory untracked files keyed by workspace-relative path. */
function fakeDeps(
  root: string,
  files: Record<string, string>,
  calls: unknown[][] = [],
) {
  // Git may list a path with backslashes; the file itself has slashes.
  const stored = Object.fromEntries(
    Object.entries(files).map(([key, value]) => [
      key.replaceAll("\\", "/"),
      value,
    ]),
  );
  return {
    execFileSync: (file: string, args: readonly string[], options: unknown) => {
      calls.push([file, args, options]);
      return `${Object.keys(files).join("\0")}\0`;
    },
    existsSync: (absolute: string) =>
      Object.hasOwn(stored, path.relative(root, absolute)),
    readFileSync: (absolute: string) => {
      const content = stored[path.relative(root, absolute)];
      if (content === "UNREADABLE") throw new Error("unreadable");
      return content as string;
    },
  };
}

const doc = (id: string) => `---\nid: ${id}\n---\nbody\n`;

describe("findUntrackedDocumentMatches", () => {
  test("asks Git nothing when no id is missing", () => {
    const calls: unknown[][] = [];
    const root = tempRoot();
    expect(
      findUntrackedDocumentMatches(
        root,
        [],
        fakeDeps(root, { ".kb/a.md": doc("A") }, calls),
      ),
    ).toStrictEqual(new Map());
    expect(calls).toStrictEqual([]);
  });

  test("lists untracked .kb files once with bounded output", () => {
    const calls: unknown[][] = [];
    const root = tempRoot();
    findUntrackedDocumentMatches(root, ["A"], fakeDeps(root, {}, calls));
    expect(calls).toStrictEqual([
      [
        "git",
        [
          "-C",
          root,
          "ls-files",
          "--others",
          "--exclude-standard",
          "-z",
          "--",
          ".kb",
        ],
        { encoding: "utf8", maxBuffer: 16 * 1024 * 1024, stdio: "pipe" },
      ],
    ]);
  });

  test("matches only missing ids in markdown documents and manifests", () => {
    const root = tempRoot();
    const files = {
      ".kb/notes.txt": doc("TXT"),
      ".kb/req\\a.md": doc("A"),
      ".kb/b.md": doc("NOT-MISSING"),
      ".kb/unreadable.md": "UNREADABLE",
      ".kb/symbols.yaml":
        "symbols:\n  - id: SYM-1\n  - id: 7\n  - plain\n  - null\n",
      ".kb/symbol-coordinates.yaml": "symbols:\n  - id: SYM-2\n",
      ".kb/c.md": doc("A"),
    };
    const matches = findUntrackedDocumentMatches(
      root,
      ["A", "TXT", "SYM-1", "SYM-2", "7", "plain"],
      fakeDeps(root, files),
    );
    expect(matches).toStrictEqual(
      new Map([
        ["A", ".kb/req/a.md"],
        ["SYM-1", ".kb/symbols.yaml"],
        ["SYM-2", ".kb/symbol-coordinates.yaml"],
      ]),
    );
  });

  test("ignores documents whose id is not missing", () => {
    const root = tempRoot();
    const deps = fakeDeps(root, {
      ".kb/a.md": doc("PRESENT"),
      ".kb/b.md": "no front matter\n",
      ".kb/c.md": doc("MISSING"),
    });
    expect(
      findUntrackedDocumentMatches(root, ["MISSING", "OTHER"], deps),
    ).toStrictEqual(new Map([["MISSING", ".kb/c.md"]]));
  });

  test("skips listed files that are gone or covered by a receipt", () => {
    const root = tempRoot();
    const deps = fakeDeps(root, { ".kb/a.md": doc("A"), ".kb/b.md": doc("B") });
    const gone = { ...deps, existsSync: () => false };
    expect(findUntrackedDocumentMatches(root, ["A"], gone)).toStrictEqual(
      new Map(),
    );
    mkdirSync(path.dirname(receiptPath(root, ".kb/a.md")), { recursive: true });
    writeFileSync(receiptPath(root, ".kb/a.md"), "{}");
    expect(findUntrackedDocumentMatches(root, ["A", "B"], deps)).toStrictEqual(
      new Map([["B", ".kb/b.md"]]),
    );
  });

  test("stops reading once every id is matched", () => {
    const root = tempRoot();
    const read: string[] = [];
    const deps = fakeDeps(root, { ".kb/a.md": doc("A"), ".kb/b.md": doc("B") });
    const matches = findUntrackedDocumentMatches(root, ["A"], {
      ...deps,
      readFileSync: (absolute: string) => {
        read.push(path.relative(root, absolute));
        return deps.readFileSync(absolute);
      },
    });
    expect(matches).toStrictEqual(new Map([["A", ".kb/a.md"]]));
    expect(read).toStrictEqual([".kb/a.md"]);
  });

  test("a Git failure yields no matches", () => {
    const root = tempRoot();
    expect(
      findUntrackedDocumentMatches(root, ["A"], {
        execFileSync: () => {
          throw new Error("not a repository");
        },
      }),
    ).toStrictEqual(new Map());
  });

  test("reads the id from the front matter only", () => {
    const root = tempRoot();
    const filler = Array.from({ length: 62 }, (_, i) => `k${i}: v`).join("\n");
    const files: Record<string, string> = {
      ".kb/spaced.md": "---  \nid: SPACED\n---\n",
      ".kb/none.md": "no front matter\nid: NONE\n",
      ".kb/late.md": "---\ntitle: x\n---\nid: LATE\n",
      ".kb/late2.md": "---\ntitle: x\n---  \nid: LATE2\n",
      ".kb/prefixed.md": "---\nxid: PREFIXED\n---\n",
      ".kb/tight.md": "---\nid:TIGHT\n",
      ".kb/dq.md": '---\nid: " DQ "\n',
      ".kb/sq.md": "---\nid: 'SQ'\n",
      ".kb/blank.md": '---\nid: "  "\nid: BLANK\n',
      ".kb/last.md": "---\nid: LAST",
      ".kb/line63.md": `---\n${filler}\nid: LINE63\n`,
      ".kb/line64.md": `---\n${filler}\nk: v\nid: LINE64\n`,
      ".kb/empty.md": "",
    };
    const matches = findUntrackedDocumentMatches(
      root,
      [
        "SPACED",
        "NONE",
        "LATE",
        "LATE2",
        "PREFIXED",
        "TIGHT",
        "DQ",
        "SQ",
        "BLANK",
        '"',
        "LAST",
        "LINE63",
        "LINE64",
      ],
      fakeDeps(root, files),
    );
    expect([...matches.keys()].sort()).toStrictEqual(
      ["DQ", "LAST", "LINE63", "SPACED", "SQ", "TIGHT"].sort(),
    );
  });

  test("defaults to the real Git and file system", () => {
    const root = createGitWorkspace("main");
    roots.push(root);
    mkdirSync(path.join(root, ".kb", "requirements"), { recursive: true });
    writeFileSync(path.join(root, ".kb", "requirements", "r.md"), doc("REQ-X"));
    expect(findUntrackedDocumentMatches(root, ["REQ-X"])).toStrictEqual(
      new Map([["REQ-X", ".kb/requirements/r.md"]]),
    );
  });
});

describe("adoptUpsertOnlySymbolManifest", () => {
  function gitRoot(manifest?: string): string {
    const root = createGitWorkspace("main");
    roots.push(root);
    if (manifest !== undefined) {
      mkdirSync(path.join(root, ".kb"), { recursive: true });
      writeFileSync(path.join(root, ".kb", "symbols.yaml"), manifest);
    }
    return root;
  }

  test("adopts an untracked manifest whose symbols are stored", async () => {
    const manifest = "symbols:\n  - id: SYM-1\n  - id: SYM-2\n";
    const root = gitRoot(manifest);
    const asked: unknown[] = [];
    expect(
      await adoptUpsertOnlySymbolManifest(root, async (ids) => {
        asked.push(ids);
        return true;
      }),
    ).toBe(true);
    expect(asked).toStrictEqual([["SYM-1", "SYM-2"]]);
    expect(existsSync(receiptPath(root, ".kb/symbols.yaml"))).toBe(true);
  });

  test("leaves missing, receipted, empty and unstored manifests alone", async () => {
    const never = async () => {
      throw new Error("should not ask");
    };
    expect(await adoptUpsertOnlySymbolManifest(gitRoot(), never)).toBe(false);
    for (const manifest of ["", "symbols: 5\n", "symbols:\n  - name: x\n"]) {
      expect(
        await adoptUpsertOnlySymbolManifest(gitRoot(manifest), never),
      ).toBe(false);
    }
    const receipted = gitRoot("symbols:\n  - id: S\n");
    mkdirSync(path.dirname(receiptPath(receipted, ".kb/symbols.yaml")), {
      recursive: true,
    });
    writeFileSync(receiptPath(receipted, ".kb/symbols.yaml"), "{}");
    expect(await adoptUpsertOnlySymbolManifest(receipted, never)).toBe(false);
    const unstored = gitRoot("symbols:\n  - id: S\n");
    expect(
      await adoptUpsertOnlySymbolManifest(unstored, async () => false),
    ).toBe(false);
    expect(existsSync(receiptPath(unstored, ".kb/symbols.yaml"))).toBe(false);
  });
});
