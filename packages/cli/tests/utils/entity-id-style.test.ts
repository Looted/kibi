import { describe, expect, test } from "bun:test";
import {
  entityIdStyleIssues,
  entityIdStyleWarnings,
  isNumericEntityId,
  markdownSourceStem,
} from "../../src/utils/entity-id-style.js";

describe("entity-id-style helpers", () => {
  test("a numeric ID is the whole trimmed value", () => {
    expect(isNumericEntityId(" REQ-001 ")).toBe(true);
    expect(isNumericEntityId("xREQ-001")).toBe(false);
    expect(isNumericEntityId("REQ-001a")).toBe(false);
  });

  test("the stem is read from a trimmed path with either separator", () => {
    expect(markdownSourceStem(" docs\\reqs\\REQ-a.md ")).toBe("REQ-a");
    expect(markdownSourceStem("mcp://kb/REQ-a.md")).toBeUndefined();
    expect(markdownSourceStem(undefined)).toBeUndefined();
    expect(markdownSourceStem("src/REQ-a.ts")).toBeUndefined();
  });

  test("issues compare the trimmed ID with the stem", () => {
    expect(
      entityIdStyleIssues({ id: " REQ-a ", sourcePath: "REQ-a.md" }),
    ).toStrictEqual([]);
    expect(
      entityIdStyleIssues({ id: "REQ-a", sourcePath: "REQ-b.md" }).map(
        (issue) => issue.code,
      ),
    ).toStrictEqual(["stem_mismatch"]);
    expect(
      entityIdStyleWarnings({ id: " REQ-a ", sourcePath: "docs/REQ-b.md" }),
    ).toStrictEqual([
      "entity-id-style: Entity ID REQ-a does not match its filename stem REQ-b. Rename the file to REQ-a.md or set frontmatter id: REQ-b so the file name and identity stay aligned.",
    ]);
  });

  test("a numeric ID gets the sequence-number issue", () => {
    expect(entityIdStyleIssues({ id: "REQ-7" })).toStrictEqual([
      {
        code: "numeric_id",
        message:
          "Entity ID REQ-7 is a sequence number; parallel branches pick the same next number and collide.",
        suggestion:
          "Name the entity by what it governs: <TYPE>-<area>-<behavior> in kebab-case (for example REQ-cli-gc). kb_search the area first and update or supersede an existing entity when one already covers the behavior.",
      },
    ]);
    expect(
      entityIdStyleIssues({ id: "REQ-7", sourcePath: "REQ-7.md" }),
    ).toHaveLength(1);
  });
});
