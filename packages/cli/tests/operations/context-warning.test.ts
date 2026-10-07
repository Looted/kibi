import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  entityContextWarnings,
  upsertDocumentBody,
} from "../../src/operations/mutation/context-warning";

// implements REQ-kb-entity-body-context

const roots: string[] = [];
const REASON =
  "Support asked for this after the outage because customers could not tell which export was retained and for how long.";

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-ctx-warn-"));
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("kb_upsert context warning", () => {
  test("warns about a new requirement whose default body is its statement", () => {
    const warnings = entityContextWarnings(
      { type: "req", id: "REQ-a", properties: {} },
      { title: "Exports kept", semantic_text: "Exports must be kept." },
      workspace(),
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("requirement REQ-a has no body context");
    expect(warnings[0]).toContain("entity-context-missing");
    expect(warnings[0]).toContain("Reason not stated");
  });

  test("stays quiet for a sectioned body, exempt types and migration-acknowledged ids", () => {
    const root = workspace();
    expect(
      entityContextWarnings(
        {
          type: "req",
          id: "REQ-a",
          properties: {},
          document: {
            body: `Exports must be kept.\n\n## Context\n\n${REASON}\n`,
          },
        },
        { title: "Exports kept", semantic_text: "Exports must be kept." },
        root,
      ),
    ).toEqual([]);
    expect(
      entityContextWarnings(
        { type: "flag", id: "FLAG-a", properties: {} },
        { title: "Flag" },
        root,
      ),
    ).toEqual([]);
    const scenario = { type: "scenario", id: "SCEN-a", properties: {} };
    const tagged = { title: "Scenario", tags: ["review:context-missing"] };
    // The tag alone does not silence the warning.
    expect(entityContextWarnings(scenario, tagged, root)).toHaveLength(1);
    mkdirSync(path.join(root, ".kb"), { recursive: true });
    writeFileSync(
      path.join(root, ".kb/manifest.json"),
      JSON.stringify({
        manifestVersion: 1,
        schemaVersion: 8,
        semanticAdvisorBackfill: "not_applicable",
        contextAcknowledged: ["SCEN-a"],
      }),
    );
    expect(entityContextWarnings(scenario, tagged, root)).toEqual([]);
  });

  test("reads the preserved body of an existing document when none is supplied", () => {
    const root = workspace();
    mkdirSync(path.join(root, ".kb/scenarios"), { recursive: true });
    writeFileSync(
      path.join(root, ".kb/scenarios/SCEN-a.md"),
      `---\nid: SCEN-a\ntitle: Scenario\ntype: scenario\n---\n\n${REASON}\n`,
    );
    const input = { type: "scenario", id: "SCEN-a", properties: {} };
    const entity = { title: "Scenario", source: ".kb/scenarios/SCEN-a.md" };
    expect(upsertDocumentBody(input, entity, root).trim()).toBe(REASON);
    expect(entityContextWarnings(input, entity, root)).toEqual([]);
  });
});
