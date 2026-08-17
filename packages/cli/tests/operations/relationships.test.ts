import { describe, expect, test } from "bun:test";

import {
  RELATIONSHIP_TYPES,
  type RelationshipType,
} from "../../src/operations/mutation/relationships.js";

describe("relationship type contract", () => {
  test("exports the complete typed relationship vocabulary", () => {
    const relationshipTypes =
      RELATIONSHIP_TYPES satisfies readonly RelationshipType[];

    expect(relationshipTypes).toEqual([
      "depends_on",
      "specified_by",
      "verified_by",
      "validates",
      "implements",
      "covered_by",
      "executable_for",
      "constrained_by",
      "constrains",
      "requires_property",
      "requires_predicate",
      "requires_rule",
      "guards",
      "publishes",
      "consumes",
      "supersedes",
      "relates_to",
    ]);
  });
});
