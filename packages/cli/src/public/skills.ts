import {
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from "node:fs";
import {
  dirname,
  isAbsolute,
  join,
  normalize,
  relative,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const SKILL_MARKDOWN_MAX_BYTES = 256 * 1024;
const RESOURCE_MAX_BYTES = 128 * 1024;
const SKILL_FILE_NAME = "SKILL.md";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const bundledSkillsDir = resolve(moduleDir, "skills");

export interface SkillManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  kibiCompatibility: string;
  tags?: string[];
  resources?: string[];
}

export interface SkillBundle {
  manifest: SkillManifest;
  body: string;
  rootDir: string;
}

export class SkillNotFoundError extends Error {
  constructor(id: string) {
    super(`Skill not found: ${id}`);
    this.name = "SkillNotFoundError";
  }
}

export class SkillResourceNotFoundError extends Error {
  constructor(id: string, resourcePath: string) {
    super(`Skill resource not found: ${id}/${resourcePath}`);
    this.name = "SkillResourceNotFoundError";
  }
}

export class SkillResourceOutOfBoundsError extends Error {
  constructor(id: string, resourcePath: string) {
    super(`Skill resource escapes bundle root: ${id}/${resourcePath}`);
    this.name = "SkillResourceOutOfBoundsError";
  }
}

export class SkillValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = "SkillValidationError";
    this.field = field;
  }
}

export class SkillOversizeError extends Error {
  readonly maxBytes: number;
  readonly actualBytes: number;

  constructor(pathLike: string, maxBytes: number, actualBytes: number) {
    super(`Skill file exceeds ${maxBytes} bytes: ${pathLike} (${actualBytes} bytes)`);
    this.name = "SkillOversizeError";
    this.maxBytes = maxBytes;
    this.actualBytes = actualBytes;
  }
}

export function listBundledSkills(): SkillManifest[] { // implements REQ-001
  if (!existsSync(bundledSkillsDir)) {
    return [];
  }

  return readdirSync(bundledSkillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(bundledSkillsDir, entry.name))
    .filter((rootDir) => existsSync(join(rootDir, SKILL_FILE_NAME)))
    .map((rootDir) => parseSkillBundle(rootDir).manifest)
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function loadBundledSkill(id: string): SkillBundle { // implements REQ-001
  const rootDir = findBundledSkillRoot(id);
  if (!rootDir) {
    throw new SkillNotFoundError(id);
  }

  return parseSkillBundle(rootDir);
}

export function readBundledSkillResource(
  id: string,
  resourcePath: string,
): string { // implements REQ-001
  const bundle = loadBundledSkill(id);
  const declaredResource = normalizeResourcePath(resourcePath);

  if (!declaredResource || isPathOutOfBounds(resourcePath)) {
    throw new SkillResourceOutOfBoundsError(id, resourcePath);
  }

  if (!isDeclaredResource(bundle.manifest, declaredResource)) {
    throw new SkillResourceNotFoundError(id, resourcePath);
  }

  const candidatePath = resolve(bundle.rootDir, declaredResource);
  let realResourcePath: string;
  let realRootDir: string;
  try {
    realResourcePath = realpathSync(candidatePath);
    realRootDir = realpathSync(bundle.rootDir);
  } catch {
    throw new SkillResourceNotFoundError(id, resourcePath);
  }

  if (!isWithinRoot(realRootDir, realResourcePath)) {
    throw new SkillResourceOutOfBoundsError(id, resourcePath);
  }

  assertMaxBytes(candidatePath, RESOURCE_MAX_BYTES);
  return readFileSync(candidatePath, "utf8");
}

export function validateSkillBundle(
  pathLike: string,
): { valid: boolean; errors: SkillValidationError[] } { // implements REQ-001
  const skillFilePath = resolveSkillFilePath(pathLike);
  const errors: SkillValidationError[] = [];

  if (!existsSync(skillFilePath)) {
    errors.push(new SkillValidationError("SKILL.md", `Missing ${SKILL_FILE_NAME}`));
    return { valid: false, errors };
  }

  const parsed = matter(readFileSync(skillFilePath, "utf8"));
  errors.push(...validateManifestData(parsed.data));

  return { valid: errors.length === 0, errors };
}

function findBundledSkillRoot(id: string): string | undefined {
  if (!existsSync(bundledSkillsDir)) {
    return undefined;
  }

  for (const entry of readdirSync(bundledSkillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const rootDir = join(bundledSkillsDir, entry.name);
    const skillFilePath = join(rootDir, SKILL_FILE_NAME);
    if (!existsSync(skillFilePath)) {
      continue;
    }

    const manifest = parseSkillBundle(rootDir).manifest;
    if (manifest.id === id) {
      return rootDir;
    }
  }

  return undefined;
}

function parseSkillBundle(rootDir: string): SkillBundle {
  const skillFilePath = join(rootDir, SKILL_FILE_NAME);
  assertMaxBytes(skillFilePath, SKILL_MARKDOWN_MAX_BYTES);

  const parsed = matter(readFileSync(skillFilePath, "utf8"));
  const errors = validateManifestData(parsed.data);
  if (errors.length > 0) {
    throw errors[0] as SkillValidationError;
  }

  return {
    manifest: coerceManifest(parsed.data),
    body: parsed.content,
    rootDir: resolve(rootDir),
  };
}

function validateManifestData(data: Record<string, unknown>): SkillValidationError[] {
  const errors: SkillValidationError[] = [];
  const requiredFields = [
    "id",
    "name",
    "description",
    "version",
    "kibiCompatibility",
  ] as const;

  for (const field of requiredFields) {
    if (typeof data[field] !== "string" || data[field].trim() === "") {
      errors.push(new SkillValidationError(field, `Missing required skill field: ${field}`));
    }
  }

  if (typeof data.version === "string" && !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(data.version)) {
    errors.push(new SkillValidationError("version", `Invalid skill version: ${data.version}`));
  }

  if (data.tags !== undefined && !isStringArray(data.tags)) {
    errors.push(new SkillValidationError("tags", "Skill tags must be strings"));
  }

  if (data.resources !== undefined) {
    if (!isStringArray(data.resources)) {
      errors.push(new SkillValidationError("resources", "Skill resources must be strings"));
    } else {
      for (const resource of data.resources) {
        const normalized = normalizeResourcePath(resource);
        if (!normalized || isPathOutOfBounds(resource)) {
          errors.push(
            new SkillValidationError("resources", `Invalid skill resource: ${resource}`),
          );
        }
      }
    }
  }

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

  if (isStringArray(data.tags)) {
    manifest.tags = data.tags;
  }

  if (isStringArray(data.resources)) {
    manifest.resources = data.resources.map((resource) => normalizeResourcePath(resource));
  }

  return manifest;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function normalizeResourcePath(pathLike: string): string {
  return normalize(pathLike).replaceAll("\\", "/");
}

function isPathOutOfBounds(pathLike: string): boolean {
  const normalized = normalizeResourcePath(pathLike);
  return (
    isAbsolute(pathLike) ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  );
}

function isDeclaredResource(manifest: SkillManifest, resourcePath: string): boolean {
  return (manifest.resources ?? []).some(
    (declared) => normalizeResourcePath(declared) === resourcePath,
  );
}

function isWithinRoot(rootDir: string, candidatePath: string): boolean {
  const relativePath = relative(rootDir, candidatePath);
  return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
}

function assertMaxBytes(pathLike: string, maxBytes: number): void {
  const size = statSync(pathLike).size;
  if (size > maxBytes) {
    throw new SkillOversizeError(pathLike, maxBytes, size);
  }
}

function resolveSkillFilePath(pathLike: string): string {
  const resolved = resolve(pathLike);
  if (existsSync(resolved) && statSync(resolved).isDirectory()) {
    return join(resolved, SKILL_FILE_NAME);
  }

  return resolved.endsWith(SKILL_FILE_NAME) ? resolved : join(resolved, SKILL_FILE_NAME);
}
