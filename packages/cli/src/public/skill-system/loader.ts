import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SkillNotFoundError,
  SkillResourceNotFoundError,
  SkillResourceOutOfBoundsError,
} from "./errors.js";
import {
  SKILL_FILE_NAME,
  isPathOutOfBounds,
  isWithinRoot,
  normalizeResourcePath,
} from "./paths.js";
import type { SkillBundle, SkillManifest } from "./types.js";
import {
  RESOURCE_MAX_BYTES,
  assertMaxBytes,
  parseSkillBundle,
} from "./validation.js";
const defaultBundledSkillsDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../skills",
);
let bundledSkillsDir = defaultBundledSkillsDir;
export function setBundledSkillsDir(dir: string): void {
  bundledSkillsDir = dir;
}
export function resetBundledSkillsDir(): void {
  bundledSkillsDir = defaultBundledSkillsDir;
}
export function listBundledSkills(): SkillManifest[] {
  return listFrom(bundledSkillsDir);
}
export function loadBundledSkill(id: string): SkillBundle {
  return loadBundledSkillFrom(bundledSkillsDir, id);
}
// implements REQ-reusable-skill-subsystem
// covered_by TEST-skill-cli-load-validate
export function loadBundledSkillFrom(
  skillsDir: string,
  id: string,
): SkillBundle {
  const root = findRoot(resolve(skillsDir), id);
  if (!root) throw new SkillNotFoundError(id);
  return parseSkillBundle(root);
}
export function readBundledSkillResource(
  id: string,
  resourcePath: string,
): string {
  return readBundle(loadBundledSkill(id), id, resourcePath);
}
// implements REQ-reusable-skill-subsystem
// covered_by TEST-skill-cli-load-validate
export function readBundledSkillResourceFrom(
  skillsDir: string,
  id: string,
  resourcePath: string,
): string {
  return readBundle(loadBundledSkillFrom(skillsDir, id), id, resourcePath);
}
function listFrom(dir: string): SkillManifest[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(dir, entry.name))
    .filter((root) => existsSync(join(root, SKILL_FILE_NAME)))
    .map((root) => parseSkillBundle(root).manifest)
    .sort((a, b) => a.id.localeCompare(b.id));
}
function findRoot(dir: string, id: string): string | undefined {
  return listRoots(dir).find(
    (root) => parseSkillBundle(root).manifest.id === id,
  );
}
function listRoots(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(dir, entry.name))
    .filter((root) => existsSync(join(root, SKILL_FILE_NAME)));
}
function readBundle(
  bundle: SkillBundle,
  id: string,
  resourcePath: string,
): string {
  const resource = normalizeResourcePath(resourcePath);
  if (!resource || isPathOutOfBounds(resourcePath))
    throw new SkillResourceOutOfBoundsError(id, resourcePath);
  if (
    !(bundle.manifest.resources ?? []).some(
      (declared) => normalizeResourcePath(declared) === resource,
    )
  )
    throw new SkillResourceNotFoundError(id, resourcePath);
  const candidate = resolve(bundle.rootDir, resource);
  try {
    if (!isWithinRoot(realpathSync(bundle.rootDir), realpathSync(candidate)))
      throw new SkillResourceOutOfBoundsError(id, resourcePath);
  } catch (error) {
    if (error instanceof SkillResourceOutOfBoundsError) throw error;
    throw new SkillResourceNotFoundError(id, resourcePath);
  }
  assertMaxBytes(candidate, RESOURCE_MAX_BYTES);
  return readFileSync(candidate, "utf8");
}
