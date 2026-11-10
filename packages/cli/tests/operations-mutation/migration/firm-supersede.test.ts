import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  FIRM_SUPERSEDE_ACKNOWLEDGE_CODE,
  applyFirmSupersedeAcknowledgement,
  mergeFirmSupersedeAcknowledgements,
  planFirmSupersedeAcknowledgement,
} from "../../../src/operations/migration/firm-supersede.js";
import { removeTempWorkspaces, tempWorkspace } from "../workspace.js";

afterEach(removeTempWorkspaces);

const sources = {
  ".kb/requirements/REQ-legacy.md":
    "---\nid: REQ-legacy\ntitle: Legacy\norigin:\n  kind: migration\n---\nLegacy.\n",
  ".kb/requirements/REQ-legacy-two.md":
    "---\nid: REQ-legacy-two\ntitle: Legacy two\norigin:\n  kind: migration\n---\nLegacy.\n",
  ".kb/requirements/REQ-agent-new.md":
    "---\nid: REQ-agent-new\ntitle: New\norigin:\n  kind: agent\nlinks:\n  - type: supersedes\n    target: REQ-legacy\n  - type: supersedes\n    target: REQ-legacy-two\n---\nNew.\n",
};
const manifest = {
  manifestVersion: 1,
  schemaVersion: 9,
  semanticAdvisorBackfill: "not_applicable",
};

function readManifest(root: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(root, ".kb/manifest.json"), "utf8"));
}

describe("firm supersede acknowledgement", () => {
  test("the action code is stable", () => {
    expect(FIRM_SUPERSEDE_ACKNOWLEDGE_CODE).toBe("firm_supersede_acknowledge");
  });

  test("merges acknowledgements sorted and unique", () => {
    expect(
      mergeFirmSupersedeAcknowledgements(undefined, ["b", "a", "b"]),
    ).toStrictEqual(["a", "b"]);
    expect(
      mergeFirmSupersedeAcknowledgements(["c", "a"], ["b", "a"]),
    ).toStrictEqual(["a", "b", "c"]);
    expect(mergeFirmSupersedeAcknowledgements([], [])).toStrictEqual([]);
  });

  test("plans every unacknowledged edge, skipping known ones", () => {
    const root = tempWorkspace({
      ...sources,
      ".kb/manifest.json": JSON.stringify({
        ...manifest,
        firmSupersedeAcknowledged: ["REQ-agent-new -> REQ-legacy"],
      }),
    });
    expect(planFirmSupersedeAcknowledgement(root)).toStrictEqual([
      "REQ-agent-new -> REQ-legacy-two",
    ]);
    expect(
      planFirmSupersedeAcknowledgement(tempWorkspace(sources)),
    ).toStrictEqual([
      "REQ-agent-new -> REQ-legacy",
      "REQ-agent-new -> REQ-legacy-two",
    ]);
  });

  test("records the edges in the manifest and reports how many", () => {
    const root = tempWorkspace({
      ...sources,
      ".kb/manifest.json": JSON.stringify({
        ...manifest,
        firmSupersedeAcknowledged: [
          "REQ-z -> REQ-y",
          "REQ-agent-new -> REQ-legacy",
        ],
      }),
    });
    expect(applyFirmSupersedeAcknowledgement(root)).toBe(1);
    expect(readManifest(root)).toStrictEqual({
      ...manifest,
      firmSupersedeAcknowledged: [
        "REQ-agent-new -> REQ-legacy",
        "REQ-agent-new -> REQ-legacy-two",
        "REQ-z -> REQ-y",
      ],
    });
    expect(applyFirmSupersedeAcknowledgement(root)).toBe(0);
  });

  test("does nothing without edges, even without a manifest", () => {
    expect(applyFirmSupersedeAcknowledgement(tempWorkspace({}))).toBe(0);
  });

  test("refuses to acknowledge without a manifest", () => {
    expect(() =>
      applyFirmSupersedeAcknowledgement(tempWorkspace(sources)),
    ).toThrow(
      new Error(
        "Cannot acknowledge existing supersedes without .kb/manifest.json; run 'kibi migrate --yes', which writes the manifest and the acknowledgement together.",
      ),
    );
  });
});
