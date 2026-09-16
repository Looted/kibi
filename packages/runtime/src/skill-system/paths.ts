import { existsSync, statSync } from "node:fs";
import { isAbsolute, join, normalize, relative, resolve } from "node:path";
export const SKILL_FILE_NAME = "SKILL.md";
export function normalizeResourcePath(pathLike: string): string {
  return normalize(pathLike).replaceAll("\\", "/");
}
export function isPathOutOfBounds(pathLike: string): boolean {
  const normalized = normalizeResourcePath(pathLike);
  return (
    isAbsolute(pathLike) ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  );
}
// implements REQ-reusable-skill-subsystem
export function isWithinRoot(rootDir: string, candidatePath: string): boolean {
  const rel = relative(rootDir, candidatePath);
  // An empty rel (candidate === root) already satisfies both checks below.
  return !rel.startsWith("..") && !isAbsolute(rel);
}
export function resolveSkillFilePath(pathLike: string): string {
  const resolved = resolve(pathLike);
  if (existsSync(resolved) && statSync(resolved).isDirectory())
    return join(resolved, SKILL_FILE_NAME);
  return resolved.endsWith(SKILL_FILE_NAME)
    ? resolved
    : join(resolved, SKILL_FILE_NAME);
}
