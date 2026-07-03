import { describe, expect, test } from "bun:test";
import { formatInvalidRelationshipError } from "../../src/tools/relationship-validation.js";

describe("relationship validation helpers", () => {
  test("formats raw Prolog invalid relationship placeholders as actionable guidance", () => {
    const message = formatInvalidRelationshipError(
      "Invalid relationship: ~w from ~w to ~w-[verified_by,fact,test]",
    );

    expect(message).toContain("Invalid relationship: verified_by from fact to test");
    expect(message).toContain("Facts are not directly verified by tests");
    expect(message).toContain(
      "Create or update a requirement and link REQ -> TEST with verified_by",
    );
    expect(message).not.toContain("~w");
  });
});
