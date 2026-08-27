import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleUrl = new URL(
  "../packages/cli/dist/public/schemas/entity.js",
  import.meta.url,
);
const loaded = await import(moduleUrl.href);
const schema = loaded.default ?? loaded.entitySchema;
if (!schema || typeof schema !== "object") {
  throw new Error("Runtime entity schema export is missing");
}
const output = `${JSON.stringify(schema, null, 2)}\n`;
const target = path.join(root, "packages/cli/src/schemas/entity.schema.json");
if (process.argv.includes("--check")) {
  const current = await readFile(target, "utf8");
  if (current !== output) {
    throw new Error(
      "Static entity schema is out of date; run the CLI schema:generate workflow",
    );
  }
} else {
  await writeFile(target, output, "utf8");
}
