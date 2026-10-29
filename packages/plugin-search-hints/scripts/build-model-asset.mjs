// Dev-only: rebuild the bundled model asset from the pinned upstream files.
// Usage: node scripts/build-model-asset.mjs [<dir with model.safetensors and tokenizer.json>]
// Without a directory the pinned revision is downloaded from Hugging Face.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const MODEL_REPO = "minishlab/potion-base-8M";
export const MODEL_REVISION = "bf8b056651a2c21b8d2565580b8569da283cab23";

const packageRoot = resolve(fileURLToPath(new URL("../", import.meta.url)));

async function source(name) {
  const dir = process.argv[2];
  if (dir) return readFile(join(dir, name));
  const url = `https://huggingface.co/${MODEL_REPO}/resolve/${MODEL_REVISION}/${name}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

const safetensors = await source("model.safetensors");
const headerLength = Number(safetensors.readBigUInt64LE(0));
const header = JSON.parse(safetensors.subarray(8, 8 + headerLength).toString());
const [, tensor] = Object.entries(header).find(
  ([key]) => key !== "__metadata__",
);
if (tensor.dtype !== "F32" || tensor.shape.length !== 2)
  throw new Error(`unexpected tensor ${tensor.dtype} ${tensor.shape}`);
const [rows, dims] = tensor.shape;
const start = 8 + headerLength + tensor.data_offsets[0];
const floats = new Float32Array(
  safetensors.buffer.slice(
    safetensors.byteOffset + start,
    safetensors.byteOffset + 8 + headerLength + tensor.data_offsets[1],
  ),
);

// Layout: "KSHM" | u32 version | u32 rows | u32 dims | f32 scale[rows] | i8 table[rows*dims]
const out = Buffer.alloc(16 + rows * 4 + rows * dims);
out.write("KSHM", 0, "ascii");
out.writeUInt32LE(1, 4);
out.writeUInt32LE(rows, 8);
out.writeUInt32LE(dims, 12);
for (let row = 0; row < rows; row++) {
  let max = 0;
  for (let col = 0; col < dims; col++)
    max = Math.max(max, Math.abs(floats[row * dims + col]));
  const scale = max / 127 || 1;
  out.writeFloatLE(scale, 16 + row * 4);
  for (let col = 0; col < dims; col++)
    out.writeInt8(
      Math.round(floats[row * dims + col] / scale),
      16 + rows * 4 + row * dims + col,
    );
}

const tokenizer = JSON.parse((await source("tokenizer.json")).toString());
const vocab = Object.entries(tokenizer.model.vocab).sort((a, b) => a[1] - b[1]);
if (vocab.length !== rows || vocab.some(([, id], index) => id !== index))
  throw new Error("tokenizer vocabulary does not match the embedding table");

await mkdir(join(packageRoot, "assets"), { recursive: true });
await writeFile(join(packageRoot, "assets", "potion-base-8M.int8.bin"), out);
await writeFile(
  join(packageRoot, "assets", "vocab.txt"),
  `${vocab.map(([token]) => token).join("\n")}\n`,
);
console.log(`wrote ${rows}x${dims} table (${out.byteLength} bytes)`);
