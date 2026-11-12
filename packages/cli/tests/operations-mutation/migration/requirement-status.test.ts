import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { extractFromMarkdown } from "../../../src/extractors/markdown.js";
import * as inventory from "../../../src/operations/migration/inventory-rederive.js";
import {
  DELIVERED_REQUIREMENT_STATUS,
  DELIVERED_REQUIREMENT_TAG,
  SUGGESTED_REQUIREMENT_STATUS,
  applyDeliveredStatusMappings,
  applyRequirementStatusMapping,
  planRequirementStatusMappings,
} from "../../../src/operations/migration/requirement-status.js";
import { removeTempWorkspaces, tempWorkspace } from "../workspace.js";

const DELIVERED = { status: "closed", tag: "implemented" };
const doc = (frontmatter: string) => `---\n${frontmatter}---\nBody.\n`;
const req = (status: string, extra = "") =>
  doc(`title: T\ntype: req\nstatus: ${status}\n${extra}`);

function extractionError(file: string): string {
  try {
    extractFromMarkdown(file);
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error("expected an extraction error");
}

let drift: ReturnType<
  typeof spyOn<typeof inventory, "planInventoryRederivation">
>;
beforeEach(() => {
  drift = spyOn(inventory, "planInventoryRederivation").mockImplementation(
    (_root, id) =>
      [
        { requirementId: `${id}-other` },
        { requirementId: id, marker: true },
      ] as unknown as ReturnType<typeof inventory.planInventoryRederivation>,
  );
});
afterEach(() => {
  drift.mockRestore();
  removeTempWorkspaces();
});

describe("status vocabularies", () => {
  test("are stable", () => {
    expect(SUGGESTED_REQUIREMENT_STATUS).toStrictEqual({
      accepted: "open",
      proposed: "open",
      draft: "open",
      deprecated: "retired",
      superseded: "closed",
      rejected: "retired",
    });
    expect(DELIVERED_REQUIREMENT_TAG).toBe("implemented");
    expect(DELIVERED_REQUIREMENT_STATUS).toStrictEqual({
      implemented: DELIVERED,
      done: DELIVERED,
      completed: DELIVERED,
    });
  });
});

describe("planRequirementStatusMappings", () => {
  test("reports each requirement whose status is outside the vocabulary", () => {
    const root = tempWorkspace({
      ".kb/requirements/a.md": req("accepted", "id: REQ-z\n"),
      ".kb/requirements/b.md": req("wip", "id: ''\n"),
      ".kb/requirements/c.md": req("done", "id: 5\n"),
      ".kb/requirements/d-open.md": req("open"),
      ".kb/requirements/e.md": req("in_progress"),
      ".kb/requirements/f.md": req("closed"),
      ".kb/requirements/g.md": req("active"),
      ".kb/requirements/h.md": req("approved"),
      ".kb/requirements/i.md": req("5"),
      ".kb/requirements/j.md": doc("title: T\ntype: req\n"),
      ".kb/requirements/k.md": "status: done\n",
      ".kb/scenarios/S.md": req("done"),
    });
    const at = (relative: string) => path.join(root, relative);
    expect(planRequirementStatusMappings(root)).toStrictEqual([
      {
        requirementId: "b",
        path: ".kb/requirements/b.md",
        status: "wip",
        suggestedStatus: null,
        automatic: null,
        extractionError: extractionError(at(".kb/requirements/b.md")),
        latentDrift: null,
      },
      {
        requirementId: "c",
        path: ".kb/requirements/c.md",
        status: "done",
        suggestedStatus: "closed",
        automatic: DELIVERED,
        extractionError: extractionError(at(".kb/requirements/c.md")),
        latentDrift: { requirementId: "c", marker: true },
      },
      {
        requirementId: "REQ-z",
        path: ".kb/requirements/a.md",
        status: "accepted",
        suggestedStatus: "open",
        automatic: null,
        extractionError: null,
        latentDrift: { requirementId: "REQ-z", marker: true },
      },
    ] as unknown as ReturnType<typeof planRequirementStatusMappings>);
    expect(drift.mock.calls).toStrictEqual([
      [root, "REQ-z", { status: "open" }],
      [root, "c", { status: "closed" }],
    ]);
  });

  test("suggests a status for each legacy word", () => {
    const words = [
      ...Object.keys(SUGGESTED_REQUIREMENT_STATUS),
      ...Object.keys(DELIVERED_REQUIREMENT_STATUS),
    ];
    const files: Record<string, string> = {};
    for (const word of words) files[`.kb/requirements/${word}.md`] = req(word);
    const findings = planRequirementStatusMappings(tempWorkspace(files));
    expect(
      Object.fromEntries(
        findings.map((finding) => [finding.status, finding.suggestedStatus]),
      ),
    ).toStrictEqual({
      accepted: "open",
      completed: "closed",
      deprecated: "retired",
      done: "closed",
      draft: "open",
      implemented: "closed",
      proposed: "open",
      rejected: "retired",
      superseded: "closed",
    });
  });

  test("has no latent drift when the rederivation names other requirements", () => {
    drift.mockReturnValue([]);
    const root = tempWorkspace({ ".kb/requirements/R.md": req("draft") });
    expect(planRequirementStatusMappings(root)[0]?.latentDrift).toBeNull();
  });
});

describe("applyRequirementStatusMapping", () => {
  test("replaces only the status line", () => {
    const root = tempWorkspace({ ".kb/requirements/R.md": req("accepted") });
    applyRequirementStatusMapping(
      root,
      ".kb/requirements/R.md",
      "accepted",
      "open",
    );
    expect(readFileSync(path.join(root, ".kb/requirements/R.md"), "utf8")).toBe(
      req("open"),
    );
  });

  test("adds a missing tag once", () => {
    const root = tempWorkspace({
      ".kb/requirements/A.md": req("done"),
      ".kb/requirements/B.md": req("done", "tags: [implemented]\n"),
      ".kb/requirements/C.md": req("done", "tags: [x]\n"),
    });
    for (const name of ["A", "B", "C"])
      applyRequirementStatusMapping(
        root,
        `.kb/requirements/${name}.md`,
        "done",
        "closed",
        "implemented",
      );
    const read = (name: string) =>
      readFileSync(path.join(root, `.kb/requirements/${name}.md`), "utf8");
    expect(read("A")).toBe(req("closed", "tags:\n  - implemented\n"));
    expect(read("B")).toBe(req("closed", "tags: [implemented]\n"));
    expect(read("C")).toBe(req("closed", "tags: [x, implemented]\n"));
  });

  test("refuses a scalar tags field", () => {
    const root = tempWorkspace({
      ".kb/requirements/A.md": req("done", "tags: implemented\n"),
    });
    expect(() =>
      applyRequirementStatusMapping(
        root,
        ".kb/requirements/A.md",
        "done",
        "closed",
        "implemented",
      ),
    ).toThrow(
      new Error(
        ".kb/requirements/A.md: status could not be set to closed with tag implemented without changing other frontmatter fields; set it by hand.",
      ),
    );
  });

  test("refuses a status that changed or a file that is gone", () => {
    const root = tempWorkspace({ ".kb/requirements/A.md": req("open") });
    expect(() =>
      applyRequirementStatusMapping(
        root,
        ".kb/requirements/A.md",
        "done",
        "closed",
      ),
    ).toThrow(
      new Error(
        ".kb/requirements/A.md no longer has status done; rerun kibi migrate and approve the new plan.",
      ),
    );
    expect(() =>
      applyRequirementStatusMapping(root, "gone.md", "done", "closed"),
    ).toThrow(
      new Error(
        "gone.md no longer has status done; rerun kibi migrate and approve the new plan.",
      ),
    );
    const bare = tempWorkspace({ "x.md": "status: done\n" });
    expect(() =>
      applyRequirementStatusMapping(bare, "x.md", "done", "closed"),
    ).toThrow(
      new Error(
        "x.md no longer has status done; rerun kibi migrate and approve the new plan.",
      ),
    );
  });

  test("refuses a status it cannot replace in place", () => {
    const root = tempWorkspace({
      "x.md": doc("title: T\nstatus:\n  accepted\n"),
    });
    expect(() =>
      applyRequirementStatusMapping(root, "x.md", "accepted", "open"),
    ).toThrow(
      new Error(
        "x.md: status could not be set to open without changing other frontmatter fields; set it by hand.",
      ),
    );
  });
});

describe("applyDeliveredStatusMappings", () => {
  function workspace(): string {
    return tempWorkspace({
      ".kb/requirements/A.md": req("done", "id: REQ-a\n"),
      ".kb/requirements/B.md": req("accepted", "id: REQ-b\n"),
      ".kb/requirements/C.md": doc(
        "id: REQ-c\ntitle: T\nstatus:\n  completed\n",
      ),
      ".kb/requirements/D.md": req("implemented", "id: REQ-d\n"),
    });
  }

  test("maps every delivery status and reports what it could not edit", () => {
    const root = workspace();
    const result = applyDeliveredStatusMappings(root);
    expect(result.mapped.map((finding) => finding.requirementId)).toStrictEqual(
      ["REQ-a", "REQ-d"],
    );
    expect(result.skipped).toStrictEqual([
      {
        path: ".kb/requirements/C.md",
        reason:
          ".kb/requirements/C.md: status could not be set to closed with tag implemented without changing other frontmatter fields; set it by hand.",
      },
    ]);
    const read = (name: string) =>
      readFileSync(path.join(root, `.kb/requirements/${name}.md`), "utf8");
    expect(read("A")).toBe(
      req("closed", "id: REQ-a\ntags:\n  - implemented\n"),
    );
    expect(read("B")).toBe(req("accepted", "id: REQ-b\n"));
  });

  test("maps only the named requirements", () => {
    const root = workspace();
    const result = applyDeliveredStatusMappings(root, new Set(["REQ-d"]));
    expect(result.mapped.map((finding) => finding.requirementId)).toStrictEqual(
      ["REQ-d"],
    );
    expect(result.skipped).toStrictEqual([]);
    expect(readFileSync(path.join(root, ".kb/requirements/A.md"), "utf8")).toBe(
      req("done", "id: REQ-a\n"),
    );
  });
});
