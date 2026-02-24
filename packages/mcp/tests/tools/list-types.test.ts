import { describe, expect, test } from "bun:test";
import {
  handleKbListEntityTypes,
  handleKbListRelationshipTypes,
} from "../../src/tools/list-types.js";

describe("List Types Tools", () => {
  describe("handleKbListEntityTypes", () => {
    test("should return correct structure", async () => {
      const result = await handleKbListEntityTypes();

      expect(result).toHaveProperty("content");
      expect(result).toHaveProperty("structuredContent");
      expect(result.content).toBeArray();
      expect(result.content[0]).toHaveProperty("type", "text");
      expect(result.content[0]).toHaveProperty("text");
      expect(result.structuredContent).toHaveProperty("types");
      expect(result.structuredContent.types).toBeArray();
    });

    test("should return expected entity types", async () => {
      const result = await handleKbListEntityTypes();
      const types = result.structuredContent.types;

      const expectedTypes = [
        "req",
        "scenario",
        "test",
        "adr",
        "flag",
        "event",
        "symbol",
        "fact",
      ];

      expect(types).toEqual(expectedTypes);
    });
  });

  describe("handleKbListRelationshipTypes", () => {
    test("should return correct structure", async () => {
      const result = await handleKbListRelationshipTypes();

      expect(result).toHaveProperty("content");
      expect(result).toHaveProperty("structuredContent");
      expect(result.content).toBeArray();
      expect(result.content[0]).toHaveProperty("type", "text");
      expect(result.content[0]).toHaveProperty("text");
      expect(result.structuredContent).toHaveProperty("types");
      expect(result.structuredContent.types).toBeArray();
    });

    test("should return expected relationship types", async () => {
      const result = await handleKbListRelationshipTypes();
      const types = result.structuredContent.types;

      const expectedTypes = [
        "depends_on",
        "specified_by",
        "verified_by",
        "validates",
        "implements",
        "covered_by",
        "constrained_by",
        "constrains",
        "requires_property",
        "guards",
        "publishes",
        "consumes",
        "supersedes",
        "relates_to",
      ];

      expect(types).toEqual(expectedTypes);
    });
  });
});
