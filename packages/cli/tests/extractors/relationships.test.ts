/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { describe, expect, test } from "bun:test";
import {
  getRelationshipsDir,
  validateRelationships,
} from "../../src/extractors/relationships";

describe("getRelationshipsDir", () => {
  test("returns correct path", () => {
    expect(getRelationshipsDir("/path/to/kb")).toBe(
      "/path/to/kb/relationships",
    );
  });
});

describe("validateRelationships", () => {
  test("returns empty array when all entities valid", () => {
    const relationships = [
      { type: "implements", from: "SYM-001", to: "REQ-001" },
      { type: "depends_on", from: "REQ-002", to: "REQ-001" },
    ];
    const validIds = new Set(["SYM-001", "REQ-001", "REQ-002"]);

    const errors = validateRelationships(relationships, validIds);
    expect(errors).toEqual([]);
  });

  test("detects missing from entity", () => {
    const relationships = [
      { type: "implements", from: "SYM-001", to: "REQ-001" },
    ];
    const validIds = new Set(["REQ-001"]);

    const errors = validateRelationships(relationships, validIds);
    expect(errors).toHaveLength(1);
    expect(errors[0].error).toBe("missing_from");
    expect(errors[0].relationship.from).toBe("SYM-001");
  });

  test("detects missing to entity", () => {
    const relationships = [
      { type: "implements", from: "SYM-001", to: "REQ-001" },
    ];
    const validIds = new Set(["SYM-001"]);

    const errors = validateRelationships(relationships, validIds);
    expect(errors).toHaveLength(1);
    expect(errors[0].error).toBe("missing_to");
    expect(errors[0].relationship.to).toBe("REQ-001");
  });

  test("detects both missing entities", () => {
    const relationships = [
      { type: "implements", from: "SYM-001", to: "REQ-001" },
    ];
    const validIds = new Set(["OTHER"]);

    const errors = validateRelationships(relationships, validIds);
    expect(errors).toHaveLength(2);
  });

  test("handles empty relationships array", () => {
    const validIds = new Set(["SYM-001"]);
    expect(validateRelationships([], validIds)).toEqual([]);
  });
});
