// implements REQ-cli-staged-entity-context
import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  createConsumerWorkspace,
  doc,
} from "./workspace.js";

/**
 * The pre-commit hook runs `kibi check --staged`. An entity document the
 * commit adds or edits without body context must fail there as full
 * `kibi check` fails it (entity-context-missing), while an entity that
 * already lacked context at the base commit, or one the migration
 * acknowledged, must not block the commit. The fixture is a drawing editor.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

const NEW_TEST = "TEST-editor-escape-cancels";
const OLD_TEST = "TEST-editor-legacy-export";
const MIGRATED_TEST = "TEST-editor-migrated-zoom";

function testEntity(id: string, title: string, body = ""): string {
  return doc(
    `
id: ${id}
title: ${title}
type: test
status: active
`,
    body,
  );
}

function stagedCheck(ws: ConsumerWorkspace) {
  ws.stage();
  const run = ws.kibi(["check", "--staged", "--format", "json"]);
  const structured = (JSON.parse(run.stdout) as Json).structuredContent as {
    violations: Array<{ rule: string; entityId: string }>;
  };
  return {
    status: run.status,
    violations: structured.violations.map(({ rule, entityId }) => ({
      rule,
      entityId,
    })),
  };
}

describe("kibi check --staged entity context", () => {
  test("blocks a staged entity without body context and passes debt the commit did not introduce", () => {
    const ws = createConsumerWorkspace("kibi-staged-entity-context-");
    workspace = ws;
    // Legacy debt: a test without body context already in the base commit
    // (the test workspace runs git without hooks).
    ws.write(
      `.kb/tests/${OLD_TEST}.md`,
      testEntity(OLD_TEST, "Export writes a PNG file"),
    );
    ws.stage();
    ws.git("commit", "-q", "-m", "legacy test");

    // A new test entity without a body is blocked, and only it.
    ws.write(
      `.kb/tests/${NEW_TEST}.md`,
      testEntity(NEW_TEST, "Escape cancels a label edit"),
    );
    expect(stagedCheck(ws)).toEqual({
      status: 1,
      violations: [{ rule: "entity-context-missing", entityId: NEW_TEST }],
    });

    // The same file with a prose body passes.
    ws.write(
      `.kb/tests/${NEW_TEST}.md`,
      testEntity(
        NEW_TEST,
        "Escape cancels a label edit",
        "Opens a shape label for editing, types new text and presses Escape, then asserts the label keeps its previous text and no save request was sent.",
      ),
    );
    expect(stagedCheck(ws)).toEqual({ status: 0, violations: [] });
    ws.git("commit", "-q", "-m", "escape test");

    // Editing the legacy test without adding context does not introduce the
    // finding: it was already there at the base.
    ws.write(
      `.kb/tests/${OLD_TEST}.md`,
      testEntity(OLD_TEST, "Export writes a PNG image file"),
    );
    expect(stagedCheck(ws)).toEqual({ status: 0, violations: [] });
    ws.git("commit", "-q", "-m", "retitle legacy test");

    // An entity the migration acknowledged in the manifest passes when the
    // migration commit stages it.
    const manifest = JSON.parse(ws.read(".kb/manifest.json")) as Json;
    ws.write(
      ".kb/manifest.json",
      `${JSON.stringify({ ...manifest, contextAcknowledged: [MIGRATED_TEST] }, null, 2)}\n`,
    );
    ws.write(
      `.kb/tests/${MIGRATED_TEST}.md`,
      testEntity(MIGRATED_TEST, "Zoom keeps the canvas centered"),
    );
    expect(stagedCheck(ws)).toEqual({ status: 0, violations: [] });
  }, 600_000);
});
