import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { load as loadYaml } from "js-yaml";
import * as kbSources from "../../../src/operations/migration/kb-sources.js";
import {
  applyOriginBackfill,
  migrationOrigin,
  planOriginBackfill,
  withBackfilledOrigin,
} from "../../../src/operations/migration/origin-backfill.js";
import { removeTempWorkspaces, tempWorkspace } from "../workspace.js";

afterEach(removeTempWorkspaces);

const AT = "2026-10-01T12:00:00.000Z";
const ORIGIN = migrationOrigin(AT);
const STAMP =
  "origin:\n  kind: migration\n  ref: kibi migrate v5->v6\n  recorded_at: '2026-10-01T12:00:00.000Z'\n";
const doc = (frontmatter: string) => `---\n${frontmatter}---\nBody.\n`;

function parseError(text: string): string {
  try {
    loadYaml(text);
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error("expected a parse error");
}

describe("migration origin", () => {
  test("records the schema 6 migration", () => {
    expect(migrationOrigin("T")).toStrictEqual({
      kind: "migration",
      ref: "kibi migrate v5->v6",
      recorded_at: "T",
    });
  });
});

describe("withBackfilledOrigin", () => {
  test("appends the origin as the last key, keeping every other byte", () => {
    expect(withBackfilledOrigin("\n---\ntitle: T\n---\nBody.\n", ORIGIN)).toBe(
      `\n---\ntitle: T\n${STAMP}---\nBody.\n`,
    );
  });

  test("never folds a long origin value", () => {
    const ref = Array.from({ length: 30 }, (_, i) => `word${i}`).join(" ");
    expect(
      withBackfilledOrigin(doc("title: T\n"), { kind: "human", ref }),
    ).toBe(doc(`title: T\norigin:\n  kind: human\n  ref: ${ref}\n`));
  });

  test("keeps CRLF line endings", () => {
    expect(withBackfilledOrigin("---\r\ntitle: T\r\n---\r\n", ORIGIN)).toBe(
      `---\r\ntitle: T\r\n${STAMP.replaceAll("\n", "\r\n")}---\r\n`,
    );
  });

  test("refuses a document without closed frontmatter", () => {
    expect(withBackfilledOrigin("title: T\n", ORIGIN)).toBeNull();
  });

  test("refuses frontmatter that is not a mapping", () => {
    expect(withBackfilledOrigin(doc(""), ORIGIN)).toBeNull();
    expect(withBackfilledOrigin(doc("{title: T}\n"), ORIGIN)).toBeNull();
    expect(withBackfilledOrigin(doc("plain\n"), ORIGIN)).toBeNull();
  });

  test("refuses an origin that reads back differently", () => {
    expect(
      withBackfilledOrigin(doc("title: T\n"), { kind: "human", ref: " r " }),
    ).toBeNull();
    expect(
      withBackfilledOrigin(doc("title: T\n"), {
        kind: "bogus",
      } as unknown as typeof ORIGIN),
    ).toBeNull();
  });

  test("refuses an edit that changes another field", () => {
    expect(
      withBackfilledOrigin(doc("<<: {origin: 1}\ntitle: T\n"), ORIGIN),
    ).toBeNull();
  });

  test("refuses frontmatter that already has an origin key", () => {
    expect(
      withBackfilledOrigin(doc("title: T\norigin: x\n"), ORIGIN),
    ).toBeNull();
  });
});

describe("planOriginBackfill", () => {
  test("lists entities without origin and the files it cannot stamp", () => {
    const root = tempWorkspace({
      ".kb/requirements/a-plain.md": doc("title: A\n"),
      ".kb/requirements/b-id.md": doc("id: '  REQ-b  '\ntitle: B\n"),
      ".kb/requirements/c-blank-id.md": doc("id: '   '\ntitle: C\n"),
      ".kb/requirements/d-number-id.md": doc("id: 4\ntitle: D\ntype: 5\n"),
      ".kb/requirements/e-typed.md": doc("title: E\ntype: custom\n"),
      ".kb/requirements/f-origin.md": doc(
        "title: F\norigin: {kind: migration, ref: kibi migrate v5->v6}\n",
      ),
      ".kb/requirements/g-no-frontmatter.md": "title: G\n",
      ".kb/requirements/h-bad.md": doc("title: [\n"),
      ".kb/requirements/i-empty.md": doc(""),
      ".kb/requirements/j-list.md": doc("- title\n"),
      ".kb/requirements/k-number-title.md": doc("title: 3\n"),
      ".kb/requirements/l-null-origin.md": doc("title: L\norigin: null\n"),
      ".kb/tests/requirements/m-nested.md": doc("title: M\n"),
      ".kb/facts/n.md": doc("title: N\n"),
    });
    expect(planOriginBackfill(root)).toStrictEqual({
      targets: [
        { id: "a-plain", type: "req", path: ".kb/requirements/a-plain.md" },
        { id: "REQ-b", type: "req", path: ".kb/requirements/b-id.md" },
        {
          id: "c-blank-id",
          type: "req",
          path: ".kb/requirements/c-blank-id.md",
        },
        {
          id: "d-number-id",
          type: "req",
          path: ".kb/requirements/d-number-id.md",
        },
        { id: "e-typed", type: "custom", path: ".kb/requirements/e-typed.md" },
        {
          id: "m-nested",
          type: "test",
          path: ".kb/tests/requirements/m-nested.md",
        },
        { id: "n", type: "fact", path: ".kb/facts/n.md" },
      ],
      skipped: [
        {
          path: ".kb/requirements/g-no-frontmatter.md",
          reason: "no closed YAML frontmatter",
        },
        {
          path: ".kb/requirements/h-bad.md",
          reason: `frontmatter does not parse: ${parseError("title: [\n")}`,
        },
        {
          path: ".kb/requirements/i-empty.md",
          reason: "frontmatter has no title",
        },
        {
          path: ".kb/requirements/j-list.md",
          reason: "frontmatter has no title",
        },
        {
          path: ".kb/requirements/k-number-title.md",
          reason: "frontmatter has no title",
        },
      ],
    });
  });

  test("types an entity by its lane, not by folders above the workspace", () => {
    const workspace = tempWorkspace({
      "requirements/repo/.kb/tests/T.md": doc("title: T\n"),
    });
    expect(
      planOriginBackfill(path.join(workspace, "requirements", "repo")).targets,
    ).toStrictEqual([{ id: "T", type: "test", path: ".kb/tests/T.md" }]);
  });

  test("reports a file that cannot be read", () => {
    const root = tempWorkspace({ ".kb/adr/A.md": doc("title: A\n") });
    const read = spyOn(kbSources, "readText").mockReturnValue(null);
    try {
      expect(planOriginBackfill(root)).toStrictEqual({
        targets: [],
        skipped: [{ path: ".kb/adr/A.md", reason: "unreadable" }],
      });
    } finally {
      read.mockRestore();
    }
  });
});

describe("applyOriginBackfill", () => {
  test("stamps targets, counts earlier stamps and reports skips", () => {
    const files = {
      ".kb/requirements/a.md": doc("title: A\n"),
      ".kb/requirements/b-flow.md": doc("{title: B}\n"),
      ".kb/requirements/c-none.md": "no frontmatter\n",
      ".kb/requirements/d-stamped.md": doc(`title: D\n${STAMP}`),
      ".kb/requirements/e-other-ref.md": doc(
        "title: E\norigin: {kind: migration, ref: elsewhere}\n",
      ),
      ".kb/requirements/f-human.md": doc(
        "title: F\norigin: {kind: human, ref: kibi migrate v5->v6}\n",
      ),
      ".kb/requirements/g-invalid.md": doc("title: G\norigin: x\n"),
      ".kb/requirements/h-stamped.md": doc(`title: H\n${STAMP}`),
    };
    const root = tempWorkspace(files);
    expect(applyOriginBackfill(root, AT)).toStrictEqual({
      written: [{ id: "a", type: "req", path: ".kb/requirements/a.md" }],
      skipped: [
        {
          path: ".kb/requirements/b-flow.md",
          reason: "origin could not be appended without changing other fields",
        },
        {
          path: ".kb/requirements/c-none.md",
          reason: "no closed YAML frontmatter",
        },
      ],
      previouslyStamped: 2,
    });
    const read = (relative: string) =>
      readFileSync(path.join(root, relative), "utf8");
    expect(read(".kb/requirements/a.md")).toBe(doc(`title: A\n${STAMP}`));
    for (const [relative, content] of Object.entries(files))
      if (relative !== ".kb/requirements/a.md")
        expect(read(relative)).toBe(content);
    expect(applyOriginBackfill(root, AT)).toStrictEqual({
      written: [],
      skipped: [
        {
          path: ".kb/requirements/b-flow.md",
          reason: "origin could not be appended without changing other fields",
        },
        {
          path: ".kb/requirements/c-none.md",
          reason: "no closed YAML frontmatter",
        },
      ],
      previouslyStamped: 3,
    });
  });
});
