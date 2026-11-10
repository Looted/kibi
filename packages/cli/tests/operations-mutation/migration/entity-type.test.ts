import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  ENTITY_TYPE_BACKFILL_ACTION_ID,
  ENTITY_TYPE_BACKFILL_CODE,
  applyEntityTypeBackfill,
  planEntityTypeBackfill,
} from "../../../src/operations/migration/entity-type.js";
import { removeTempWorkspaces, tempWorkspace } from "../workspace.js";

afterEach(removeTempWorkspaces);

const doc = (frontmatter: string) => `---\n${frontmatter}---\nBody.\n`;

describe("entity type backfill", () => {
  test("codes are stable", () => {
    expect(ENTITY_TYPE_BACKFILL_CODE).toBe("entity_type_backfill");
    expect(ENTITY_TYPE_BACKFILL_ACTION_ID).toBe("entity-type-backfill");
  });

  test("states the lane type on every untyped entity file", () => {
    const lanes = {
      requirements: "req",
      scenarios: "scenario",
      tests: "test",
      facts: "fact",
      adr: "adr",
      flags: "flag",
      events: "event",
    };
    const files: Record<string, string> = {};
    for (const lane of Object.keys(lanes))
      files[`.kb/${lane}/X-${lane}.md`] = doc(`id: X-${lane}\n`);
    const plan = planEntityTypeBackfill(tempWorkspace(files));
    expect(plan.skipped).toStrictEqual([]);
    expect(plan.targets).toStrictEqual(
      [
        "requirements",
        "scenarios",
        "tests",
        "facts",
        "adr",
        "flags",
        "events",
      ].map((lane) => ({
        id: `X-${lane}`,
        type: lanes[lane as keyof typeof lanes],
        path: `.kb/${lane}/X-${lane}.md`,
        after: doc(
          `id: X-${lane}\ntype: ${lanes[lane as keyof typeof lanes]}\n`,
        ),
      })),
    );
  });

  test("the lane decides even when the workspace sits under a lane-named folder", () => {
    const parent = tempWorkspace();
    const root = path.join(parent, "requirements", "tests", "ws");
    mkdirSync(path.join(root, ".kb/facts/tests"), { recursive: true });
    writeFileSync(path.join(root, ".kb/facts/tests/F.md"), doc("id: FACT-x\n"));
    expect(
      planEntityTypeBackfill(root).targets.map((t) => t.type),
    ).toStrictEqual(["fact"]);
  });

  test("derives the id from the file name when it is missing or blank", () => {
    const root = tempWorkspace({
      ".kb/facts/a.md": doc("title: A\n"),
      ".kb/facts/b.md": doc("id: '  '\n"),
      ".kb/facts/c.md": doc("id: 7\n"),
      ".kb/facts/d.md": doc("id: '  FACT-d '\n"),
    });
    expect(planEntityTypeBackfill(root).targets.map((t) => t.id)).toStrictEqual(
      ["a", "b", "c", "FACT-d"],
    );
  });

  test("leaves typed, unparsable and non-mapping front matter alone", () => {
    const root = tempWorkspace({
      ".kb/facts/typed.md": doc("id: F\ntype: fact\n"),
      ".kb/facts/typed-null.md": doc("id: F\ntype:\n"),
      ".kb/facts/none.md": "No front matter.\n",
      ".kb/facts/bad.md": doc("id: [x\n"),
      ".kb/facts/empty.md": doc(""),
      ".kb/facts/null.md": doc("~\n"),
      ".kb/facts/list.md": doc("- a\n"),
      ".kb/facts/scalar.md": doc("plain\n"),
    });
    expect(planEntityTypeBackfill(root)).toStrictEqual({
      targets: [],
      skipped: [],
    });
  });

  test("skips a file the type cannot be added to without changing other fields", () => {
    const root = tempWorkspace({
      ".kb/facts/indented.md": doc("  id: F\n  title: T\n"),
    });
    expect(planEntityTypeBackfill(root)).toStrictEqual({
      targets: [],
      skipped: [
        {
          path: ".kb/facts/indented.md",
          reason: "type could not be added without changing other fields",
        },
      ],
    });
  });

  test("applies the plan and returns it", () => {
    const root = tempWorkspace({
      ".kb/requirements/REQ-a.md": doc("id: REQ-a\n"),
      ".kb/facts/indented.md": doc("  id: F\n"),
    });
    const plan = applyEntityTypeBackfill(root);
    expect(plan.targets.map((t) => t.path)).toStrictEqual([
      ".kb/requirements/REQ-a.md",
    ]);
    expect(plan.skipped.map((s) => s.path)).toStrictEqual([
      ".kb/facts/indented.md",
    ]);
    expect(
      readFileSync(path.join(root, ".kb/requirements/REQ-a.md"), "utf8"),
    ).toBe(doc("id: REQ-a\ntype: req\n"));
    expect(applyEntityTypeBackfill(root).targets).toStrictEqual([]);
  });
});
