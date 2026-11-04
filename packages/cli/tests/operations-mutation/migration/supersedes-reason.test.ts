import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  SUPERSEDES_REASON_ACKNOWLEDGE_CODE,
  applySupersedesReasonAcknowledgement,
  mergeSupersedesAcknowledgements,
  planSupersedesReasonAcknowledgement,
} from "../../../src/operations/migration/supersedes-reason.js";
import { removeTempWorkspaces, tempWorkspace } from "../workspace.js";

afterEach(removeTempWorkspaces);

const WHY =
  "## Why this changed\n\nThe load test in TEST-export-load showed the nightly batch misses its window, which the old decision never measured.\n";

const sources = {
  ".kb/requirements/REQ-a.md": "---\nid: REQ-a\ntitle: A\n---\nA.\n",
  ".kb/requirements/REQ-a2.md": "---\nid: REQ-a2\ntitle: A2\n---\nA2.\n",
  ".kb/requirements/REQ-b.md":
    "---\nid: REQ-b\ntitle: B\nlinks:\n  - type: supersedes\n    target: REQ-a2\n  - type: supersedes\n    target: REQ-a\n---\nB.\n",
  ".kb/adr/ADR-c.md":
    "---\nid: ADR-c\ntitle: C\nlinks:\n  - type: supersedes\n    target: REQ-b\n---\nC.\n",
  ".kb/requirements/REQ-explained.md": `---\nid: REQ-explained\ntitle: E\nlinks:\n  - type: supersedes\n    target: REQ-a\n---\nE.\n\n${WHY}`,
};
const manifest = {
  manifestVersion: 1,
  schemaVersion: 8,
  semanticAdvisorBackfill: "not_applicable",
};

describe("supersedes reason acknowledgement", () => {
  test("the action code is stable", () => {
    expect(SUPERSEDES_REASON_ACKNOWLEDGE_CODE).toBe(
      "supersedes_reason_acknowledge",
    );
  });

  test("merges target edges sorted and unique", () => {
    const target = (edges: string[]) => ({
      id: "x",
      type: "req",
      path: "p",
      edges,
    });
    expect(
      mergeSupersedesAcknowledgements(undefined, [
        target(["b", "a"]),
        target(["a"]),
      ]),
    ).toStrictEqual(["a", "b"]);
    expect(
      mergeSupersedesAcknowledgements(["c", "a"], [target(["b"])]),
    ).toStrictEqual(["a", "b", "c"]);
  });

  test("plans unexplained superseders with their unacknowledged edges", () => {
    expect(
      planSupersedesReasonAcknowledgement(tempWorkspace(sources)),
    ).toStrictEqual([
      {
        id: "ADR-c",
        type: "adr",
        path: ".kb/adr/ADR-c.md",
        edges: ["ADR-c -> REQ-b"],
      },
      {
        id: "REQ-b",
        type: "req",
        path: ".kb/requirements/REQ-b.md",
        edges: ["REQ-b -> REQ-a", "REQ-b -> REQ-a2"],
      },
    ]);
    const root = tempWorkspace({
      ...sources,
      ".kb/manifest.json": JSON.stringify({
        ...manifest,
        supersedesReasonAcknowledged: ["ADR-c -> REQ-b", "REQ-b -> REQ-a"],
      }),
    });
    expect(planSupersedesReasonAcknowledgement(root)).toStrictEqual([
      {
        id: "REQ-b",
        type: "req",
        path: ".kb/requirements/REQ-b.md",
        edges: ["REQ-b -> REQ-a2"],
      },
    ]);
  });

  test("records the edges and reports how many entities were acknowledged", () => {
    const root = tempWorkspace({
      ...sources,
      ".kb/manifest.json": JSON.stringify({
        ...manifest,
        supersedesReasonAcknowledged: ["REQ-b -> REQ-a"],
      }),
    });
    expect(applySupersedesReasonAcknowledgement(root)).toBe(2);
    expect(
      JSON.parse(readFileSync(path.join(root, ".kb/manifest.json"), "utf8")),
    ).toStrictEqual({
      ...manifest,
      supersedesReasonAcknowledged: [
        "ADR-c -> REQ-b",
        "REQ-b -> REQ-a",
        "REQ-b -> REQ-a2",
      ],
    });
    expect(applySupersedesReasonAcknowledgement(root)).toBe(0);
  });

  test("does nothing without targets, and refuses without a manifest", () => {
    expect(applySupersedesReasonAcknowledgement(tempWorkspace({}))).toBe(0);
    expect(() =>
      applySupersedesReasonAcknowledgement(tempWorkspace(sources)),
    ).toThrow(
      new Error(
        "Cannot acknowledge existing supersedes without .kb/manifest.json; run 'kibi migrate --yes', which writes the manifest and the acknowledgement together.",
      ),
    );
  });
});
