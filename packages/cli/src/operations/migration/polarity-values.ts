import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { load as loadYaml } from "js-yaml";
import {
  listLaneMarkdownSources,
  sliceFrontmatter,
  writeFileAtomically,
} from "./kb-sources.js";

export const POLARITY_VALUE_BACKFILL_CODE = "polarity_value_backfill";

/** Only polarity-only legacy claims have an unambiguous boolean encoding. */
export function planPolarityValueBackfill(
  workspaceRoot: string,
): readonly { id: string; path: string; before: string; after: string }[] {
  const targets: { id: string; path: string; before: string; after: string }[] =
    [];
  for (const file of listLaneMarkdownSources(workspaceRoot, ["facts"])) {
    const before = file.content;
    const slice = sliceFrontmatter(before);
    if (!slice) continue;
    let data: Record<string, unknown> | null;
    try {
      data = loadYaml(slice.text) as Record<string, unknown> | null;
    } catch (error) {
      // js-yaml throws YAMLException, an Error.
      throw new Error(
        `Cannot migrate fact ${file.relativePath}: ${(error as Error).message}`,
      );
    }
    if (
      !data ||
      data.fact_kind !== "property_value" ||
      !["require", "forbid"].includes(String(data.polarity))
    )
      continue;
    if (
      [
        "operator",
        "value_type",
        "value_bool",
        "value_int",
        "value_number",
        "value_string",
      ].some((key) => Object.hasOwn(data, key))
    )
      continue;
    if (
      typeof data.subject_key !== "string" ||
      typeof data.property_key !== "string"
    )
      throw new Error(
        `Cannot migrate polarity fact ${file.relativePath}: subject_key and property_key are required`,
      );
    const text = `${slice.text}operator: eq${slice.eol}value_type: bool${slice.eol}value_bool: true${slice.eol}`;
    const after = `${slice.prefix}${text}${slice.suffix}`;
    // The appended keys sit at column 0, so a front matter block indented as
    // a whole no longer parses and is refused here. `text` is exactly the
    // front matter `after` splits into.
    let verified = false;
    try {
      verified = isDeepStrictEqual(loadYaml(text), {
        ...data,
        operator: "eq",
        value_type: "bool",
        value_bool: true,
      });
    } catch {}
    if (!verified)
      throw new Error(
        `Polarity migration could not verify ${file.relativePath}`,
      );
    targets.push({
      id:
        typeof data.id === "string"
          ? data.id
          : path.basename(file.relativePath, ".md"),
      path: file.relativePath,
      before,
      after,
    });
  }
  return targets;
}

export function applyPolarityValueBackfill(workspaceRoot: string): number {
  const targets = planPolarityValueBackfill(workspaceRoot);
  for (const target of targets)
    writeFileAtomically(`${workspaceRoot}/${target.path}`, target.after);
  return targets.length;
}
