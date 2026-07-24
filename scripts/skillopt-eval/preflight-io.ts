import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import type { z } from "zod";

export class PreflightInputError extends Error {
  readonly name = "PreflightInputError";
  constructor(
    readonly check: string,
    readonly code:
      | "EXTERNAL_PREREQUISITE_MISSING"
      | "LOCK_INVALID"
      | "PREFLIGHT_NO_GO",
    options?: ErrorOptions,
  ) {
    super(check, options);
  }
}

export function digest(data: string | Buffer): string {
  return new Bun.CryptoHasher("sha256").update(data).digest("hex");
}

function containsTraversal(path: string): boolean {
  return path.split(sep).includes("..");
}

async function assertComponentsAreNotSymlinks(path: string): Promise<void> {
  let current: string = sep;
  for (const part of resolve(path).split(sep).filter(Boolean)) {
    current = resolve(current, part);
    const stats = await lstat(current);
    if (stats.isSymbolicLink())
      throw new PreflightInputError("path-symlink", "LOCK_INVALID");
  }
}

export async function readNoFollow(
  path: string,
  kind: "lock" | "external",
  requireImmutable = false,
): Promise<Readonly<{ text: string; mode: number; uid: number }>> {
  if (containsTraversal(path))
    throw new PreflightInputError("path-traversal", "LOCK_INVALID");
  try {
    await assertComponentsAreNotSymlinks(path);
    const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const stats = await handle.stat();
      if (!stats.isFile())
        throw new PreflightInputError(
          `${kind}-regular-file`,
          kind === "external"
            ? "EXTERNAL_PREREQUISITE_MISSING"
            : "LOCK_INVALID",
        );
      const mode = stats.mode & 0o777;
      if (requireImmutable && (mode & 0o222) !== 0)
        throw new PreflightInputError(
          "external-bundle-mode",
          "PREFLIGHT_NO_GO",
        );
      return { text: await handle.readFile("utf8"), mode, uid: stats.uid };
    } finally {
      await handle.close();
    }
  } catch (error) {
    if (error instanceof PreflightInputError) throw error;
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new PreflightInputError(
        kind === "external" ? "external-bundle-lock" : "lock-missing",
        kind === "external" ? "EXTERNAL_PREREQUISITE_MISSING" : "LOCK_INVALID",
        { cause: error },
      );
    }
    throw new PreflightInputError(
      `${kind}-read`,
      kind === "external" ? "EXTERNAL_PREREQUISITE_MISSING" : "LOCK_INVALID",
      { cause: error },
    );
  }
}

export async function validateTrustDirectory(
  path: string,
  expectedUid: number,
): Promise<void> {
  try {
    const stats = await lstat(path);
    if (stats.isSymbolicLink() || !stats.isDirectory())
      throw new PreflightInputError(
        "external-root-directory",
        "PREFLIGHT_NO_GO",
      );
    if (stats.uid !== expectedUid)
      throw new PreflightInputError(
        "external-root-ownership",
        "PREFLIGHT_NO_GO",
      );
    if ((stats.mode & 0o022) !== 0)
      throw new PreflightInputError("external-root-mode", "PREFLIGHT_NO_GO");
  } catch (error) {
    if (error instanceof PreflightInputError) throw error;
    throw new PreflightInputError(
      "external-root-directory",
      "EXTERNAL_PREREQUISITE_MISSING",
      { cause: error },
    );
  }
}

export async function parseLock<T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<Readonly<{ value: T; digest: string }>> {
  const loaded = await readNoFollow(path, "lock");
  try {
    return {
      value: schema.parse(JSON.parse(loaded.text)),
      digest: digest(loaded.text),
    };
  } catch (error) {
    throw new PreflightInputError("lock-schema", "LOCK_INVALID", {
      cause: error,
    });
  }
}

export function ensureInside(root: string, path: string): void {
  const child = relative(resolve(root), resolve(path));
  if (
    child === "" ||
    child.startsWith(`..${sep}`) ||
    child === ".." ||
    isAbsolute(child)
  ) {
    throw new PreflightInputError("path-boundary", "LOCK_INVALID");
  }
}

export function parent(path: string): string {
  return dirname(path);
}
