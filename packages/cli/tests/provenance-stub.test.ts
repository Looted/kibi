import { describe, expect, test } from "bun:test";
import {
  PROVENANCE_STUB_TAG,
  isProvenanceStub,
} from "../src/provenance-stub.js";

describe("isProvenanceStub", () => {
  test("names the tag exactly", () => {
    expect(PROVENANCE_STUB_TAG).toBe("bootstrap:provenance-stub");
  });

  test("accepts facts and untyped rows carrying the tag", () => {
    expect(
      isProvenanceStub({ type: "fact", tags: [PROVENANCE_STUB_TAG] }),
    ).toBe(true);
    expect(isProvenanceStub({ tags: [PROVENANCE_STUB_TAG] })).toBe(true);
    expect(isProvenanceStub({ type: "", tags: PROVENANCE_STUB_TAG })).toBe(
      true,
    );
    expect(
      isProvenanceStub({
        type: "fact",
        tags: [1, "other", PROVENANCE_STUB_TAG],
      }),
    ).toBe(true);
  });

  test("rejects other types, missing tags and non-string tags", () => {
    expect(isProvenanceStub({ type: "req", tags: [PROVENANCE_STUB_TAG] })).toBe(
      false,
    );
    expect(isProvenanceStub({ type: "fact" })).toBe(false);
    expect(isProvenanceStub({ type: "fact", tags: ["other"] })).toBe(false);
    expect(isProvenanceStub({ type: "fact", tags: "other" })).toBe(false);
    expect(isProvenanceStub({ type: "fact", tags: 5 })).toBe(false);
    expect(
      isProvenanceStub({
        type: "fact",
        tags: { 0: PROVENANCE_STUB_TAG, length: 1 },
      }),
    ).toBe(false);
    expect(isProvenanceStub(null)).toBe(false);
    expect(isProvenanceStub(undefined)).toBe(false);
  });
});
