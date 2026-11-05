import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { legacyRequirementSemanticText } from "../../../src/extractors/markdown.js";
import * as kbSources from "../../../src/operations/migration/kb-sources.js";
import {
  type AuthoredEntity,
  ENTITY_CONTEXT_ACKNOWLEDGED_RULE,
  ENTITY_CONTEXT_MISSING_RULE,
  ENTITY_CONTEXT_RULES,
  authoredSupersededIds,
  collectEntityContextViolations,
  contextEntityOf,
  contextStatementOf,
  evaluateEntityContext,
  isCurrentAuthoredEntity,
  listContextAuthoredEntities,
  readAuthoredEntity,
} from "../../../src/public/operations/entity-context.js";
import { expectGolden } from "../helpers/golden.js";

const roots: string[] = [];
const spies: { mockRestore: () => void }[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-entity-context-"));
  roots.push(root);
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), content);
  }
  return root;
}

const REASON =
  "Support asked for this after the outage because customers could not tell which export was retained and for how long.";

const doc = (frontmatter: string, body = "\n") =>
  `---\n${frontmatter}---\n${body}`;

const authored = (
  fields: Partial<AuthoredEntity> & { data?: Record<string, unknown> },
): AuthoredEntity => ({
  id: "REQ-a",
  type: "req",
  path: ".kb/requirements/REQ-a.md",
  data: {},
  body: "",
  ...fields,
});

describe("rule names", () => {
  test("are the published identifiers", () => {
    expect(ENTITY_CONTEXT_MISSING_RULE).toBe("entity-context-missing");
    expect(ENTITY_CONTEXT_ACKNOWLEDGED_RULE).toBe(
      "entity-context-acknowledged",
    );
    expect(ENTITY_CONTEXT_RULES).toEqual([
      "entity-context-missing",
      "entity-context-acknowledged",
    ]);
  });
});

describe("readAuthoredEntity", () => {
  test("rejects front matter that is not a record", () => {
    expect(readAuthoredEntity("plain text\n", "a.md")).toBeNull();
    expect(readAuthoredEntity(doc("id: [\n"), "a.md")).toBeNull();
    expect(readAuthoredEntity(doc("~\n"), "a.md")).toBeNull();
    expect(readAuthoredEntity(doc("5\n"), "a.md")).toBeNull();
    expect(readAuthoredEntity(doc("- a\n"), "a.md")).toBeNull();
  });

  test("reads the type from the field or the lane", () => {
    const typeOf = (frontmatter: string, file: string) =>
      readAuthoredEntity(doc(frontmatter), file)?.type;
    expect(typeOf("type: adr\n", ".kb/requirements/x.md")).toBe("adr");
    expect(typeOf("type: 5\n", ".kb/requirements/x.md")).toBe("req");
    expect(typeOf("title: t\n", ".kb/scenarios/x.md")).toBe("scenario");
    expect(typeOf("title: t\n", "notes/x.md")).toBe("");
  });

  test("reads a trimmed id or falls back to the file name", () => {
    const idOf = (frontmatter: string) =>
      readAuthoredEntity(doc(frontmatter), ".kb/requirements/REQ-file.md")?.id;
    expect(idOf("id: ' REQ-a '\n")).toBe("REQ-a");
    expect(idOf("id: '   '\n")).toBe("REQ-file");
    expect(idOf("id: 5\n")).toBe("REQ-file");
    expect(idOf("title: t\n")).toBe("REQ-file");
  });

  test("keeps the body after the closing line and the parsed record", () => {
    expect(readAuthoredEntity("---\nid: A\n---", "a.md")).toEqual({
      id: "A",
      type: "",
      path: "a.md",
      data: { id: "A" },
      body: "",
    });
    expect(
      readAuthoredEntity("---\nid: A\n---\nOne\nTwo\n", "a.md")?.body,
    ).toBe("One\nTwo\n");
    expect(
      readAuthoredEntity("---\r\nid: A\r\n---\r\nOne\r\n", "a.md")?.body,
    ).toBe("One\r\n");
  });
});

describe("contextStatementOf", () => {
  const body = `Exports must be kept.\n\n## Context\n\n${REASON}\n`;
  const statementWith = (semantic_text: unknown, type = "req") =>
    contextStatementOf(authored({ type, body, data: { semantic_text } }));

  test("applies to requirements only", () => {
    expect(statementWith("Pinned", "scenario")).toBeUndefined();
  });

  test("keeps an authored statement and replaces a pinned derivation", () => {
    const legacy = legacyRequirementSemanticText(body);
    expect(legacy).not.toBe("Exports must be kept.");
    expect(statementWith("Pinned")).toBe("Pinned");
    expect(statementWith(legacy)).toBe("Exports must be kept.");
    expect(statementWith(` ${legacy} `)).toBe("Exports must be kept.");
    expect(statementWith("   ")).toBe("Exports must be kept.");
    expect(statementWith(5)).toBe("Exports must be kept.");
    expect(statementWith(undefined)).toBe("Exports must be kept.");
  });

  test("feeds the context view", () => {
    expect(
      contextEntityOf(
        authored({
          body,
          data: { title: "T", fact_kind: "k", tags: ["x"], other: 1 },
        }),
      ),
    ).toEqual({
      title: "T",
      semantic_text: "Exports must be kept.",
      fact_kind: "k",
      tags: ["x"],
    });
  });
});

describe("isCurrentAuthoredEntity", () => {
  test("drops retired statuses and superseded ids", () => {
    const current = (status: unknown, superseded: string[] = []) =>
      isCurrentAuthoredEntity(
        authored({ data: { status } }),
        new Set(superseded),
      );
    for (const status of ["deprecated", "superseded", "archived", "removed"])
      expect(current(status)).toBe(false);
    expect(current("active")).toBe(true);
    expect(current(["deprecated"])).toBe(true);
    expect(current(undefined)).toBe(true);
    expect(current("active", ["REQ-a"])).toBe(false);
  });
});

describe("evaluateEntityContext", () => {
  const thin = (id: string, type: string, tags: string[] = []) =>
    authored({
      id,
      type,
      path: `.kb/${type}/${id}.md`,
      data: { title: `${id} title`, tags },
      body: "short\n",
    });

  test("reports evidence and counts acknowledged entities by type", () => {
    const findings = evaluateEntityContext(
      [
        thin("A-test", "test"),
        thin("B-req", "req"),
        thin("C-scenario", "scenario", ["review:context-missing"]),
        thin("D-test", "test"),
      ],
      new Set(),
      undefined,
      new Set(["A-test", "B-req", "D-test"]),
    );
    expectGolden("entity-context-findings", findings);
    expect(
      evaluateEntityContext(
        [thin("A-test", "test")],
        new Set(),
        undefined,
        new Set(["A-test"]),
      )[0]?.description,
    ).toBe(
      "1 current entity is tagged review:context-missing and still lack body context (1 test)",
    );
  });
});

describe("authored entities in a workspace", () => {
  const thinReq = (id: string, extra = "") =>
    doc(`id: ${id}\ntitle: ${id} title\n${extra}`, "Short.\n");
  const shard = (records: [string, string, string][]) =>
    `relationships:\n${records
      .map(
        ([type, from, to], index) =>
          `  - id: r${index}\n    type: ${type}\n    from: ${from}\n    to: ${to}\n    created_at: "2026-01-01T00:00:00Z"\n    created_by: test\n    source: test\n`,
      )
      .join("")}`;

  test("lists only documents of a checked type", () => {
    const root = workspace({
      ".kb/requirements/REQ-a.md": thinReq("REQ-a"),
      ".kb/requirements/REQ-sym.md": thinReq("REQ-sym", "type: symbol\n"),
      ".kb/requirements/plain.md": "no front matter\n",
      ".kb/scenarios/SCEN-a.md": doc("id: SCEN-a\n", `${REASON}\n`),
      ".kb/flags/FLAG-a.md": thinReq("FLAG-a", "type: req\n"),
    });
    expect(
      listContextAuthoredEntities(root).map((entity) => [
        entity.id,
        entity.type,
        entity.path,
      ]),
    ).toEqual([
      ["REQ-a", "req", ".kb/requirements/REQ-a.md"],
      ["SCEN-a", "scenario", ".kb/scenarios/SCEN-a.md"],
    ]);
  });

  test("skips a document that cannot be read", () => {
    const root = workspace({
      ".kb/requirements/REQ-a.md": thinReq("REQ-a"),
      ".kb/requirements/REQ-b.md": thinReq("REQ-b"),
    });
    const real = kbSources.readText;
    spies.push(
      spyOn(kbSources, "readText").mockImplementation((file: string) =>
        file.endsWith("REQ-a.md") ? null : real(file),
      ),
    );
    expect(
      listContextAuthoredEntities(root).map((entity) => entity.id),
    ).toEqual(["REQ-b"]);
  });

  test("collects superseded ids from links and shards", () => {
    const root = workspace({
      ".kb/relationships/a.yaml": shard([
        ["supersedes", "REQ-new", "REQ-shard"],
        ["relates_to", "REQ-new", "REQ-related"],
      ]),
    });
    const entities = [
      authored({
        data: {
          links: [
            null,
            "REQ-text",
            { type: "supersedes", target: 5 },
            { type: "relates_to", target: "REQ-rel" },
            { type: "supersedes", target: "REQ-linked" },
          ],
        },
      }),
      authored({ data: { links: "REQ-string" } }),
      authored({ data: {} }),
    ];
    expect([...authoredSupersededIds(root, entities)].sort()).toEqual([
      "REQ-linked",
      "REQ-shard",
    ]);
    const broken = workspace({ ".kb/relationships/a.yaml": "other: 1\n" });
    expect([...authoredSupersededIds(broken, entities)]).toEqual([
      "REQ-linked",
    ]);
  });

  test("evaluates the selected rules over the workspace", () => {
    const files = {
      ".kb/requirements/REQ-thin.md": thinReq("REQ-thin"),
      ".kb/requirements/REQ-legacy.md": thinReq("REQ-legacy"),
      ".kb/requirements/REQ-old.md": thinReq("REQ-old", "status: deprecated\n"),
      ".kb/requirements/REQ-gone.md": thinReq("REQ-gone"),
      ".kb/relationships/a.yaml": shard([
        ["supersedes", "REQ-thin", "REQ-gone"],
      ]),
    };
    const manifest = (extra: Record<string, unknown>) =>
      JSON.stringify({
        manifestVersion: 1,
        schemaVersion: 8,
        semanticAdvisorBackfill: "not_applicable",
        ...extra,
      });
    const rulesOf = (root: string, rules: readonly string[]) =>
      collectEntityContextViolations(new Set(rules), root).map(
        (finding) => `${finding.rule} ${finding.entityId}`,
      );
    const acknowledged = workspace({
      ...files,
      ".kb/manifest.json": manifest({ contextAcknowledged: ["REQ-legacy"] }),
    });
    const listed = spyOn(kbSources, "listLaneMarkdownFiles");
    spies.push(listed);
    expect(rulesOf(acknowledged, ["other"])).toEqual([]);
    expect(listed).not.toHaveBeenCalled();
    expect(rulesOf(acknowledged, [ENTITY_CONTEXT_MISSING_RULE])).toEqual([
      "entity-context-missing REQ-thin",
    ]);
    expect(rulesOf(acknowledged, ENTITY_CONTEXT_RULES)).toEqual([
      "entity-context-missing REQ-thin",
      "entity-context-acknowledged workspace",
    ]);
    const unlisted = workspace({ ...files, ".kb/manifest.json": manifest({}) });
    expect(rulesOf(unlisted, [ENTITY_CONTEXT_MISSING_RULE])).toEqual([
      "entity-context-missing REQ-legacy",
      "entity-context-missing REQ-thin",
    ]);
    const missing = workspace(files);
    expect(rulesOf(missing, [ENTITY_CONTEXT_MISSING_RULE])).toEqual([
      "entity-context-missing REQ-legacy",
      "entity-context-missing REQ-thin",
    ]);
  });
});
