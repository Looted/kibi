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
  type RelationshipRecord,
  mergeRecords,
  pruneDangling,
  readShard,
  relationshipIdFor,
  shardForFromId,
  writeShard,
} from "../../src/relationships/shards";

describe("relationshipIdFor", () => {
  test("generates stable IDs", () => {
    const id1 = relationshipIdFor("implements", "SYM-001", "REQ-001");
    const id2 = relationshipIdFor("implements", "SYM-001", "REQ-001");
    expect(id1).toBe(id2);
    expect(id1).toStartWith("rel-");
    expect(id1.length).toBe(16); // "rel-" + 12 chars
  });

  test("generates different IDs for different inputs", () => {
    const id1 = relationshipIdFor("implements", "SYM-001", "REQ-001");
    const id2 = relationshipIdFor("implements", "SYM-001", "REQ-002");
    const id3 = relationshipIdFor("depends_on", "SYM-001", "REQ-001");
    const id4 = relationshipIdFor("implements", "SYM-002", "REQ-001");

    expect(id1).not.toBe(id2);
    expect(id1).not.toBe(id3);
    expect(id1).not.toBe(id4);
  });

  test("uses lowercase hex", () => {
    const id = relationshipIdFor("implements", "SYM-001", "REQ-001");
    expect(id).toMatch(/^rel-[a-f0-9]{12}$/);
  });
});

describe("shardForFromId", () => {
  test("returns first 2 hex chars", () => {
    const shard = shardForFromId("REQ-001");
    expect(shard.length).toBe(2);
    expect(shard).toMatch(/^[a-f0-9]{2}$/);
  });

  test("is deterministic", () => {
    const shard1 = shardForFromId("REQ-001");
    const shard2 = shardForFromId("REQ-001");
    expect(shard1).toBe(shard2);
  });

  test("different IDs go to different shards", () => {
    // These might occasionally collide, but it's very unlikely
    const shards = new Set<string>();
    for (let i = 0; i < 100; i++) {
      shards.add(shardForFromId(`REQ-${i.toString().padStart(3, "0")}`));
    }
    // Should have many different shards
    expect(shards.size).toBeGreaterThan(50);
  });
});

describe("readShard", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("returns empty array for non-existent file", () => {
    const result = readShard(path.join(tmpDir, "nonexistent.yaml"));
    expect(result).toEqual([]);
  });

  test("returns empty array for empty file", () => {
    const shardPath = path.join(tmpDir, "empty.yaml");
    fs.writeFileSync(shardPath, "", "utf8");
    const result = readShard(shardPath);
    expect(result).toEqual([]);
  });

  test("parses valid shard file", () => {
    const shardPath = path.join(tmpDir, "a1.yaml");
    fs.writeFileSync(
      shardPath,
      `relationships:
  - id: rel-abc123def456
    type: implements
    from: SYM-001
    to: REQ-001
    created_at: 2026-03-15T11:45:00Z
    created_by: agent/kibi-mcp
    source: mcp://kb_upsert
    confidence: 1.0`,
      "utf8",
    );

    const result = readShard(shardPath);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "rel-abc123def456",
      type: "implements",
      from: "SYM-001",
      to: "REQ-001",
      created_at: "2026-03-15T11:45:00Z",
      created_by: "agent/kibi-mcp",
      source: "mcp://kb_upsert",
      confidence: 1.0,
    });
  });

  test("parses multiple records", () => {
    const shardPath = path.join(tmpDir, "b2.yaml");
    fs.writeFileSync(
      shardPath,
      `relationships:
  - id: rel-abc123def456
    type: implements
    from: SYM-001
    to: REQ-001
    created_at: 2026-03-15T11:45:00Z
    created_by: agent/kibi-mcp
    source: mcp://kb_upsert
  - id: rel-xyz789uvw012
    type: depends_on
    from: SYM-002
    to: REQ-002
    created_at: 2026-03-15T12:00:00Z
    created_by: agent/kibi-mcp
    source: mcp://kb_upsert`,
      "utf8",
    );

    const result = readShard(shardPath);
    expect(result).toHaveLength(2);
  });

  test("handles optional confidence field", () => {
    const shardPath = path.join(tmpDir, "c3.yaml");
    fs.writeFileSync(
      shardPath,
      `relationships:
  - id: rel-abc123def456
    type: implements
    from: SYM-001
    to: REQ-001
    created_at: 2026-03-15T11:45:00Z
    created_by: agent/kibi-mcp
    source: mcp://kb_upsert`,
      "utf8",
    );

    const result = readShard(shardPath);
    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBeUndefined();
  });

  test("throws on invalid YAML", () => {
    const shardPath = path.join(tmpDir, "invalid.yaml");
    fs.writeFileSync(shardPath, "not: valid: yaml: [", "utf8");
    expect(() => readShard(shardPath)).toThrow();
  });

  test("throws on missing required fields", () => {
    const shardPath = path.join(tmpDir, "bad.yaml");
    fs.writeFileSync(
      shardPath,
      `relationships:
  - id: rel-abc123def456
    type: implements`,
      "utf8",
    );
    expect(() => readShard(shardPath)).toThrow(/from/);
  });

  test("throws on wrong confidence type", () => {
    const shardPath = path.join(tmpDir, "bad2.yaml");
    fs.writeFileSync(
      shardPath,
      `relationships:
  - id: rel-abc123def456
    type: implements
    from: SYM-001
    to: REQ-001
    created_at: 2026-03-15T11:45:00Z
    created_by: agent/kibi-mcp
    source: mcp://kb_upsert
    confidence: "high"`,
      "utf8",
    );
    expect(() => readShard(shardPath)).toThrow(/confidence/);
  });
});

describe("writeShard", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("writes records to file", () => {
    const shardPath = path.join(tmpDir, "d4.yaml");
    const records: RelationshipRecord[] = [
      {
        id: "rel-abc123def456",
        type: "implements",
        from: "SYM-001",
        to: "REQ-001",
        created_at: "2026-03-15T11:45:00Z",
        created_by: "agent/kibi-mcp",
        source: "mcp://kb_upsert",
        confidence: 1.0,
      },
    ];

    writeShard(shardPath, records);

    expect(fs.existsSync(shardPath)).toBe(true);
    const content = fs.readFileSync(shardPath, "utf8");
    expect(content).toContain("relationships:");
    expect(content).toContain("rel-abc123def456");
  });

  test("creates parent directories", () => {
    const shardPath = path.join(tmpDir, "nested", "deep", "e5.yaml");
    const records: RelationshipRecord[] = [];

    writeShard(shardPath, records);

    expect(fs.existsSync(shardPath)).toBe(true);
  });

  test("sorts records deterministically", () => {
    const shardPath = path.join(tmpDir, "f6.yaml");
    const records: RelationshipRecord[] = [
      {
        id: "rel-z",
        type: "depends_on",
        from: "REQ-002",
        to: "REQ-001",
        created_at: "2026-03-15T11:45:00Z",
        created_by: "agent",
        source: "test",
      },
      {
        id: "rel-a",
        type: "implements",
        from: "REQ-001",
        to: "REQ-002",
        created_at: "2026-03-15T11:45:00Z",
        created_by: "agent",
        source: "test",
      },
    ];

    writeShard(shardPath, records);

    // Read back and verify order
    const result = readShard(shardPath);
    expect(result).toHaveLength(2);
    expect(result[0].from).toBe("REQ-001");
    expect(result[1].from).toBe("REQ-002");
  });

  test("round-trip preserves data", () => {
    const shardPath = path.join(tmpDir, "g7.yaml");
    const records: RelationshipRecord[] = [
      {
        id: "rel-abc123def456",
        type: "implements",
        from: "SYM-001",
        to: "REQ-001",
        created_at: "2026-03-15T11:45:00Z",
        created_by: "agent/kibi-mcp",
        source: "mcp://kb_upsert",
        confidence: 0.95,
      },
    ];

    writeShard(shardPath, records);
    const result = readShard(shardPath);

    expect(result).toEqual(records);
  });
});

describe("mergeRecords", () => {
  test("combines disjoint records", () => {
    const existing: RelationshipRecord[] = [
      {
        id: "rel-a",
        type: "implements",
        from: "SYM-001",
        to: "REQ-001",
        created_at: "2026-03-15T10:00:00Z",
        created_by: "agent",
        source: "test",
      },
    ];
    const incoming: RelationshipRecord[] = [
      {
        id: "rel-b",
        type: "implements",
        from: "SYM-002",
        to: "REQ-002",
        created_at: "2026-03-15T11:00:00Z",
        created_by: "agent",
        source: "test",
      },
    ];

    const result = mergeRecords(existing, incoming);
    expect(result).toHaveLength(2);
  });

  test("deduplicates by type/from/to tuple", () => {
    const existing: RelationshipRecord[] = [
      {
        id: "rel-a",
        type: "implements",
        from: "SYM-001",
        to: "REQ-001",
        created_at: "2026-03-15T10:00:00Z",
        created_by: "agent",
        source: "test",
      },
    ];
    const incoming: RelationshipRecord[] = [
      {
        id: "rel-b",
        type: "implements",
        from: "SYM-001",
        to: "REQ-001",
        created_at: "2026-03-15T11:00:00Z",
        created_by: "agent",
        source: "test",
      },
    ];

    const result = mergeRecords(existing, incoming);
    expect(result).toHaveLength(1);
  });

  test("keeps newer record on conflict", () => {
    const existing: RelationshipRecord[] = [
      {
        id: "rel-old",
        type: "implements",
        from: "SYM-001",
        to: "REQ-001",
        created_at: "2026-03-15T10:00:00Z",
        created_by: "agent-old",
        source: "test-old",
      },
    ];
    const incoming: RelationshipRecord[] = [
      {
        id: "rel-new",
        type: "implements",
        from: "SYM-001",
        to: "REQ-001",
        created_at: "2026-03-15T11:00:00Z",
        created_by: "agent-new",
        source: "test-new",
      },
    ];

    const result = mergeRecords(existing, incoming);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("rel-new");
    expect(result[0].created_by).toBe("agent-new");
  });

  test("keeps existing if newer than incoming", () => {
    const existing: RelationshipRecord[] = [
      {
        id: "rel-new",
        type: "implements",
        from: "SYM-001",
        to: "REQ-001",
        created_at: "2026-03-15T11:00:00Z",
        created_by: "agent-new",
        source: "test-new",
      },
    ];
    const incoming: RelationshipRecord[] = [
      {
        id: "rel-old",
        type: "implements",
        from: "SYM-001",
        to: "REQ-001",
        created_at: "2026-03-15T10:00:00Z",
        created_by: "agent-old",
        source: "test-old",
      },
    ];

    const result = mergeRecords(existing, incoming);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("rel-new");
  });

  test("handles empty arrays", () => {
    const record: RelationshipRecord = {
      id: "rel-a",
      type: "implements",
      from: "SYM-001",
      to: "REQ-001",
      created_at: "2026-03-15T10:00:00Z",
      created_by: "agent",
      source: "test",
    };

    expect(mergeRecords([], [])).toEqual([]);
    expect(mergeRecords([record], [])).toEqual([record]);
    expect(mergeRecords([], [record])).toEqual([record]);
  });
});

describe("pruneDangling", () => {
  test("keeps valid relationships", () => {
    const records: RelationshipRecord[] = [
      {
        id: "rel-a",
        type: "implements",
        from: "SYM-001",
        to: "REQ-001",
        created_at: "2026-03-15T10:00:00Z",
        created_by: "agent",
        source: "test",
      },
    ];
    const validIds = new Set(["SYM-001", "REQ-001"]);

    const result = pruneDangling(records, validIds);
    expect(result).toHaveLength(1);
  });

  test("removes records with invalid from", () => {
    const records: RelationshipRecord[] = [
      {
        id: "rel-a",
        type: "implements",
        from: "SYM-999",
        to: "REQ-001",
        created_at: "2026-03-15T10:00:00Z",
        created_by: "agent",
        source: "test",
      },
    ];
    const validIds = new Set(["REQ-001"]);

    const result = pruneDangling(records, validIds);
    expect(result).toHaveLength(0);
  });

  test("removes records with invalid to", () => {
    const records: RelationshipRecord[] = [
      {
        id: "rel-a",
        type: "implements",
        from: "SYM-001",
        to: "REQ-999",
        created_at: "2026-03-15T10:00:00Z",
        created_by: "agent",
        source: "test",
      },
    ];
    const validIds = new Set(["SYM-001"]);

    const result = pruneDangling(records, validIds);
    expect(result).toHaveLength(0);
  });

  test("removes records with both invalid", () => {
    const records: RelationshipRecord[] = [
      {
        id: "rel-a",
        type: "implements",
        from: "SYM-999",
        to: "REQ-999",
        created_at: "2026-03-15T10:00:00Z",
        created_by: "agent",
        source: "test",
      },
    ];
    const validIds = new Set(["OTHER"]);

    const result = pruneDangling(records, validIds);
    expect(result).toHaveLength(0);
  });

  test("handles mixed valid and invalid", () => {
    const records: RelationshipRecord[] = [
      {
        id: "rel-valid",
        type: "implements",
        from: "SYM-001",
        to: "REQ-001",
        created_at: "2026-03-15T10:00:00Z",
        created_by: "agent",
        source: "test",
      },
      {
        id: "rel-invalid",
        type: "implements",
        from: "SYM-999",
        to: "REQ-001",
        created_at: "2026-03-15T10:00:00Z",
        created_by: "agent",
        source: "test",
      },
    ];
    const validIds = new Set(["SYM-001", "REQ-001"]);

    const result = pruneDangling(records, validIds);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("rel-valid");
  });

  test("handles empty arrays", () => {
    const validIds = new Set(["SYM-001"]);
    expect(pruneDangling([], validIds)).toEqual([]);
  });
});

describe("integration", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("end-to-end shard workflow", () => {
    // Create some relationship records
    const records: RelationshipRecord[] = [
      {
        id: relationshipIdFor("implements", "SYM-001", "REQ-001"),
        type: "implements",
        from: "SYM-001",
        to: "REQ-001",
        created_at: "2026-03-15T10:00:00Z",
        created_by: "agent/kibi-mcp",
        source: "mcp://kb_upsert",
        confidence: 1.0,
      },
      {
        id: relationshipIdFor("depends_on", "REQ-002", "REQ-001"),
        type: "depends_on",
        from: "REQ-002",
        to: "REQ-001",
        created_at: "2026-03-15T11:00:00Z",
        created_by: "agent/kibi-mcp",
        source: "mcp://kb_upsert",
      },
    ];

    // Determine shard paths
    const shard1 = path.join(tmpDir, `${shardForFromId("SYM-001")}.yaml`);
    const shard2 = path.join(tmpDir, `${shardForFromId("REQ-002")}.yaml`);

    // Write to different shards
    writeShard(shard1, [records[0]]);
    writeShard(shard2, [records[1]]);

    // Read back
    const read1 = readShard(shard1);
    const read2 = readShard(shard2);

    expect(read1).toHaveLength(1);
    expect(read2).toHaveLength(1);
    expect(read1[0].from).toBe("SYM-001");
    expect(read2[0].from).toBe("REQ-002");

    // Merge new records
    const newRecord: RelationshipRecord = {
      id: relationshipIdFor("implements", "SYM-001", "REQ-002"),
      type: "implements",
      from: "SYM-001",
      to: "REQ-002",
      created_at: "2026-03-15T12:00:00Z",
      created_by: "agent/kibi-mcp",
      source: "mcp://kb_upsert",
    };

    const merged = mergeRecords(read1, [newRecord]);
    expect(merged).toHaveLength(2);

    // Prune with valid entities
    const validIds = new Set(["SYM-001", "REQ-001", "REQ-002"]);
    const pruned = pruneDangling(merged, validIds);
    expect(pruned).toHaveLength(2);

    // Prune with missing entity
    const incompleteIds = new Set(["SYM-001", "REQ-001"]);
    const pruned2 = pruneDangling(merged, incompleteIds);
    expect(pruned2).toHaveLength(1);
  });
});
