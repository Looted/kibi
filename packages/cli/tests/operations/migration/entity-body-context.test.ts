import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { legacyRequirementSemanticText } from "../../../src/extractors/markdown.js";
import {
  applyContextMissingTags,
  applySemanticTextPins,
  countByType,
  planContextMissingTags,
  planSemanticTextPins,
  withAddedTag,
} from "../../../src/operations/migration/entity-body-context.js";
import {
  applySchema6MigrationAction,
  buildSchema6MigrationFragment,
} from "../../../src/operations/migration/schema6.js";
import { readKbManifest } from "../../../src/utils/kb-manifest.js";

// implements REQ-kb-entity-body-context

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-body-context-"));
  roots.push(root);
  for (const [relative, content] of Object.entries(files)) {
    const absolute = path.join(root, relative);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, content);
  }
  return root;
}

const REASON =
  "Support asked for this after the outage because customers could not tell which export was retained and for how long.";

describe("withAddedTag", () => {
  const body = "\nBody stays.\n";
  const tag = "review:context-missing";

  test("adds the key, extends a flow list and a block list", () => {
    expect(withAddedTag(`---\nid: A\n---${body}`, tag)).toBe(
      `---\nid: A\ntags:\n  - ${tag}\n---${body}`,
    );
    expect(withAddedTag(`---\nid: A\ntags: [x, y]\n---${body}`, tag)).toBe(
      `---\nid: A\ntags: [x, y, ${tag}]\n---${body}`,
    );
    expect(withAddedTag(`---\nid: A\ntags: []\nz: 1\n---${body}`, tag)).toBe(
      `---\nid: A\ntags: [${tag}]\nz: 1\n---${body}`,
    );
    expect(
      withAddedTag(`---\nid: A\ntags:\n  - x\n  - y\nz: 1\n---${body}`, tag),
    ).toBe(`---\nid: A\ntags:\n  - x\n  - y\n  - ${tag}\nz: 1\n---${body}`);
    expect(withAddedTag(`---\nid: A\ntags:\n- x\nz: 1\n---${body}`, tag)).toBe(
      `---\nid: A\ntags:\n- x\n- ${tag}\nz: 1\n---${body}`,
    );
  });

  test("refuses shapes it cannot edit safely", () => {
    expect(withAddedTag("no front matter", tag)).toBeNull();
    expect(withAddedTag(`---\nid: A\ntags: x\n---${body}`, tag)).toBeNull();
    expect(
      withAddedTag(`---\nid: A\ntags: [x,\n  y]\n---${body}`, tag),
    ).toBeNull();
  });
});

describe("schema 8 planning", () => {
  test("pins the legacy derivation, including context sections", () => {
    const root = workspace({
      ".kb/requirements/REQ-a.md": `---\nid: REQ-a\ntitle: A\n---\nA must hold.\n\n## Context\n\n${REASON}\n`,
      ".kb/requirements/REQ-b.md":
        "---\nid: REQ-b\ntitle: B\nsemantic_text: Stated.\n---\nB.\n",
      ".kb/requirements/REQ-c.md": "---\nid: REQ-c\ntitle: C\n---\n\n",
    });
    const plan = planSemanticTextPins(root);
    expect(plan.targets.map((target) => target.id)).toEqual(["REQ-a"]);
    const expected = legacyRequirementSemanticText(
      `A must hold.\n\n## Context\n\n${REASON}\n`,
    );
    expect(expected).toContain(REASON);
    expect(plan.targets[0]?.after).toContain(
      `semantic_text: ${JSON.stringify(expected)}`,
    );
    expect(applySemanticTextPins(root)).toBe(1);
    expect(planSemanticTextPins(root).targets).toEqual([]);
  });

  test("tags only current entities that lack context, and is idempotent", () => {
    const root = workspace({
      ".kb/requirements/REQ-thin.md":
        "---\nid: REQ-thin\ntitle: Thin\n---\nThin must hold.\n",
      ".kb/requirements/REQ-ok.md": `---\nid: REQ-ok\ntitle: Ok\n---\nOk must hold.\n\n## Context\n\n${REASON}\n`,
      ".kb/requirements/REQ-old.md":
        "---\nid: REQ-old\ntitle: Old\n---\nOld.\n",
      ".kb/requirements/REQ-new.md":
        "---\nid: REQ-new\ntitle: New\nlinks:\n  - type: supersedes\n    target: REQ-old\n---\nNew.\n",
      ".kb/scenarios/SCEN-thin.md": "---\nid: SCEN-thin\ntitle: S\n---\n\n",
      ".kb/adr/ADR-dep.md":
        "---\nid: ADR-dep\ntitle: D\nstatus: deprecated\n---\n\n",
      ".kb/facts/FACT-subject.md":
        "---\nid: FACT-subject\ntitle: Subject\nfact_kind: subject\n---\n\n",
      ".kb/facts/FACT-obs.md":
        "---\nid: FACT-obs\ntitle: Obs\nfact_kind: observation\n---\n\n",
      ".kb/requirements/REQ-tagged.md":
        "---\nid: REQ-tagged\ntitle: T\ntags: [review:context-missing]\n---\nT.\n",
      ".kb/manifest.json": JSON.stringify({
        manifestVersion: 1,
        schemaVersion: 7,
        semanticAdvisorBackfill: "not_applicable",
      }),
    });
    const plan = planContextMissingTags(root);
    expect(plan.targets.map((target) => target.id).sort()).toEqual([
      "FACT-obs",
      "REQ-new",
      "REQ-thin",
      "SCEN-thin",
    ]);
    expect(countByType(plan.targets)).toEqual({ fact: 1, req: 2, scenario: 1 });
    expect(plan.alreadyTagged).toEqual(["REQ-tagged"]);
    expect(applyContextMissingTags(root)).toBe(4);
    expect(applyContextMissingTags(root)).toBe(0);
    // The ids the migration acknowledged are recorded in the manifest, the
    // only thing entity-context-missing honors; a later self-tag is not in it.
    expect(readKbManifest(root)?.contextAcknowledged).toEqual([
      "FACT-obs",
      "REQ-new",
      "REQ-tagged",
      "REQ-thin",
      "SCEN-thin",
    ]);
  });
});

describe("schema 8 migration plan actions", () => {
  const files = {
    ".kb/requirements/REQ-a.md":
      "---\nid: REQ-a\ntitle: A\n---\nA must hold.\n\n## Context\n\nShort.\n",
    ".kb/scenarios/SCEN-a.md": "---\nid: SCEN-a\ntitle: S\n---\n\n",
  };
  const context = (root: string) => ({
    workspaceRoot: root,
    clock: () => new Date("2026-10-06T00:00:00Z"),
  });

  test("plans automatic pin and tag actions before schema 8 only", async () => {
    const root = workspace(files);
    const fragment = buildSchema6MigrationFragment({
      workspaceRoot: root,
      currentSchemaVersion: 7,
    });
    const pin = fragment.actions.find(
      (action) => action.id === "semantic-text-pin",
    );
    const tag = fragment.actions.find(
      (action) => action.id === "context-missing-tag",
    );
    expect(pin).toMatchObject({
      safety: "automatic",
      affectedEntityIds: ["REQ-a"],
    });
    expect(tag).toMatchObject({
      safety: "automatic",
      dependsOn: ["semantic-text-pin"],
      evidence: { count: 2, byType: { req: 1, scenario: 1 } },
    });
    expect(fragment.sourceRewriteActionIds).toEqual(
      expect.arrayContaining(["semantic-text-pin", "context-missing-tag"]),
    );
    for (const version of [8, 9]) {
      expect(
        buildSchema6MigrationFragment({
          workspaceRoot: root,
          currentSchemaVersion: version,
        }).actions.map((action) => action.id),
      ).not.toContain("context-missing-tag");
    }
    if (pin === undefined || tag === undefined) throw new Error("no actions");
    await applySchema6MigrationAction(pin, context(root));
    await applySchema6MigrationAction(tag, context(root));
    expect(planSemanticTextPins(root).targets).toEqual([]);
    expect(planContextMissingTags(root).targets).toEqual([]);
  });
});
