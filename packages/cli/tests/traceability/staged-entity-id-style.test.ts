import { describe, expect, test } from "bun:test";
import type { StagedFile } from "../../src/traceability/git-staged.js";
import { createStagedEntityIdStyleDiagnostics } from "../../src/traceability/staged-entity-id-style.js";

// implements REQ-kibi-entity-id-style

function staged(
  path: string,
  status: StagedFile["status"],
  content: string | undefined,
): StagedFile {
  return { path, status, hunkRanges: [], content };
}

const doc = (id: string) => `---\nid: '${id}'\ntitle: Thing\n---\nBody\n`;

describe("createStagedEntityIdStyleDiagnostics", () => {
  test("reports every style issue of an added entity with the full shape", () => {
    expect(
      createStagedEntityIdStyleDiagnostics([
        staged(".kb/requirements/REQ-x.md", "A", doc("  REQ-012  ")),
      ]),
    ).toStrictEqual([
      {
        id: "entity_id_style_review",
        severity: "warning",
        blocking: false,
        category: "naming",
        entityId: "REQ-012",
        source: ".kb/requirements/REQ-x.md",
        files: [".kb/requirements/REQ-x.md"],
        docs: ["docs/entity-schema.md"],
        message:
          "Entity ID REQ-012 is a sequence number; parallel branches pick the same next number and collide.",
        suggestion:
          "Name the entity by what it governs: <TYPE>-<area>-<behavior> in kebab-case (for example REQ-cli-gc). kb_search the area first and update or supersede an existing entity when one already covers the behavior.",
      },
      {
        id: "entity_id_style_review",
        severity: "warning",
        blocking: false,
        category: "naming",
        entityId: "REQ-012",
        source: ".kb/requirements/REQ-x.md",
        files: [".kb/requirements/REQ-x.md"],
        docs: ["docs/entity-schema.md"],
        message: "Entity ID REQ-012 does not match its filename stem REQ-x.",
        suggestion:
          "Rename the file to REQ-012.md or set frontmatter id: REQ-x so the file name and identity stay aligned.",
      },
    ]);
  });

  test("reviews renamed entities and skips other statuses", () => {
    const ids = (status: StagedFile["status"]) =>
      createStagedEntityIdStyleDiagnostics([
        staged(".kb/scenarios/SCEN-a.md", status, doc("SCEN-b")),
      ]).map((d) => d.entityId);
    expect(ids("R")).toStrictEqual(["SCEN-b"]);
    expect(ids("A")).toStrictEqual(["SCEN-b"]);
    expect(ids("M")).toStrictEqual([]);
    expect(ids("D")).toStrictEqual([]);
  });

  test("needs entity Markdown in an entity lane", () => {
    expect(
      createStagedEntityIdStyleDiagnostics([
        staged(".kb/requirements/REQ-001.txt", "A", doc("REQ-001")),
        staged("docs/REQ-001.md", "A", doc("REQ-001")),
      ]),
    ).toStrictEqual([]);
  });

  test("a blank id is not reviewed", () => {
    expect(
      createStagedEntityIdStyleDiagnostics([
        staged(".kb/requirements/REQ-c.md", "A", doc("   ")),
      ]),
    ).toStrictEqual([]);
  });

  test("skips unreadable, blank and clean ids", () => {
    expect(
      createStagedEntityIdStyleDiagnostics([
        staged(".kb/requirements/REQ-a.md", "A", undefined),
        staged(".kb/requirements/REQ-b.md", "A", "---\nid: 7\n---\n"),
        staged(".kb/requirements/REQ-c.md", "A", doc("   ")),
        staged(".kb/requirements/REQ-d.md", "A", doc("REQ-d")),
      ]),
    ).toStrictEqual([]);
  });
});
