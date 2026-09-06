// implements REQ-005
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  appendRelationship,
  removeRelationshipsFromShards,
  writeShard,
} from "../../src/relationships/shards.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const spies: Array<{ mockRestore: () => void }> = [];
const restores: Array<() => void> = [];
const roots: string[] = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const restore of restores.splice(0)) restore();
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
  if (process.exitCode === 1) process.exitCode = 0;
});

function tempRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-shards-remain-"));
  roots.push(root);
  return root;
}

const base = {
  type: "implements",
  from: "SYM-001",
  to: "REQ-001",
  created_at: "2026-03-15T11:45:00Z",
  created_by: "agent/test",
  source: "mcp://kb_upsert",
} as const;

describe("relationship shards remaining atomic write and parse failures", () => {
  test("atomicWriteText unlinks the temp file when rename fails", () => {
    restores.push(isolateKibiEnv());
    const kb = tempRoot();
    const created = appendRelationship(kb, { ...base });
    const rename = spyOn(fs, "renameSync").mockImplementation(() => {
      throw new Error("rename denied");
    });
    spies.push(rename);
    expect(() =>
      writeShard(created.shardPath, [{ ...base, id: "rel-keep" }]),
    ).toThrow("rename denied");
    const leftovers = fs
      .readdirSync(path.dirname(created.shardPath))
      .filter((name) => name.includes(".kibi-write-"));
    expect(leftovers).toEqual([]);
  });

  test("atomicWriteText preserves the original error when unlink also fails", () => {
    restores.push(isolateKibiEnv());
    const kb = tempRoot();
    const created = appendRelationship(kb, { ...base, to: "REQ-002" });
    const rename = spyOn(fs, "renameSync").mockImplementation(() => {
      throw new Error("rename denied");
    });
    const unlink = spyOn(fs, "unlinkSync").mockImplementation(() => {
      throw new Error("unlink denied");
    });
    spies.push(rename, unlink);
    expect(() =>
      writeShard(created.shardPath, [{ ...base, id: "rel-keep", to: "REQ-002" }]),
    ).toThrow("rename denied");
  });

  test("removeRelationshipsFromShards rejects a matching shard whose YAML sequence is missing", () => {
    restores.push(isolateKibiEnv());
    const kb = tempRoot();
    const created = appendRelationship(kb, { ...base, to: "REQ-003" });
    const originalRead = fs.readFileSync.bind(fs);
    let reads = 0;
    const read = spyOn(fs, "readFileSync").mockImplementation(
      ((target, encoding) => {
        if (String(target) === created.shardPath) {
          reads += 1;
          if (reads === 1) {
            return originalRead(target, encoding as BufferEncoding);
          }
          return "notes: true\n";
        }
        return originalRead(target, encoding as BufferEncoding);
      }) as typeof fs.readFileSync,
    );
    spies.push(read);
    expect(() =>
      removeRelationshipsFromShards(kb, [
        { type: "implements", from: "SYM-001", to: "REQ-003" },
      ]),
    ).toThrow(/missing 'relationships' array/);
  });

  test("appendRelationship rejects a shard missing the relationships sequence", () => {
    restores.push(isolateKibiEnv());
    const kb = tempRoot();
    const created = appendRelationship(kb, { ...base, to: "REQ-004" });
    fs.writeFileSync(created.shardPath, "notes: true\n");
    expect(() =>
      appendRelationship(kb, { ...base, to: "REQ-005" }),
    ).toThrow(/missing 'relationships' array/);
  });
});
