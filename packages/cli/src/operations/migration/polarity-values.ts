import { load as loadYaml } from "js-yaml";
import {
  listLaneMarkdownFiles,
  readText,
  sliceFrontmatter,
  writeFileAtomically,
} from "./kb-sources.js";

// implements REQ-cli-schema-migration, REQ-kibi-truthful-consistency
export const POLARITY_VALUE_BACKFILL_CODE = "polarity_value_backfill";

/** Only polarity-only legacy claims have an unambiguous boolean encoding. */
// implements REQ-cli-schema-migration, REQ-kibi-truthful-consistency
export function planPolarityValueBackfill(
  workspaceRoot: string,
): readonly { id: string; path: string; before: string; after: string }[] {
  const targets: { id: string; path: string; before: string; after: string }[] =
    [];
  for (const file of listLaneMarkdownFiles(workspaceRoot, ["facts"])) {
    const before = readText(file.absolutePath);
    const slice = before === null ? null : sliceFrontmatter(before);
    if (!slice || before === null) continue;
    let data: Record<string, unknown> | null;
    try {
      data = loadYaml(slice.text) as Record<string, unknown> | null;
    } catch (error) {
      throw new Error(
        `Cannot migrate fact ${file.relativePath}: ${error instanceof Error ? error.message : String(error)}`,
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
    const after = `${slice.prefix}${slice.text}operator: eq${slice.eol}value_type: bool${slice.eol}value_bool: true${slice.eol}${slice.suffix}`;
    const parsed = loadYaml(sliceFrontmatter(after)!.text) as Record<
      string,
      unknown
    >;
    if (
      parsed.operator !== "eq" ||
      parsed.value_type !== "bool" ||
      parsed.value_bool !== true
    )
      throw new Error(
        `Polarity migration could not verify ${file.relativePath}`,
      );
    targets.push({
      id:
        typeof data.id === "string"
          ? data.id
          : file.relativePath.split("/").at(-1)!.slice(0, -3),
      path: file.relativePath,
      before,
      after,
    });
  }
  return targets;
}

// implements REQ-cli-schema-migration, REQ-kibi-truthful-consistency
export function applyPolarityValueBackfill(workspaceRoot: string): number {
  const targets = planPolarityValueBackfill(workspaceRoot);
  for (const target of targets)
    writeFileAtomically(`${workspaceRoot}/${target.path}`, target.after);
  return targets.length;
}
