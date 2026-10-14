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
  applyDeliveredStatusMappings,
  planRequirementStatusMappings,
} from "../../../src/operations/migration/requirement-status.js";
import {
  REQ_STATUS_DELIVERED_MAP_ACTION_ID,
  REQ_STATUS_DELIVERED_MAP_CODE,
  requirementStatusActions,
} from "../../../src/operations/migration/schema6.js";

// implements REQ-cli-migrate-legacy-requirement-status

function requirement(
  root: string,
  id: string,
  status: string,
  extra = "",
): string {
  const file = path.join(root, ".kb/requirements", `${id}.md`);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(
    file,
    `---\nid: ${id}\ntitle: ${id}\ntype: req\nstatus: ${status}\n${extra}---\n\n| a | b |\n| - | - |\n| 1 | 2 |\n`,
  );
  return file;
}

describe("legacy requirement statuses", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), "kibi-req-status-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  test("delivery vocabulary has one automatic mapping and is reported as uncompilable", () => {
    requirement(root, "REQ-a", "implemented");
    requirement(root, "REQ-b", "done");
    requirement(root, "REQ-c", "completed");
    requirement(root, "REQ-d", "accepted");
    requirement(root, "REQ-e", "wip");
    requirement(root, "REQ-f", "open");

    const findings = planRequirementStatusMappings(root);

    expect(
      findings.map(({ requirementId, automatic, suggestedStatus }) => ({
        requirementId,
        automatic,
        suggestedStatus,
      })),
    ).toEqual([
      {
        requirementId: "REQ-a",
        automatic: { status: "closed", tag: "implemented" },
        suggestedStatus: "closed",
      },
      {
        requirementId: "REQ-b",
        automatic: { status: "closed", tag: "implemented" },
        suggestedStatus: "closed",
      },
      {
        requirementId: "REQ-c",
        automatic: { status: "closed", tag: "implemented" },
        suggestedStatus: "closed",
      },
      { requirementId: "REQ-d", automatic: null, suggestedStatus: "open" },
      { requirementId: "REQ-e", automatic: null, suggestedStatus: null },
    ]);
    // `accepted` compiles; `implemented` and `wip` are outside the schema.
    const byId = new Map(findings.map((f) => [f.requirementId, f]));
    expect(byId.get("REQ-d")?.extractionError).toBeNull();
    expect(byId.get("REQ-a")?.extractionError).toContain("/status");
    expect(byId.get("REQ-e")?.extractionError).toContain("/status");
  });

  test("mapping sets closed, adds the implemented tag once and leaves the rest of the file alone", () => {
    const plain = requirement(root, "REQ-a", "implemented");
    const tagged = requirement(
      root,
      "REQ-b",
      "done",
      "tags:\n  - implemented\n  - editor\n",
    );
    const flow = requirement(root, "REQ-c", "completed", "tags: [editor]\n");
    requirement(root, "REQ-d", "wip");

    const result = applyDeliveredStatusMappings(root);

    expect(result.mapped.map((finding) => finding.requirementId)).toEqual([
      "REQ-a",
      "REQ-b",
      "REQ-c",
    ]);
    expect(result.skipped).toEqual([]);
    expect(readFileSync(plain, "utf8")).toBe(
      "---\nid: REQ-a\ntitle: REQ-a\ntype: req\nstatus: closed\ntags:\n  - implemented\n---\n\n| a | b |\n| - | - |\n| 1 | 2 |\n",
    );
    expect(readFileSync(tagged, "utf8")).toContain(
      "status: closed\ntags:\n  - implemented\n  - editor\n---",
    );
    expect(readFileSync(flow, "utf8")).toContain(
      "status: closed\ntags: [editor, implemented]\n---",
    );
    // Idempotent; the unknown status is left for a person.
    expect(applyDeliveredStatusMappings(root).mapped).toEqual([]);
    expect(
      planRequirementStatusMappings(root).map((f) => f.requirementId),
    ).toEqual(["REQ-d"]);
  });

  test("the plan offers one automatic action for delivery statuses and a review for the rest", () => {
    requirement(root, "REQ-a", "implemented");
    requirement(root, "REQ-b", "done");
    requirement(root, "REQ-e", "wip");

    const actions = requirementStatusActions(root);

    expect(actions[0]).toMatchObject({
      id: REQ_STATUS_DELIVERED_MAP_ACTION_ID,
      code: REQ_STATUS_DELIVERED_MAP_CODE,
      safety: "automatic",
      autoApplicable: true,
      affectedEntityIds: ["REQ-a", "REQ-b"],
      evidence: {
        count: 2,
        mappings: [
          expect.objectContaining({
            requirementId: "REQ-a",
            from: "implemented",
            to: "closed",
            tag: "implemented",
          }),
          expect.objectContaining({ requirementId: "REQ-b", from: "done" }),
        ],
      },
    });
    const review = actions.find(
      (action) => action.id === "req-status-vocabulary-map-REQ-e",
    );
    expect(review).toMatchObject({
      safety: "review",
      invocation: {
        kind: "review",
        instruction: expect.stringContaining("kibi sync cannot compile it"),
      },
      evidence: { extractionError: expect.stringContaining("/status") },
    });
    expect(actions).toHaveLength(2);
  });
});
