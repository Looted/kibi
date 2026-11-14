import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import matter from "gray-matter";
import { SkillOversizeError, SkillValidationError } from "./errors.js";
import {
  SKILL_FILE_NAME,
  isPathOutOfBounds,
  isWithinRoot,
  normalizeResourcePath,
  resolveSkillFilePath,
} from "./paths.js";
import type { SkillBundle, SkillManifest } from "./types.js";
const SKILL_MARKDOWN_MAX_BYTES = 256 * 1024;
export const RESOURCE_MAX_BYTES = 128 * 1024;
export function assertMaxBytes(pathLike: string, maxBytes: number): void {
  const size = statSync(pathLike).size;
  if (size > maxBytes) throw new SkillOversizeError(pathLike, maxBytes, size);
}
export function parseSkillBundle(rootDir: string): SkillBundle {
  const path = resolve(rootDir, SKILL_FILE_NAME);
  assertMaxBytes(path, SKILL_MARKDOWN_MAX_BYTES);
  // gray-matter decodes a Buffer as UTF-8 itself.
  const parsed = matter(readFileSync(path));
  const data = manifestFields(parsed.data);
  const [error] = validateManifestData(data);
  if (error) throw error;
  return {
    manifest: coerceManifest(data),
    body: parsed.content,
    rootDir: resolve(rootDir),
  };
}
export function validateSkillBundle(pathLike: string): {
  valid: boolean;
  errors: SkillValidationError[];
} {
  const path = resolveSkillFilePath(pathLike);
  const errors: SkillValidationError[] = [];
  if (!existsSync(path))
    return {
      valid: false,
      errors: [
        new SkillValidationError("SKILL.md", `Missing ${SKILL_FILE_NAME}`),
      ],
    };
  const data = manifestFields(matter(readFileSync(path)).data);
  errors.push(...validateManifestData(data));
  if (errors.length === 0)
    validateBundleContents(path, coerceManifest(data), errors);
  return { valid: errors.length === 0, errors };
}
/**
 * The skill manifest fields of a SKILL.md front matter. Host mirrors whose
 * loaders accept only a few top-level keys (the Claude Code and ZCode
 * bundles) nest the Kibi fields under `metadata:`; a top-level field wins
 * over a nested one.
 */
function manifestFields(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const metadata = data.metadata;
  if (
    typeof metadata !== "object" ||
    metadata === null ||
    Array.isArray(metadata)
  )
    return data;
  const fields: Record<string, unknown> = { ...data };
  for (const [key, value] of Object.entries(metadata))
    if (fields[key] === undefined) fields[key] = value;
  return fields;
}
// fs calls and assertMaxBytes only ever throw Error instances.
function messageOf(error: unknown): string {
  return (error as Error).message;
}
function validateBundleContents(
  path: string,
  manifest: SkillManifest,
  errors: SkillValidationError[],
): void {
  try {
    assertMaxBytes(path, SKILL_MARKDOWN_MAX_BYTES);
  } catch (error) {
    errors.push(new SkillValidationError("SKILL.md", messageOf(error)));
  }
  let root: string;
  try {
    root = realpathSync(dirname(path));
  } catch (error) {
    errors.push(new SkillValidationError("SKILL.md", messageOf(error)));
    return;
  }
  for (const resource of manifest.resources ?? []) {
    const resourcePath = resolve(dirname(path), resource);
    try {
      if (!existsSync(resourcePath)) {
        errors.push(
          new SkillValidationError(
            "resources",
            `Missing skill resource: ${resource}`,
          ),
        );
        continue;
      }
      const real = realpathSync(resourcePath);
      if (!isWithinRoot(root, real)) {
        errors.push(
          new SkillValidationError(
            "resources",
            `Skill resource escapes bundle root: ${resource}`,
          ),
        );
        continue;
      }
      assertMaxBytes(resourcePath, RESOURCE_MAX_BYTES);
    } catch (error) {
      errors.push(new SkillValidationError("resources", messageOf(error)));
    }
  }
}
function validateManifestData(
  data: Record<string, unknown>,
): SkillValidationError[] {
  const errors: SkillValidationError[] = [];
  for (const field of [
    "id",
    "name",
    "description",
    "version",
    "kibiCompatibility",
  ] as const)
    if (typeof data[field] !== "string" || data[field].trim() === "")
      errors.push(
        new SkillValidationError(
          field,
          `Missing required skill field: ${field}`,
        ),
      );
  if (
    typeof data.version === "string" &&
    !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(data.version)
  )
    errors.push(
      new SkillValidationError(
        "version",
        `Invalid skill version: ${data.version}`,
      ),
    );
  for (const [field, value] of [
    ["tags", data.tags],
    ["resources", data.resources],
  ] as const) {
    if (value !== undefined && !isStringArray(value))
      errors.push(
        new SkillValidationError(field, `Skill ${field} must be strings`),
      );
  }
  if (isStringArray(data.resources))
    // normalize() never returns "" (an empty path becomes "."), so only
    // the bounds test can reject a resource here.
    for (const resource of data.resources)
      if (isPathOutOfBounds(resource))
        errors.push(
          new SkillValidationError(
            "resources",
            `Invalid skill resource: ${resource}`,
          ),
        );
  return errors;
}
function coerceManifest(data: Record<string, unknown>): SkillManifest {
  const manifest: SkillManifest = {
    id: String(data.id),
    name: String(data.name),
    description: String(data.description),
    version: String(data.version),
    kibiCompatibility: String(data.kibiCompatibility),
  };
  if (isStringArray(data.tags)) manifest.tags = data.tags;
  if (isStringArray(data.resources))
    manifest.resources = data.resources.map(normalizeResourcePath);
  return manifest;
}
function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}
