import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { WordPieceTokenizer } from "./tokenizer.js";

/** Upstream model and the revision the bundled asset was built from. */
export const MODEL_ID = "minishlab/potion-base-8M";
export const MODEL_REVISION = "bf8b056651a2c21b8d2565580b8569da283cab23";
/** The model a provider stamp discloses. */
export const MODEL_LABEL = `${MODEL_ID}@${MODEL_REVISION.slice(0, 12)}/int8`;
/** model2vec truncates each text to this many tokens. */
const MAX_TOKENS = 512;

// implements REQ-kibi-plugin-search-hints
export type StaticModel = Readonly<{
  /** Model id plus the asset hash, so a changed table never reuses vectors. */
  id: string;
  dims: number;
  encode(text: string): Float32Array;
}>;

function assetPath(name: string): string {
  return fileURLToPath(new URL(`../assets/${name}`, import.meta.url));
}

/**
 * A static embedding: the mean of the int8 table rows of a text's tokens,
 * L2-normalised. Sums run in double precision in token order, so a text has
 * the same vector on every platform and in every batch.
 */
// implements REQ-kibi-plugin-search-hints
export function loadStaticModel(): StaticModel {
  const table = readFileSync(assetPath("potion-base-8M.int8.bin"));
  if (table.toString("ascii", 0, 4) !== "KSHM" || table.readUInt32LE(4) !== 1)
    throw new Error("search hints model asset has an unknown format");
  const rows = table.readUInt32LE(8);
  const dims = table.readUInt32LE(12);
  const scales = new Float32Array(rows);
  for (let row = 0; row < rows; row++)
    scales[row] = table.readFloatLE(16 + row * 4);
  const weights = new Int8Array(
    table.buffer,
    table.byteOffset + 16 + rows * 4,
    rows * dims,
  );
  const vocabulary = readFileSync(assetPath("vocab.txt"), "utf8")
    .split("\n")
    .slice(0, rows);
  const tokenizer = new WordPieceTokenizer(vocabulary);
  const id = `${MODEL_LABEL}-${createHash("sha256")
    .update(table)
    .digest("hex")
    .slice(0, 12)}`;
  return {
    id,
    dims,
    encode(text: string): Float32Array {
      const ids = tokenizer
        .encode(text)
        .filter((token) => token !== tokenizer.unkId)
        .slice(0, MAX_TOKENS);
      const sum = new Float64Array(dims);
      for (const token of ids) {
        const scale = scales[token] ?? 0;
        const offset = token * dims;
        for (let col = 0; col < dims; col++)
          sum[col] = (sum[col] ?? 0) + (weights[offset + col] ?? 0) * scale;
      }
      let norm = 0;
      for (let col = 0; col < dims; col++) norm += (sum[col] ?? 0) ** 2;
      norm = Math.sqrt(norm);
      const vector = new Float32Array(dims);
      if (norm === 0) return vector;
      for (let col = 0; col < dims; col++) vector[col] = (sum[col] ?? 0) / norm;
      return vector;
    },
  };
}
