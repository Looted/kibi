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
} from "../../../src/operations/migration/kb-sources.js";
import {
  applySourcePathRewrites,
  findDanglingSources,
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
});

describe("lifecycle repairs on authored sources", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), "kibi-lifecycle-repairs-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("finds dangling sources and rewrites only the mappable ones", () => {
    const adr = write(
      root,
      ".kb/adr/ADR-1.md",
      "---\nid: ADR-1\ntitle: One\nstatus: accepted\nsource: documentation/adr/ADR-1.md\n---\n\nBody\n",
    );
    write(
      root,
      ".kb/facts/FACT-std.md",
      "---\nid: FACT-std\ntitle: Std\nstatus: active\nsource: memory-bank/techContext.md\n---\n",
    );
    write(root, "docs/spec.md", "# Spec\n");
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
    write(root, ".kb/symbols.yaml", "symbols:\n  - id: SYM-known\n");
    write(
      root,
      ".kb/tests/TEST-sym.md",
      "---\nid: TEST-sym\ntitle: Sym\nstatus: passing\nsource: SYM-known\n---\n",
    );

    const dangling = findDanglingSources(root);
    expect(
      dangling.map((source) => [source.entityId, source.rewrite ?? null]),
    ).toEqual([
      ["ADR-1", ".kb/adr/ADR-1.md"],
      ["FACT-std", null],
    ]);

    // A plan made before the source changed is not applied.
    const stale = applySourcePathRewrites(root, [
      {
        entityId: "ADR-1",
        file: ".kb/adr/ADR-1.md",
        from: "documentation/adr/ADR-0.md",
        to: ".kb/adr/ADR-1.md",
      },
    ]);
    expect(stale.written).toEqual([]);
    expect(stale.skipped).toEqual([
      { file: ".kb/adr/ADR-1.md", reason: "source changed since planning" },
    ]);

    const result = applySourcePathRewrites(root);
    expect(result.written.map((rewrite) => rewrite.entityId)).toEqual([
      "ADR-1",
    ]);
    expect(readFileSync(adr, "utf8")).toBe(
      "---\nid: ADR-1\ntitle: One\nstatus: accepted\nsource: .kb/adr/ADR-1.md\n---\n\nBody\n",
    );
    expect(findDanglingSources(root).map((source) => source.entityId)).toEqual([
      "FACT-std",
    ]);
    expect(applySourcePathRewrites(root).written).toEqual([]);
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
