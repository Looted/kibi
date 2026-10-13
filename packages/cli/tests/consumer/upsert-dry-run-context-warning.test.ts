// implements REQ-kb-entity-body-context, REQ-kibi-operation-interface-parity
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  createConsumerWorkspace,
  doc,
} from "./workspace.js";

/**
 * A kb_upsert without document.body preserves the existing document's body,
 * so the body-context warning must judge that body. The dry run previews the
 * same document the write would update instead of the runtime marker source.
 */

let workspace: ConsumerWorkspace;

const REASON =
  "Support asked for this after customers could not tell which exports were retained.";

beforeAll(() => {
  workspace = createConsumerWorkspace("kibi-upsert-dry-run-context-");
  workspace.write(
    ".kb/requirements/REQ-demo-export.md",
    doc(
      "id: REQ-demo-export\ntitle: Users can export reports\nstatus: open",
      `Users can export reports.\n\n## Context\n\n${REASON}\n`,
    ),
  );
  workspace.write(
    ".kb/requirements/REQ-demo-bare.md",
    doc(
      "id: REQ-demo-bare\ntitle: Users can import reports\nstatus: open",
      "Users can import reports.\n",
    ),
  );
  workspace.sync();
}, 300_000);

afterAll(() => workspace?.cleanup());

const CONTEXT_WARNING = "has no body context";

function upsert(id: string, title: string, dryRun: boolean): Json {
  const result = workspace.json(["upsert"], {
    type: "req",
    id,
    properties: { title, status: "open" },
    ...(dryRun ? { dryRun: true } : {}),
  }) as { status: unknown; data: Json };
  expect(result.status).toBe("success");
  return result.data;
}

function warnings(data: Json): string[] {
  return (data.warnings as string[] | undefined) ?? [];
}

describe("kb_upsert dry run judges the body the write would preserve", () => {
  test("no context warning for an existing requirement whose document has a Context section", () => {
    const preview = upsert("REQ-demo-export", "Users can export reports", true);
    expect(preview.valid).toBe(true);
    expect(warnings(preview).join("\n")).not.toContain(CONTEXT_WARNING);

    const written = upsert(
      "REQ-demo-export",
      "Users can export reports",
      false,
    );
    expect(warnings(written).join("\n")).not.toContain(CONTEXT_WARNING);
  });

  test("still warns when the existing document has no context", () => {
    const preview = upsert("REQ-demo-bare", "Users can import reports", true);
    expect(warnings(preview).join("\n")).toContain(
      "requirement REQ-demo-bare has no body context",
    );
  });
});
