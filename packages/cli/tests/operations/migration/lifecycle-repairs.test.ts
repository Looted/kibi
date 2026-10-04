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
  readTopLevelField,
  withTopLevelField,
  withoutTopLevelField,
} from "../../../src/operations/migration/kb-sources.js";
import {
  applySourcePathRepairs,
  findDanglingSources,
  findSourceRepairs,
  plannedSourcePathRepairs,
  resolveAuthoredSource,
} from "../../../src/operations/migration/source-paths.js";
import {
  applySupersededClosures,
  planSupersededClosures,
  supersessionCycles,
} from "../../../src/operations/migration/superseded-closure.js";

function write(root: string, relative: string, content: string): string {
  const absolute = path.join(root, relative);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, "utf8");
  return absolute;
}

function requirement(
  id: string,
  status: string,
  links: readonly (readonly [string, string])[] = [],
): string {
  const linkLines =
    links.length === 0
      ? ""
      : `links:\n${links.map(([type, target]) => `  - type: ${type}\n    target: ${target}\n`).join("")}`;
  return `---\nid: ${id}\ntitle: ${id}\ntype: req\nstatus: ${status} # authored\n${linkLines}---\n\nBody of ${id}.\n`;
}

describe("top-level frontmatter edits", () => {
  test("replaces only the key's line and keeps its quote style", () => {
    const content =
      "---\nid: ADR-1\nsource: 'documentation/adr/ADR-1.md'\ntags: [a]\n---\n\nBody\n";
    expect(withTopLevelField(content, "source", ".kb/adr/ADR-1.md")).toBe(
      "---\nid: ADR-1\nsource: '.kb/adr/ADR-1.md'\ntags: [a]\n---\n\nBody\n",
    );
    const crlf = "---\r\nid: REQ-1\r\nstatus: open\r\n---\r\nBody\r\n";
    expect(withTopLevelField(crlf, "status", "closed")).toBe(
      "---\r\nid: REQ-1\r\nstatus: closed\r\n---\r\nBody\r\n",
    );
  });

  test("appends an absent key as the last frontmatter key", () => {
    expect(
      withTopLevelField("---\nid: REQ-1\n---\nBody\n", "status", "closed"),
    ).toBe("---\nid: REQ-1\nstatus: closed\n---\nBody\n");
  });

  test("refuses multi-line values and nested look-alikes", () => {
    const multiline = "---\nid: REQ-1\nstatus:\n  - open\n---\nBody\n";
    expect(withTopLevelField(multiline, "status", "closed")).toBeNull();
    const nested = "---\nid: REQ-1\nmeta:\n  status: open\n---\n";
    expect(withTopLevelField(nested, "status", "closed")).toBe(
      "---\nid: REQ-1\nmeta:\n  status: open\nstatus: closed\n---\n",
    );
    expect(readTopLevelField("meta:\n  source: x\n", "source")).toBeUndefined();
    expect(readTopLevelField("source: 'a.md#top'\n", "source")).toBe(
      "a.md#top",
    );
  });

  test("removes only the key's line, keeping every other byte", () => {
    expect(
      withoutTopLevelField(
        "---\nid: ADR-1\nsource: '.kb/adr/ADR-1.md' # old\ntags: [a]\n---\n\nBody\n",
        "source",
      ),
    ).toBe("---\nid: ADR-1\ntags: [a]\n---\n\nBody\n");
    expect(
      withoutTopLevelField(
        "---\r\nid: REQ-1\r\nsource: x.md\r\n---\r\nBody\r\n",
        "source",
      ),
    ).toBe("---\r\nid: REQ-1\r\n---\r\nBody\r\n");
    // A nested look-alike is not the top-level key; nothing to remove.
    const nested = "---\nid: REQ-1\nmeta:\n  source: x.md\n---\n";
    expect(withoutTopLevelField(nested, "source")).toBe(nested);
  });

  test("refuses removals that would not read back as exactly that change", () => {
    // A multi-line value.
    expect(
      withoutTopLevelField(
        "---\nid: REQ-1\nsource:\n  - a.md\n---\nBody\n",
        "source",
      ),
    ).toBeNull();
    // A sequence at the key's own indentation: dropping the line leaves it dangling.
    expect(
      withoutTopLevelField("---\nid: REQ-1\nsource:\n- a.md\n---\n", "source"),
    ).toBeNull();
    // The line belongs to another key's quoted value.
    expect(
      withoutTopLevelField(
        '---\nid: REQ-1\ntitle: "one\nsource: two"\n---\n',
        "source",
      ),
    ).toBeNull();
    // A quoted key the line pattern cannot see.
    expect(
      withoutTopLevelField('---\nid: REQ-1\n"source": x.md\n---\n', "source"),
    ).toBeNull();
    expect(withoutTopLevelField("no frontmatter\n", "source")).toBeNull();
  });
});

describe("authored source resolution", () => {
  const context = {
    workspaceRoot: "/repo",
    entityIds: new Set(["REQ-known"]),
    exists: (relative: string) =>
      ["docs/spec.md", ".kb/adr/ADR-1.md", ".kb/symbols.yaml"].includes(
        relative,
      ),
  };

  test("accepts paths with anchors, entity ids and http(s) URLs", () => {
    expect(resolveAuthoredSource("docs/spec.md#limits", context).kind).toBe(
      "path",
    );
    expect(resolveAuthoredSource("./docs/spec.md", context).kind).toBe("path");
    expect(resolveAuthoredSource("REQ-known", context).kind).toBe("entity");
    expect(
      resolveAuthoredSource("https://example.com/spec#x", context).kind,
    ).toBe("url");
    expect(resolveAuthoredSource(undefined, context).kind).toBe("missing");
    expect(resolveAuthoredSource("  ", context).kind).toBe("missing");
  });

  test("maps pre-canonical knowledge paths onto the file under .kb/", () => {
    expect(
      resolveAuthoredSource("documentation/adr/ADR-1.md#context", context),
    ).toEqual({ kind: "dangling", rewrite: ".kb/adr/ADR-1.md#context" });
    // Relative to the knowledge root, as older KBs wrote it.
    expect(resolveAuthoredSource("adr/ADR-1.md", context)).toEqual({
      kind: "dangling",
      rewrite: ".kb/adr/ADR-1.md",
    });
    // A workspace test file is not a knowledge file.
    expect(resolveAuthoredSource("tests/e2e/a.test.ts", context)).toEqual({
      kind: "dangling",
    });
    expect(
      resolveAuthoredSource("documentation/symbols.yaml", context),
    ).toEqual({ kind: "dangling", rewrite: ".kb/symbols.yaml" });
    // Not an entity lane, or no moved file: nothing to rewrite to.
    expect(resolveAuthoredSource("documentation/notes/a.md", context)).toEqual({
      kind: "dangling",
    });
    expect(
      resolveAuthoredSource("documentation/adr/ADR-2.md", context),
    ).toEqual({ kind: "dangling" });
    expect(resolveAuthoredSource(["a.md"], context)).toEqual({
      kind: "dangling",
    });
  });

  test("a value naming the entity's own file resolves to self, in any spelling", () => {
    const own = { ...context, file: ".kb/adr/ADR-1.md" };
    const spellings: Array<[string, boolean]> = [
      [".kb/adr/ADR-1.md", true],
      ["./.kb/adr/ADR-1.md#context", true],
      // A case mismatch names no existing path on a case-sensitive disk.
      [".KB/ADR/adr-1.md", false],
      ["documentation/adr/ADR-1.md", false],
      ["adr/ADR-1.md#context", false],
      ["documentation/adr/adr-1.MD", false],
    ];
    for (const [value, resolves] of spellings) {
      expect(resolveAuthoredSource(value, own)).toEqual({
        kind: "self",
        resolves,
      });
    }
    // Another entity's file, an existing other path, an entity id and a URL
    // are provenance.
    const other = { ...context, file: ".kb/adr/ADR-2.md" };
    expect(resolveAuthoredSource("documentation/adr/ADR-1.md", other)).toEqual({
      kind: "dangling",
      rewrite: ".kb/adr/ADR-1.md",
    });
    expect(resolveAuthoredSource(".kb/adr/ADR-1.md", other).kind).toBe("path");
    expect(resolveAuthoredSource("REQ-known", own).kind).toBe("entity");
    expect(resolveAuthoredSource("https://example.com/adr", own).kind).toBe(
      "url",
    );
    // An existing workspace file is not the entity's own file, even when its
    // path would map onto it under .kb/.
    const shadowed = {
      ...context,
      file: ".kb/adr/ADR-1.md",
      exists: (relative: string) => relative === "adr/ADR-1.md",
    };
    expect(resolveAuthoredSource("adr/ADR-1.md", shadowed).kind).toBe("path");
  });
});

describe("lifecycle repairs on authored sources", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), "kibi-lifecycle-repairs-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("rewrites moved sources, removes redundant and dead ones, and keeps provenance", () => {
    const adr1 = ".kb/adr/ADR-1.md";
    const adr2 = ".kb/adr/ADR-2.md";
    const fact = ".kb/facts/FACT-std.md";
    const self = ".kb/facts/FACT-ATOMIC.md";
    const multi = ".kb/facts/FACT-multi.md";
    write(
      root,
      adr1,
      "---\nid: ADR-1\ntitle: One\nstatus: accepted\nsource: documentation/adr/ADR-1.md\n---\n\nBody\n",
    );
    write(
      root,
      adr2,
      "---\nid: ADR-2\ntitle: Two\nstatus: accepted\nsource: documentation/adr/ADR-1.md#context\n---\n\nBody\n",
    );
    write(
      root,
      fact,
      "---\nid: FACT-std\ntitle: Std\nstatus: active\nsource: memory-bank/techContext.md\n---\n",
    );
    write(
      root,
      self,
      "---\nid: FACT-ATOMIC\ntitle: Atomic\nstatus: active\nsource: documentation/facts/FACT-atomic.md\n---\n",
    );
    write(
      root,
      multi,
      "---\nid: FACT-multi\ntitle: Multi\nstatus: active\nsource:\n  - memory-bank/a.md\n---\n",
    );
    write(root, "docs/spec.md", "# Spec\n");
    const own = write(
      root,
      ".kb/requirements/REQ-own.md",
      "---\nid: REQ-own\ntitle: Own\nstatus: open\nsource: ./.kb/requirements/REQ-own.md\n---\n",
    );
    write(
      root,
      ".kb/requirements/REQ-ok.md",
      "---\nid: REQ-ok\ntitle: Ok\nstatus: open\nsource: docs/spec.md#limits\n---\n",
    );
    write(
      root,
      ".kb/requirements/REQ-cites.md",
      "---\nid: REQ-cites\ntitle: Cites\nstatus: open\nsource: REQ-ok\n---\n",
    );
    write(
      root,
      ".kb/requirements/REQ-web.md",
      "---\nid: REQ-web\ntitle: Web\nstatus: open\nsource: https://example.com/spec\n---\n",
    );
    write(root, ".kb/symbols.yaml", "symbols:\n  - id: SYM-known\n");
    write(
      root,
      ".kb/tests/TEST-sym.md",
      "---\nid: TEST-sym\ntitle: Sym\nstatus: passing\nsource: SYM-known\n---\n",
    );
    const untouched = [
      ".kb/requirements/REQ-ok.md",
      ".kb/requirements/REQ-cites.md",
      ".kb/requirements/REQ-web.md",
      ".kb/tests/TEST-sym.md",
    ].map((file) => [file, readFileSync(path.join(root, file), "utf8")]);

    // The check sees only values that name nothing; an existing
    // self-reference resolves, so only kibi migrate removes it.
    expect(
      findDanglingSources(root).map((source) => [
        source.entityId,
        source.fix,
        source.refused ?? null,
      ]),
    ).toEqual([
      ["ADR-1", { kind: "remove", reason: "self" }, null],
      ["ADR-2", { kind: "rewrite", to: ".kb/adr/ADR-1.md#context" }, null],
      ["FACT-ATOMIC", { kind: "remove", reason: "self" }, null],
      [
        "FACT-multi",
        { kind: "remove", reason: "dangling" },
        "the source field spans several lines, or editing it would change other frontmatter fields",
      ],
      ["FACT-std", { kind: "remove", reason: "dangling" }, null],
    ]);
    const repairs = findSourceRepairs(root);
    expect(repairs.map((repair) => [repair.entityId, repair.dangling])).toEqual(
      [
        ["ADR-1", true],
        ["ADR-2", true],
        ["FACT-ATOMIC", true],
        ["FACT-multi", true],
        ["FACT-std", true],
        ["REQ-own", false],
      ],
    );
    const planned = plannedSourcePathRepairs(repairs);
    expect(planned).toEqual({
      rewrites: [
        {
          entityId: "ADR-2",
          file: adr2,
          from: "documentation/adr/ADR-1.md#context",
          to: ".kb/adr/ADR-1.md#context",
        },
      ],
      removals: [
        {
          entityId: "ADR-1",
          file: adr1,
          from: "documentation/adr/ADR-1.md",
          reason: "self",
        },
        {
          entityId: "FACT-ATOMIC",
          file: self,
          from: "documentation/facts/FACT-atomic.md",
          reason: "self",
        },
        {
          entityId: "FACT-std",
          file: fact,
          from: "memory-bank/techContext.md",
          reason: "dangling",
        },
        {
          entityId: "REQ-own",
          file: ".kb/requirements/REQ-own.md",
          from: "./.kb/requirements/REQ-own.md",
          reason: "self",
        },
      ],
    });

    // A plan made before the value changed is not applied.
    const stale = applySourcePathRepairs(root, {
      rewrites: [],
      removals: [
        {
          entityId: "ADR-1",
          file: adr1,
          from: "documentation/adr/ADR-0.md",
          reason: "self",
        },
      ],
    });
    expect(stale).toEqual({
      rewritten: [],
      removed: [],
      skipped: [{ file: adr1, reason: "source changed since planning" }],
    });

    const result = applySourcePathRepairs(root, planned);
    expect(result.rewritten).toEqual(planned.rewrites);
    expect(result.removed).toEqual(planned.removals);
    expect(result.skipped).toEqual([]);
    expect(readFileSync(path.join(root, adr1), "utf8")).toBe(
      "---\nid: ADR-1\ntitle: One\nstatus: accepted\n---\n\nBody\n",
    );
    expect(readFileSync(path.join(root, adr2), "utf8")).toBe(
      "---\nid: ADR-2\ntitle: Two\nstatus: accepted\nsource: .kb/adr/ADR-1.md#context\n---\n\nBody\n",
    );
    expect(readFileSync(own, "utf8")).toBe(
      "---\nid: REQ-own\ntitle: Own\nstatus: open\n---\n",
    );
    for (const [file, before] of untouched) {
      expect(readFileSync(path.join(root, file as string), "utf8")).toBe(
        before as string,
      );
    }

    // Only the value Kibi cannot edit safely is left, and it falls back to
    // a person: an unplanned run skips it with the reason.
    expect(findSourceRepairs(root).map((repair) => repair.entityId)).toEqual([
      "FACT-multi",
    ]);
    expect(applySourcePathRepairs(root)).toEqual({
      rewritten: [],
      removed: [],
      skipped: [
        {
          file: multi,
          reason:
            "the source field spans several lines, or editing it would change other frontmatter fields",
        },
      ],
    });
    expect(readFileSync(path.join(root, multi), "utf8")).toContain(
      "source:\n  - memory-bank/a.md\n",
    );
  });

  test("closes superseded requirements, skipping cycles, and touches only the status line", () => {
    const old = write(
      root,
      ".kb/requirements/REQ-old.md",
      requirement("REQ-old", "open"),
    );
    write(
      root,
      ".kb/requirements/REQ-new.md",
      requirement("REQ-new", "open", [["supersedes", "REQ-old"]]),
    );
    write(
      root,
      ".kb/requirements/REQ-done.md",
      requirement("REQ-done", "closed"),
    );
    write(
      root,
      ".kb/requirements/REQ-newer.md",
      requirement("REQ-newer", "open", [["supersedes", "REQ-done"]]),
    );
    const loopA = write(
      root,
      ".kb/requirements/REQ-loop-a.md",
      requirement("REQ-loop-a", "open", [["supersedes", "REQ-loop-b"]]),
    );
    write(
      root,
      ".kb/requirements/REQ-loop-b.md",
      requirement("REQ-loop-b", "in_progress", [["supersedes", "REQ-loop-a"]]),
    );
    const loopBefore = readFileSync(loopA, "utf8");

    const plan = planSupersededClosures(root);
    expect(plan.closures).toEqual([
      {
        id: "REQ-old",
        path: ".kb/requirements/REQ-old.md",
        status: "open",
        supersededBy: ["REQ-new"],
      },
    ]);
    expect(plan.cycles).toEqual([
      {
        members: ["REQ-loop-a", "REQ-loop-b"],
        edges: [
          ["REQ-loop-a", "REQ-loop-b"],
          ["REQ-loop-b", "REQ-loop-a"],
        ],
        files: [
          ".kb/requirements/REQ-loop-a.md",
          ".kb/requirements/REQ-loop-b.md",
        ],
      },
    ]);

    expect(
      applySupersededClosures(root, new Set(["REQ-other"])).closed,
    ).toEqual([]);
    const result = applySupersededClosures(root);
    expect(result.closed.map((closure) => closure.id)).toEqual(["REQ-old"]);
    expect(readFileSync(old, "utf8")).toBe(
      requirement("REQ-old", "open").replace(
        "status: open # authored",
        "status: closed",
      ),
    );
    expect(readFileSync(loopA, "utf8")).toBe(loopBefore);
    expect(planSupersededClosures(root).closures).toEqual([]);
  });

  test("cycle detection finds every strongly connected supersession set once", () => {
    expect(
      supersessionCycles([
        ["A", "B"],
        ["B", "C"],
        ["C", "A"],
        ["C", "D"],
        ["E", "F"],
        ["F", "E"],
        ["G", "G"],
      ]),
    ).toEqual([["A", "B", "C"], ["E", "F"], ["G"]]);
    expect(supersessionCycles([["A", "B"]])).toEqual([]);
  });
});
