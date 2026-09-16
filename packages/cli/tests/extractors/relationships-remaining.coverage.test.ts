// implements REQ-014
import { afterEach, describe, expect, test } from "bun:test";
import { convertRecordToRelationship } from "../../src/extractors/relationships.js";

afterEach(() => {
  process.exitCode = 0;
});

describe("relationship extractor leftover from/to validation", () => {
  test("rejects a valid type with an empty endpoint", () => {
    expect(() =>
      convertRecordToRelationship({
        id: "REL-1",
        type: "implements",
        from: "SYM-1",
        to: "",
      } as never),
    ).toThrow(/Missing from or to/);
    expect(
      convertRecordToRelationship({
        id: "REL-2",
        type: "implements",
        from: "SYM-1",
        to: "REQ-1",
      } as never),
    ).toMatchObject({ type: "implements", from: "SYM-1", to: "REQ-1" });
  });
});
