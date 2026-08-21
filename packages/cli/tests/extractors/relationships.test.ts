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

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  type ShardExtractionResult,
  extractFromRelationshipShards,
  flattenRelationships,
  getRelationshipsDir,
  validateRelationships,
} from "../../src/extractors/relationships";

describe("extractFromRelationshipShards", () => {
  let tmpDir: string;
  let relationshipsDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-test-"));
    relationshipsDir = path.join(tmpDir, "relationships");
    fs.mkdirSync(relationshipsDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("returns empty array when directory doesn't exist", () => {
    const nonExistentDir = path.join(tmpDir, "nonexistent");
    const results = extractFromRelationshipShards(nonExistentDir);
    expect(results).toEqual([]);
  });

  test("returns empty array when directory is empty", () => {
    const results = extractFromRelationshipShards(relationshipsDir);
    expect(results).toEqual([]);
  });

  test("extracts relationships from single shard file", () => {
    fs.writeFileSync(
      path.join(relationshipsDir, "a1.yaml"),
      `relationships:
  - id: rel-abc123def456
    type: implements
    from: SYM-001
    to: REQ-001
    created_at: "2026-03-15T11:45:00Z"
    created_by: agent/kibi-mcp
    source: mcp://kb_upsert
    confidence: 1.0`,
    );

    const results = extractFromRelationshipShards(relationshipsDir);
    expect(results).toHaveLength(1);
    expect(results[0].shardPath).toEndWith("a1.yaml");
    expect(results[0].relationships).toHaveLength(1);
    expect(results[0].relationships[0]).toEqual({
      type: "implements",
      from: "SYM-001",
      to: "REQ-001",
      metadata: {
        created_at: "2026-03-15T11:45:00Z",
        created_by: "agent/kibi-mcp",
        source: "mcp://kb_upsert",
        confidence: 1.0,
      },
    });
  });

  test("extracts requires_rule relationships from Logic IR shards", () => {
    fs.writeFileSync(
      path.join(relationshipsDir, "logic-rule.yaml"),
      `relationships:
  - id: rel-rule-abc123
    type: requires_rule
    from: REQ-LOGIC-001
    to: FACT-RULE-001
    created_at: "2026-08-21T10:00:00Z"
    created_by: agent/kibi-mcp
    source: mcp://kb_upsert`,
    );

    const results = extractFromRelationshipShards(relationshipsDir);
    expect(results.flatMap((result) => result.relationships)).toContainEqual({
      type: "requires_rule",
      from: "REQ-LOGIC-001",
      to: "FACT-RULE-001",
      metadata: {
        created_at: "2026-08-21T10:00:00Z",
        created_by: "agent/kibi-mcp",
        source: "mcp://kb_upsert",
      },
    });
  });

  test("extracts relationships from multiple shard files", () => {
    fs.writeFileSync(
      path.join(relationshipsDir, "a1.yaml"),
      `relationships:
  - id: rel-abc123def456
    type: implements
    from: SYM-001
    to: REQ-001
    created_at: "2026-03-15T11:45:00Z"
    created_by: agent/kibi-mcp
    source: mcp://kb_upsert`,
    );

    fs.writeFileSync(
      path.join(relationshipsDir, "b2.yaml"),
      `relationships:
  - id: rel-def789abc012
    type: depends_on
    from: REQ-002
    to: REQ-001
    created_at: "2026-03-15T12:00:00Z"
    created_by: agent/kibi-mcp
    source: mcp://kb_upsert`,
    );

    const results = extractFromRelationshipShards(relationshipsDir);
    expect(results).toHaveLength(2);

    const totalRelationships = results.reduce(
      (sum, r) => sum + r.relationships.length,
      0,
    );
    expect(totalRelationships).toBe(2);
  });

  test("ignores non-yaml files", () => {
    fs.writeFileSync(
      path.join(relationshipsDir, "a1.yaml"),
      `relationships:
  - id: rel-abc123def456
    type: implements
    from: SYM-001
    to: REQ-001
    created_at: "2026-03-15T11:45:00Z"
    created_by: agent/kibi-mcp
    source: mcp://kb_upsert`,
    );

    fs.writeFileSync(
      path.join(relationshipsDir, "readme.txt"),
      "This is a readme",
    );
    fs.writeFileSync(
      path.join(relationshipsDir, "data.json"),
      '{"key": "value"}',
    );

    const results = extractFromRelationshipShards(relationshipsDir);
    expect(results).toHaveLength(1);
  });

  test("extracts multiple relationships from single shard", () => {
    fs.writeFileSync(
      path.join(relationshipsDir, "c3.yaml"),
      `relationships:
  - id: rel-abc123def456
    type: implements
    from: SYM-001
    to: REQ-001
    created_at: "2026-03-15T11:45:00Z"
    created_by: agent/kibi-mcp
    source: mcp://kb_upsert
  - id: rel-def789abc012
    type: covered_by
    from: SYM-001
    to: TEST-001
    created_at: "2026-03-15T12:00:00Z"
    created_by: agent/kibi-mcp
    source: mcp://kb_upsert`,
    );

    const results = extractFromRelationshipShards(relationshipsDir);
    expect(results).toHaveLength(1);
    expect(results[0].relationships).toHaveLength(2);
  });

  test("extracts yml shards and skips directories with yaml suffixes", () => {
    fs.mkdirSync(path.join(relationshipsDir, "nested.yaml"));
    fs.writeFileSync(
      path.join(relationshipsDir, "h8.yml"),
      `relationships:
  - id: rel-yml
    type: relates_to
    from: REQ-001
    to: ADR-001
    created_at: "2026-01-01T00:00:00Z"
    created_by: agent/kibi-mcp
    source: mcp://kb_upsert`,
    );

    const results = extractFromRelationshipShards(relationshipsDir);

    expect(results).toHaveLength(1);
    expect(results[0].shardPath).toEndWith("h8.yml");
    expect(results[0].relationships).toEqual([
      {
        type: "relates_to",
        from: "REQ-001",
        to: "ADR-001",
        metadata: {
          created_at: "2026-01-01T00:00:00Z",
          created_by: "agent/kibi-mcp",
          source: "mcp://kb_upsert",
        },
      },
    ]);
  });

  test("extracts partial relationship metadata", () => {
    fs.writeFileSync(
      path.join(relationshipsDir, "partial.yaml"),
      `relationships:
  - id: rel-partial
    type: relates_to
    from: REQ-001
    to: ADR-001
    created_at: "2026-01-01T00:00:00Z"
    created_by: agent/kibi-mcp
    source: mcp://kb_upsert
    confidence: 0.5`,
    );

    const results = extractFromRelationshipShards(relationshipsDir);

    expect(results[0].relationships[0]).toEqual({
      type: "relates_to",
      from: "REQ-001",
      to: "ADR-001",
      metadata: {
        confidence: 0.5,
        created_at: "2026-01-01T00:00:00Z",
        created_by: "agent/kibi-mcp",
        source: "mcp://kb_upsert",
      },
    });
  });

  test("throws on invalid relationship type", () => {
    fs.writeFileSync(
      path.join(relationshipsDir, "d4.yaml"),
      `relationships:
  - id: rel-abc123def456
    type: invalid_type
    from: SYM-001
    to: REQ-001
    created_at: "2026-03-15T11:45:00Z"
    created_by: agent/kibi-mcp
    source: mcp://kb_upsert`,
    );

    expect(() => extractFromRelationshipShards(relationshipsDir)).toThrow(
      /invalid_type/,
    );
  });

  test("throws on empty from field", () => {
    fs.writeFileSync(
      path.join(relationshipsDir, "e5.yaml"),
      `relationships:
  - id: rel-abc123def456
    type: implements
    from: ""
    to: REQ-001
    created_at: "2026-03-15T11:45:00Z"
    created_by: agent/kibi-mcp
    source: mcp://kb_upsert`,
    );

    expect(() => extractFromRelationshipShards(relationshipsDir)).toThrow(
      /Missing or invalid 'from'/,
    );
  });

  test("throws on empty to field", () => {
    fs.writeFileSync(
      path.join(relationshipsDir, "f6.yaml"),
      `relationships:
  - id: rel-abc123def456
    type: implements
    from: SYM-001
    to: ""
    created_at: "2026-03-15T11:45:00Z"
    created_by: agent/kibi-mcp
    source: mcp://kb_upsert`,
    );

    expect(() => extractFromRelationshipShards(relationshipsDir)).toThrow(
      /Missing or invalid 'to'/,
    );
  });

  test("omits metadata when not present", () => {
    fs.writeFileSync(
      path.join(relationshipsDir, "g7.yaml"),
      `relationships:
  - id: rel-abc123def456
    type: implements
    from: SYM-001
    to: REQ-001
    created_at: "2026-03-15T11:45:00Z"
    created_by: agent/kibi-mcp
    source: mcp://kb_upsert`,
    );

    const results = extractFromRelationshipShards(relationshipsDir);
    expect(results[0].relationships[0].metadata).toBeDefined();
    expect(results[0].relationships[0].metadata?.confidence).toBeUndefined();
  });
});

describe("getRelationshipsDir", () => {
  test("returns correct path", () => {
    expect(getRelationshipsDir("/path/to/kb")).toBe(
      "/path/to/kb/relationships",
    );
  });
});

describe("flattenRelationships", () => {
  test("flattens empty array", () => {
    expect(flattenRelationships([])).toEqual([]);
  });

  test("flattens single result", () => {
    const results: ShardExtractionResult[] = [
      {
        shardPath: "/path/to/a1.yaml",
        relationships: [{ type: "implements", from: "SYM-001", to: "REQ-001" }],
      },
    ];

    const flattened = flattenRelationships(results);
    expect(flattened).toHaveLength(1);
    expect(flattened[0].to).toBe("REQ-001");
  });

  test("flattens multiple results", () => {
    const results: ShardExtractionResult[] = [
      {
        shardPath: "/path/to/a1.yaml",
        relationships: [{ type: "implements", from: "SYM-001", to: "REQ-001" }],
      },
      {
        shardPath: "/path/to/b2.yaml",
        relationships: [
          { type: "depends_on", from: "REQ-002", to: "REQ-001" },
          { type: "covered_by", from: "SYM-002", to: "TEST-001" },
        ],
      },
    ];

    const flattened = flattenRelationships(results);
    expect(flattened).toHaveLength(3);
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
