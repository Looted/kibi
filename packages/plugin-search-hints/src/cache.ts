import { readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { SearchHintsEntity } from "kibi-plugin-sdk";

const MAGIC = "KSHC";
const FORMAT_VERSION = 1;
const FILE_NAME = "vectors.bin";

type CachedVector = { hash: string; vector: Float32Array };

type Header = {
  model: string;
  dims: number;
  /** [type::id, host hash] per vector, in file order. */
  entries: [string, string][];
};

/**
 * The vectors a cache file holds for `model`. A missing, foreign or damaged
 * file gives none: every vector is then rebuilt, and nothing stale is ever
 * returned.
 */
export function readVectorFile(
  file: string,
  model: string,
  dims: number,
): Map<string, CachedVector> {
  const vectors = new Map<string, CachedVector>();
  try {
    const bytes = readFileSync(file);
    if (
      bytes.toString("ascii", 0, 4) !== MAGIC ||
      bytes.readUInt32LE(4) !== FORMAT_VERSION
    )
      return vectors;
    const headerLength = bytes.readUInt32LE(8);
    const header = JSON.parse(
      bytes.toString("utf8", 12, 12 + headerLength),
    ) as Header;
    // A file of other dimensions fails the length check below.
    if (header.model !== model) return vectors;
    const start = 12 + headerLength;
    const width = dims * 4;
    if (bytes.length !== start + header.entries.length * width) return vectors;
    // A DataView reads little-endian floats at any offset without a
    // per-value call into Buffer, which dominates a warm search otherwise.
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
    header.entries.forEach(([key, hash], index) => {
      const offset = start + index * width;
      const vector = new Float32Array(dims);
      for (let col = 0; col < dims; col += 1)
        vector[col] = view.getFloat32(offset + col * 4, true);
      vectors.set(key, { hash, vector });
    });
  } catch {}
  return vectors;
}

/**
 * Entity vectors keyed by type::id and the host content hash. A changed
 * entity, a different model or a damaged file means that vector (or the
 * whole file) is rebuilt; nothing stale is ever returned.
 */
export class VectorCache {
  private readonly vectors = new Map<string, CachedVector>();
  private dirty = false;

  private constructor(
    private readonly file: string,
    private readonly model: string,
    private readonly dims: number,
  ) {}

  static open(directory: string, model: string, dims: number): VectorCache {
    const cache = new VectorCache(path.join(directory, FILE_NAME), model, dims);
    for (const [key, cached] of readVectorFile(cache.file, model, dims))
      cache.vectors.set(key, cached);
    return cache;
  }

  /** The vector of each entity, computing only the ones not cached. */
  vectorsFor(
    entities: readonly SearchHintsEntity[],
    encode: (text: string) => Float32Array,
  ): Float32Array[] {
    return entities.map((entity) => {
      const key = `${entity.type}::${entity.id}`;
      const cached = this.vectors.get(key);
      if (cached !== undefined && cached.hash === entity.hash)
        return cached.vector;
      const vector = encode(entity.text);
      this.vectors.set(key, { hash: entity.hash, vector });
      this.dirty = true;
      return vector;
    });
  }

  /** Keep only the given entities, so deleted ones do not grow the file. */
  retain(entities: readonly SearchHintsEntity[]): void {
    const keep = new Set(entities.map(cacheKey));
    for (const key of this.vectors.keys())
      if (!keep.has(key)) {
        this.vectors.delete(key);
        this.dirty = true;
      }
  }

  /** Cached entity keys in file order; for inspection and tests. */
  keys(): string[] {
    return [...this.vectors.keys()].sort();
  }

  /** Write atomically: a reader sees the old file or the new one. */
  save(): void {
    if (!this.dirty) return;
    const entries = this.keys().map(
      (key) => [key, this.vectors.get(key) as CachedVector] as const,
    );
    const header = Buffer.from(
      JSON.stringify({
        model: this.model,
        dims: this.dims,
        entries: entries.map(([key, { hash }]) => [key, hash]),
      } satisfies Header),
      "utf8",
    );
    const width = this.dims * 4;
    const out = Buffer.alloc(12 + header.length + entries.length * width);
    out.write(MAGIC, 0);
    out.writeUInt32LE(FORMAT_VERSION, 4);
    out.writeUInt32LE(header.length, 8);
    header.copy(out, 12);
    const view = new DataView(out.buffer, out.byteOffset, out.length);
    entries.forEach(([, { vector }], index) => {
      const offset = 12 + header.length + index * width;
      for (let col = 0; col < vector.length; col += 1)
        view.setFloat32(offset + col * 4, vector[col] as number, true);
    });
    const temporary = `${this.file}.${process.pid}.tmp`;
    try {
      writeFileSync(temporary, out, { mode: 0o600 });
      renameSync(temporary, this.file);
      this.dirty = false;
    } catch {
      // An unwritable cache only costs a rebuild next time.
    }
  }
}

function cacheKey(entity: SearchHintsEntity): string {
  return `${entity.type}::${entity.id}`;
}
