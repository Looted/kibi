import { afterEach, describe, expect, test } from "bun:test";
import {
  entityContextWarnings,
  upsertDocumentBody,
} from "../../../src/operations/mutation/context-warning.js";
import { cleanupWorkspaces, workspace, writeIn } from "../workspace.js";

afterEach(cleanupWorkspaces);

const HINT =
  "Add a '## Context' section (requirements) or a prose body (scenarios, tests, ADRs, observation facts) stating why this exists, who asked, the source and anything that does not fit the front matter. Never invent a reason the requester did not give: write who asked, the source and 'Reason not stated' in the Context section instead.";
const REASON =
  "Support asked for this after the outage because customers could not tell which export was retained and for how long.";
const STATEMENT =
  "Exports must be retained for ninety days in the archive bucket so that support staff can restore them";
const warning = (description: string) =>
  `${description}. kb_check blocks it under entity-context-missing. ${HINT}`;

const req = (extra: Record<string, unknown> = {}) => ({
  type: "req",
  id: "REQ-a",
  properties: {},
  ...extra,
});

describe("upsertDocumentBody", () => {
  test("defaults to the statement for a requirement and empty otherwise", () => {
    const root = workspace();
    expect(upsertDocumentBody(req(), { semantic_text: "S." }, root)).toBe(
      "S.\n",
    );
    expect(upsertDocumentBody(req(), {}, root)).toBe("\n");
    expect(
      upsertDocumentBody(
        { type: "scenario", id: "S", properties: {} },
        { semantic_text: "S." },
        root,
      ),
    ).toBe("");
  });

  test("prefers the written file, then the supplied body, then the existing document", () => {
    const root = workspace();
    writeIn(root, "written.md", "---\nid: REQ-a\n---\nWritten body.\n");
    writeIn(root, "existing.md", "---\nid: REQ-a\n---\nExisting body.\n");
    writeIn(root, "target.md", "---\nid: REQ-a\n---\nTarget body.\n");
    writeIn(root, "doc.md", "---\nid: REQ-a\n---\nDoc path body.\n");
    const entity = { source: "existing.md", semantic_text: "S." };
    expect(
      upsertDocumentBody(
        req({ document: { body: "Supplied.\n" } }),
        entity,
        root,
        {
          writtenPath: "written.md",
        },
      ),
    ).toBe("Written body.\n");
    expect(
      upsertDocumentBody(
        req({ document: { body: "Supplied.\n" } }),
        entity,
        root,
        {
          writtenPath: "missing.md",
        },
      ),
    ).toBe("Supplied.\n");
    expect(upsertDocumentBody(req(), entity, root)).toBe("Existing body.\n");
    expect(
      upsertDocumentBody(req(), entity, root, { targetPath: "target.md" }),
    ).toBe("Target body.\n");
    expect(
      upsertDocumentBody(req({ document: { path: "doc.md" } }), entity, root, {
        targetPath: "target.md",
      }),
    ).toBe("Doc path body.\n");
  });

  test("ignores non-markdown, missing and front-matter-less documents", () => {
    const root = workspace();
    writeIn(root, "notes.txt", "---\nid: REQ-a\n---\nText body.\n");
    writeIn(root, "plain.md", "No front matter here.\n");
    for (const source of ["notes.txt", "missing.md", "plain.md", 3]) {
      expect(
        upsertDocumentBody(req(), { source, semantic_text: "S." }, root, {
          writtenPath: typeof source === "string" ? source : undefined,
        }),
      ).toBe("S.\n");
    }
  });
});

describe("entityContextWarnings", () => {
  test("warns about a requirement without a context section", () => {
    expect(
      entityContextWarnings(
        req(),
        { title: "Exports", semantic_text: STATEMENT },
        workspace(),
      ),
    ).toStrictEqual([
      warning(
        "requirement REQ-a has no body context: a '## Context' (or Rationale, Why, Background, Source, Notes, Evidence) section that states why this exists is missing",
      ),
    ]);
  });

  test("compares the context section with the stored statement", () => {
    const body = `Something else entirely.\n\n## Context\n\n${STATEMENT}.\n`;
    const restated = warning(
      "requirement REQ-a has no body context: a '## Context' (or Rationale, Why, Background, Source, Notes, Evidence) section that states why this exists only restates the title or statement",
    );
    expect(
      entityContextWarnings(
        req({ document: { body } }),
        { title: "Exports", semantic_text: STATEMENT },
        workspace(),
      ),
    ).toStrictEqual([restated]);
    // A blank stored statement falls back to the one the body states.
    const derived = `${STATEMENT}.\n\n## Context\n\n${STATEMENT}.\n`;
    expect(
      entityContextWarnings(
        req({ document: { body: derived } }),
        { title: "Exports", semantic_text: "   " },
        workspace(),
      ),
    ).toStrictEqual([restated]);
    expect(
      entityContextWarnings(
        req({
          document: { body: `${STATEMENT}.\n\n## Context\n\n${REASON}\n` },
        }),
        { title: "Exports", semantic_text: STATEMENT },
        workspace(),
      ),
    ).toStrictEqual([]);
  });

  test("passes the title and fact kind to the finding", () => {
    const root = workspace();
    const scenario = { type: "scenario", id: "SCEN-a", properties: {} };
    expect(
      entityContextWarnings(
        { ...scenario, document: { body: `${STATEMENT}.\n` } },
        { title: STATEMENT },
        root,
      ),
    ).toStrictEqual([
      warning(
        "scenario SCEN-a has no body context: body prose that states why this exists only restates the title or statement",
      ),
    ]);
    const fact = { type: "fact", id: "FACT-a", properties: {} };
    expect(
      entityContextWarnings(fact, { fact_kind: "observation" }, root),
    ).toStrictEqual([
      warning(
        "observation fact FACT-a has no body context: body prose that states why this exists is missing",
      ),
    ]);
    expect(entityContextWarnings(fact, {}, root)).toStrictEqual([]);
  });

  test("honours ids the lifecycle manifest acknowledges", () => {
    const root = workspace();
    const scenario = { type: "scenario", id: "SCEN-a", properties: {} };
    expect(entityContextWarnings(scenario, { title: "S" }, root)).toHaveLength(
      1,
    );
    writeIn(
      root,
      ".kb/manifest.json",
      JSON.stringify({
        manifestVersion: 1,
        schemaVersion: 8,
        semanticAdvisorBackfill: "not_applicable",
      }),
    );
    expect(entityContextWarnings(scenario, { title: "S" }, root)).toHaveLength(
      1,
    );
    writeIn(
      root,
      ".kb/manifest.json",
      JSON.stringify({
        manifestVersion: 1,
        schemaVersion: 8,
        semanticAdvisorBackfill: "not_applicable",
        contextAcknowledged: ["SCEN-b"],
      }),
    );
    expect(entityContextWarnings(scenario, { title: "S" }, root)).toHaveLength(
      1,
    );
    expect(
      entityContextWarnings(
        { ...scenario, id: "SCEN-b" },
        { title: "S" },
        root,
      ),
    ).toStrictEqual([]);
  });
});
