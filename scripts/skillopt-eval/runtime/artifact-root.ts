import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ARTIFACT_SUBPATH = ["kibi-skillopt", "isolation-canary"] as const;

export type ArtifactRootResolutionOptions = Readonly<{
  runtimeDir?: string;
  cacheRoot?: string;
  tempRoot?: string;
}>;

function unavailable(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error.code === "EACCES" ||
      error.code === "ENOENT" ||
      error.code === "EROFS")
  );
}

// implements REQ-skillopt-codex-optimization
export async function resolveArtifactRoot(
  configuredRoot?: string,
  options: ArtifactRootResolutionOptions = {
    runtimeDir: process.env.XDG_RUNTIME_DIR,
    cacheRoot: process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache"),
    tempRoot: tmpdir(),
  },
): Promise<string> {
  if (configuredRoot !== undefined) return resolve(configuredRoot);

  if (options.runtimeDir !== undefined) {
    try {
      await access(options.runtimeDir, constants.W_OK);
      return resolve(join(options.runtimeDir, ...ARTIFACT_SUBPATH));
    } catch (error) {
      if (!unavailable(error)) throw error;
    }
  }

  const cacheRoot = options.cacheRoot;
  if (cacheRoot !== undefined) {
    try {
      await access(cacheRoot, constants.W_OK);
      return resolve(join(cacheRoot, ...ARTIFACT_SUBPATH));
    } catch (error) {
      if (!unavailable(error)) throw error;
    }
  }

  return resolve(join(options.tempRoot ?? tmpdir(), ...ARTIFACT_SUBPATH));
}
