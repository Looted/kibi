import * as fs from "node:fs";
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
  const size = fs.statSync(pathLike).size;
  if (size > maxBytes) throw new SkillOversizeError(pathLike, maxBytes, size);
}
export function parseSkillBundle(rootDir: string): SkillBundle {
  const path = resolve(rootDir, SKILL_FILE_NAME);
  assertMaxBytes(path, SKILL_MARKDOWN_MAX_BYTES);
  const parsed = matter(fs.readFileSync(path, "utf8"));
  const [error] = validateManifestData(parsed.data);
  if (error) throw error;
  return {
    manifest: coerceManifest(parsed.data),
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
  if (!fs.existsSync(path))
    return {
      valid: false,
      errors: [
        new SkillValidationError("SKILL.md", `Missing ${SKILL_FILE_NAME}`),
      ],
    };
  const parsed = matter(fs.readFileSync(path, "utf8"));
  errors.push(...validateManifestData(parsed.data));
  if (errors.length === 0)
    validateBundleContents(path, coerceManifest(parsed.data), errors);
  return { valid: errors.length === 0, errors };
}
function validateBundleContents(
  path: string,
  manifest: SkillManifest,
  errors: SkillValidationError[],
): void {
  try {
    assertMaxBytes(path, SKILL_MARKDOWN_MAX_BYTES);
  } catch (error) {
    errors.push(
      new SkillValidationError(
        "SKILL.md",
        error instanceof Error ? error.message : String(error),
      ),
    );
  }
  let root: string;
  try {
    root = fs.realpathSync(dirname(path));
  } catch (error) {
    errors.push(
      new SkillValidationError(
        "SKILL.md",
        error instanceof Error ? error.message : String(error),
      ),
    );
    return;
  }
  for (const resource of manifest.resources ?? []) {
    const resourcePath = resolve(dirname(path), resource);
    try {
      if (!fs.existsSync(resourcePath)) {
        errors.push(
          new SkillValidationError(
            "resources",
            `Missing skill resource: ${resource}`,
          ),
        );
        continue;
      }
      const real = fs.realpathSync(resourcePath);
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
      errors.push(
        new SkillValidationError(
          "resources",
          error instanceof Error ? error.message : String(error),
        ),
      );
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
    for (const resource of data.resources)
      if (!normalizeResourcePath(resource) || isPathOutOfBounds(resource))
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
