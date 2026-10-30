import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
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

const ASSETS_DIRECTORY = fileURLToPath(new URL("../assets/", import.meta.url));

/**
 * A static embedding: the mean of the int8 table rows of a text's tokens,
 * L2-normalised. Sums run in double precision in token order, so a text has
 * the same vector on every platform and in every batch.
 */
// implements REQ-kibi-plugin-search-hints
export function loadStaticModel(
  assetsDirectory = ASSETS_DIRECTORY,
): StaticModel {
  const table = readFileSync(
    path.join(assetsDirectory, "potion-base-8M.int8.bin"),
  );
  if (table.toString("ascii", 0, 4) !== "KSHM" || table.readUInt32LE(4) !== 1)
    throw new Error("search hints model asset has an unknown format");
  const rows = table.readUInt32LE(8);
  const dims = table.readUInt32LE(12);
  const scales = Float64Array.from({ length: rows }, (_, row) =>
    table.readFloatLE(16 + row * 4),
  );
  const weights = new Int8Array(
    table.buffer,
    table.byteOffset + 16 + rows * 4,
    rows * dims,
  );
  const vocabulary = readFileSync(
    path.join(assetsDirectory, "vocab.txt"),
    "utf8",
  )
    .trimEnd()
    .split("\n");
  if (vocabulary.length !== rows)
    throw new Error(
      `search hints vocabulary has ${vocabulary.length} tokens for ${rows} table rows`,
    );
  const tokenizer = new WordPieceTokenizer(vocabulary);
  const digest = createHash("sha256").update(table).digest("hex");
  return {
    id: `${MODEL_LABEL}-${digest.slice(0, 12)}`,
    dims,
    encode(text: string): Float32Array {
      const ids = tokenizer
        .encode(text)
        .filter((token) => token !== tokenizer.unkId)
        .slice(0, MAX_TOKENS);
      const sum = new Float64Array(dims);
      for (const token of ids) {
        const scale = scales[token] as number;
        weights
          .subarray(token * dims, (token + 1) * dims)
          .forEach((weight, col) => {
            sum[col] = (sum[col] as number) + weight * scale;
          });
      }
      const norm = Math.sqrt(
        sum.reduce((total, value) => total + value * value, 0),
      );
      return Float32Array.from(sum, (value) => (norm === 0 ? 0 : value / norm));
    },
  };
}
