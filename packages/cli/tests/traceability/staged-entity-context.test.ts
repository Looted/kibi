import { describe, expect, test } from "bun:test";
import type { ExtractionResult } from "../../src/extractors/markdown.js";
import { collectIntroducedEntityContextViolations } from "../../src/traceability/staged-entity-context.js";

type Tree = Record<string, string>;

function reader(base: Tree, head: Tree) {
  const calls: string[] = [];
  return {
    calls,
    snapshot: {
      baseTree: "BASE",
      headTree: "HEAD",
      readGit(args: readonly string[]): Buffer {
        expect(args.length).toBe(2);
        expect(args[0]).toBe("show");
        calls.push(args[1] as string);
        const [tree, file] = (args[1] as string).split(/:(.*)/s);
        const content = (tree === "BASE" ? base : head)[file as string];
        if (content === undefined) throw new Error("missing");
        return Buffer.from(content, "utf8");
      },
    },
  };
}

const entity = (id: string, type: string, body = "", extra = "") =>
  `---\nid: ${id}\ntitle: Escape cancels a label edit\ntype: ${type}\nstatus: active\n${extra}---\n${body}\n`;
const CONTEXT =
  "Opens a shape label for editing, types new text and presses Escape, then asserts the label keeps its previous text and no save request was sent.";
const BARE = ".kb/tests/TEST-bare.md";
const manifest = (contextAcknowledged: unknown) =>
  JSON.stringify({ schemaVersion: 8, contextAcknowledged });

function ids(
  base: Tree,
  head: Tree,
  paths: string[] = [BARE],
  knowledge: readonly ExtractionResult[] = [],
): string[] {
  return collectIntroducedEntityContextViolations(
    reader(base, head).snapshot,
    paths,
    knowledge,
  ).map((violation) => `${violation.rule}:${violation.entityId}`);
}

describe("collectIntroducedEntityContextViolations", () => {
  test("blocks a new entity without body context, with the full finding", () => {
    const { snapshot, calls } = reader(
      {},
      {
        [BARE]: entity("TEST-bare", "test"),
      },
    );
    const violations = collectIntroducedEntityContextViolations(
      snapshot,
      [BARE],
      [],
    );
    expect(violations.map((v) => [v.rule, v.entityId, v.source])).toStrictEqual(
      [["entity-context-missing", "TEST-bare", BARE]],
    );
    expect(calls).toStrictEqual([
      `HEAD:${BARE}`,
      "HEAD:.kb/manifest.json",
      `BASE:${BARE}`,
      "BASE:.kb/manifest.json",
    ]);
  });

  test("decodes the staged file as UTF-8", () => {
    expect(
      ids({}, { [BARE]: entity("TEST-bare", "test", "Zażółć gęślą jaźń.") }),
    ).toStrictEqual(["entity-context-missing:TEST-bare"]);
  });

  test("passes when the head entity has context and skips the base read", () => {
    const { snapshot, calls } = reader(
      {},
      {
        [BARE]: entity("TEST-bare", "test", CONTEXT),
      },
    );
    expect(
      collectIntroducedEntityContextViolations(snapshot, [BARE], []),
    ).toStrictEqual([]);
    expect(calls).toStrictEqual([`HEAD:${BARE}`, "HEAD:.kb/manifest.json"]);
  });

  test("passes debt the base already had and blocks only new debt", () => {
    const other = ".kb/tests/TEST-new.md";
    expect(
      ids(
        { [BARE]: entity("TEST-bare", "test") },
        {
          [BARE]: entity("TEST-bare", "test"),
          [other]: entity("TEST-new", "test"),
        },
        [BARE, other],
      ),
    ).toStrictEqual(["entity-context-missing:TEST-new"]);
  });

  test("skips missing files, unreadable front matter and exempt types", () => {
    expect(
      ids(
        {},
        {
          ".kb/tests/no-fm.md": "just text",
          ".kb/flags/FLAG-x.md": entity("FLAG-x", "flag"),
        },
        [BARE, ".kb/tests/no-fm.md", ".kb/flags/FLAG-x.md"],
      ),
    ).toStrictEqual([]);
  });

  test("honours ids the head manifest acknowledged", () => {
    const head = (contextAcknowledged: unknown) => ({
      [BARE]: entity("TEST-bare", "test"),
      ".kb/manifest.json": manifest(contextAcknowledged),
    });
    expect(ids({}, head(["TEST-bare"]))).toStrictEqual([]);
    expect(ids({}, head([7, "TEST-bare"]))).toStrictEqual([]);
    expect(ids({}, head("TEST-bare"))).toStrictEqual([
      "entity-context-missing:TEST-bare",
    ]);
    expect(ids({}, head([7]))).toStrictEqual([
      "entity-context-missing:TEST-bare",
    ]);
    expect(
      ids(
        {},
        {
          [BARE]: entity("TEST-bare", "test"),
          ".kb/manifest.json": "{oops",
        },
      ),
    ).toStrictEqual(["entity-context-missing:TEST-bare"]);
  });

  test("a base acknowledgement does not exempt the staged entity", () => {
    const bare = entity("TEST-bare", "test");
    expect(
      ids(
        { [BARE]: bare, ".kb/manifest.json": manifest(["TEST-bare"]) },
        { [BARE]: bare },
      ),
    ).toStrictEqual(["entity-context-missing:TEST-bare"]);
    expect(
      ids({ [BARE]: bare, ".kb/manifest.json": "{oops" }, { [BARE]: bare }),
    ).toStrictEqual([]);
    expect(
      ids(
        { [BARE]: bare, ".kb/manifest.json": manifest([3]) },
        { [BARE]: bare },
      ),
    ).toStrictEqual([]);
  });

  test("an entity the head knowledge supersedes is not reported", () => {
    const knowledge = (type: string) =>
      [
        {
          entity: { id: "TEST-next" },
          relationships: [{ type, from: "TEST-next", to: "TEST-bare" }],
        },
      ] as unknown as ExtractionResult[];
    const head = { [BARE]: entity("TEST-bare", "test") };
    expect(ids({}, head, [BARE], knowledge("supersedes"))).toStrictEqual([]);
    expect(ids({}, head, [BARE], knowledge("relates_to"))).toStrictEqual([
      "entity-context-missing:TEST-bare",
    ]);
  });
});
