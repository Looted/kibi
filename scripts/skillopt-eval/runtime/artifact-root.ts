import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ARTIFACT_SUBPATH = ["kibi-skillopt", "isolation-canary"] as const;

export type ArtifactRootResolutionOptions = Readonly<{
  runtimeDir?: string;
  tempRoot?: string;
}>;

// implements REQ-skillopt-codex-optimization
export async function resolveArtifactRoot(
  configuredRoot?: string,
  options: ArtifactRootResolutionOptions = {
    runtimeDir: process.env.XDG_RUNTIME_DIR,
    tempRoot: tmpdir(),
  },
): Promise<string> {
  if (configuredRoot !== undefined) return resolve(configuredRoot);

  if (options.runtimeDir !== undefined) {
    try {
      await access(options.runtimeDir, constants.W_OK);
      return resolve(join(options.runtimeDir, ...ARTIFACT_SUBPATH));
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error.code === "EACCES" ||
          error.code === "ENOENT" ||
          error.code === "EROFS")
      ) {
        return resolve(join(options.tempRoot ?? tmpdir(), ...ARTIFACT_SUBPATH));
      }
      throw error;
    }
  }

  return resolve(join(options.tempRoot ?? tmpdir(), ...ARTIFACT_SUBPATH));
}
