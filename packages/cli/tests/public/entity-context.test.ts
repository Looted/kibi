import { describe, expect, test } from "bun:test";
import {
  ENTITY_CONTEXT_ACKNOWLEDGED_RULE,
  ENTITY_CONTEXT_MISSING_RULE,
  evaluateEntityContext,
  readAuthoredEntity,
} from "../../src/public/operations/entity-context";

const REASON =
  "Support asked for this after the outage because customers could not tell which export was retained and for how long.";

function entity(
  type: string,
  id: string,
  frontmatter: string,
  body: string,
): NonNullable<ReturnType<typeof readAuthoredEntity>> {
  const parsed = readAuthoredEntity(
    `---\nid: ${id}\ntitle: ${id} title\ntype: ${type}\n${frontmatter}---\n\n${body}`,
    `.kb/${type}/${id}.md`,
  );
  if (parsed === null) throw new Error("fixture did not parse");
  return parsed;
}

describe("entity-context-missing evaluation", () => {
  test("blocks thin entities and names what is missing per type", () => {
    const findings = evaluateEntityContext(
      [
        entity("req", "REQ-thin", "", "Exports must be kept.\n"),
        entity("scenario", "SCEN-thin", "", "\n"),
        entity("test", "TEST-thin", "", "short\n"),
        entity("adr", "ADR-thin", "", "\n"),
        entity("fact", "FACT-obs", "fact_kind: observation\n", "\n"),
      ],
      new Set(),
    );
    expect(findings.map((finding) => finding.entityId)).toEqual([
      "ADR-thin",
      "FACT-obs",
      "REQ-thin",
      "SCEN-thin",
      "TEST-thin",
    ]);
    const req = findings.find((finding) => finding.entityId === "REQ-thin");
    expect(req?.rule).toBe(ENTITY_CONTEXT_MISSING_RULE);
    expect(req?.description).toContain("requirement REQ-thin");
    expect(req?.description).toContain("## Context");
    expect(req?.suggestion).toContain("Reason not stated");
    expect(req?.source).toBe(".kb/req/REQ-thin.md");
  });

  test("passes entities with real context and exempt types", () => {
    const findings = evaluateEntityContext(
      [
        entity(
          "req",
          "REQ-ok",
          "",
          `Exports must be kept.\n\n## Context\n\n${REASON}\n`,
        ),
        entity("scenario", "SCEN-ok", "", `${REASON}\n`),
        entity("fact", "FACT-subject", "fact_kind: subject\n", "\n"),
        entity("fact", "FACT-meta", "fact_kind: meta\n", `${REASON}\n`),
      ],
      new Set(),
    );
    expect(findings).toEqual([]);
  });

  test("a req body that is only a statement does not count as context", () => {
    const findings = evaluateEntityContext(
      [entity("req", "REQ-flat", "", `${REASON}\n`)],
      new Set(),
    );
    expect(findings.map((finding) => finding.entityId)).toEqual(["REQ-flat"]);
  });

  test("ignores superseded and deprecated entities", () => {
    const findings = evaluateEntityContext(
      [
        entity("req", "REQ-old", "", "Old.\n"),
        entity("adr", "ADR-gone", "status: deprecated\n", "\n"),
        entity("req", "REQ-new", "", "New.\n"),
      ],
      new Set(["REQ-old"]),
    );
    expect(findings.map((finding) => finding.entityId)).toEqual(["REQ-new"]);
  });

  test("migration-acknowledged entities are counted once and do not block", () => {
    const findings = evaluateEntityContext(
      [
        entity(
          "req",
          "REQ-legacy",
          "tags:\n  - review:context-missing\n",
          "Old.\n",
        ),
        entity(
          "scenario",
          "SCEN-legacy",
          "tags: [review:context-missing]\n",
          "\n",
        ),
        entity(
          "test",
          "TEST-fine",
          "tags: [review:context-missing]\n",
          `${REASON}\n`,
        ),
      ],
      new Set(),
      undefined,
      new Set(["REQ-legacy", "SCEN-legacy", "TEST-fine"]),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.rule).toBe(ENTITY_CONTEXT_ACKNOWLEDGED_RULE);
    expect(findings[0]?.entityId).toBe("workspace");
    expect(findings[0]?.description).toContain("2 current entities");
    expect(findings[0]?.evidence).toEqual({
      total: 2,
      byType: { req: 1, scenario: 1 },
    });
  });

  test("the tag does not silence the check unless the migration acknowledged the entity", () => {
    const findings = evaluateEntityContext(
      [
        entity("req", "REQ-selftag", "tags: [review:context-missing]\n", "x\n"),
        entity(
          "scenario",
          "SCEN-acked",
          "tags: [review:context-missing]\n",
          "\n",
        ),
      ],
      new Set(),
      undefined,
      new Set(["SCEN-acked"]),
    );
    const blocking = findings.filter(
      (finding) => finding.rule === ENTITY_CONTEXT_MISSING_RULE,
    );
    expect(blocking.map((finding) => finding.entityId)).toEqual([
      "REQ-selftag",
    ]);
    expect(blocking[0]?.description).toContain("not honored");
    expect(blocking[0]?.suggestion).toBe(
      "review:context-missing is reserved for entities acknowledged by the schema 8 migration; add context instead: write who asked, the source and 'Reason not stated' in the Context section, and remove the tag.",
    );
    expect(blocking[0]?.suggestion).not.toContain("leave the entity tagged");
  });

  test("selected rules limit what is reported", () => {
    const entities = [
      entity("req", "REQ-thin", "", "x\n"),
      entity("req", "REQ-legacy", "tags: [review:context-missing]\n", "x\n"),
    ];
    const acknowledged = new Set(["REQ-legacy"]);
    expect(
      evaluateEntityContext(
        entities,
        new Set(),
        new Set([ENTITY_CONTEXT_MISSING_RULE]),
        acknowledged,
      ).map((finding) => finding.rule),
    ).toEqual([ENTITY_CONTEXT_MISSING_RULE]);
    expect(
      evaluateEntityContext(
        entities,
        new Set(),
        new Set([ENTITY_CONTEXT_ACKNOWLEDGED_RULE]),
        acknowledged,
      ).map((finding) => finding.rule),
    ).toEqual([ENTITY_CONTEXT_ACKNOWLEDGED_RULE]);
  });

  test("a document without front matter is not an authored entity", () => {
    expect(readAuthoredEntity("no front matter", "a.md")).toBeNull();
  });
});
