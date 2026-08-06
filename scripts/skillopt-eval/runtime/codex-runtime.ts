import { constants as fsConstants } from "node:fs";
import {
  access,
  chmod,
  cp,
  mkdir,
  mkdtemp,
  realpath,
  rm,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { RuntimePrerequisiteError } from "./canary-errors";

export type StagedCodexRuntime = Readonly<{
  codexExecutable: string;
  bwrapExecutable: string;
}>;

export type CodexRuntimeLease = StagedCodexRuntime &
  Readonly<{
    root: string;
    cleanup: () => Promise<void>;
  }>;

export type CodexRuntimeStagingDependencies = Readonly<{
  codexExecutable?: string;
  systemBwrapExecutable?: string | null;
}>;

async function executableFile(path: string): Promise<boolean> {
  try {
    await access(path, fsConstants.X_OK);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export async function stageCodexRuntime(
  runtimeRoot: string,
  dependencies: CodexRuntimeStagingDependencies = {},
): Promise<StagedCodexRuntime> {
  const resolvedRuntimeRoot = resolve(runtimeRoot);
  await mkdir(resolvedRuntimeRoot, { recursive: true, mode: 0o700 });
  await chmod(resolvedRuntimeRoot, 0o700);
  const installedCodex = await realpath(
    dependencies.codexExecutable ?? Bun.which("codex") ?? "codex",
  );
  const codexExecutable = resolve(resolvedRuntimeRoot, "codex");
  await cp(installedCodex, codexExecutable);
  await chmod(codexExecutable, 0o500);

  const bundledSource = resolve(
    dirname(installedCodex),
    "../codex-resources/bwrap",
  );
  const bwrapExecutable = resolve(resolvedRuntimeRoot, "codex-resources/bwrap");
  await mkdir(dirname(bwrapExecutable), { recursive: true, mode: 0o700 });
  const bwrapSource = (await executableFile(bundledSource))
    ? bundledSource
    : await (async () => {
        const systemBwrap =
          "systemBwrapExecutable" in dependencies
            ? dependencies.systemBwrapExecutable
            : Bun.which("bwrap");
        if (systemBwrap === null || systemBwrap === undefined) {
          throw new RuntimePrerequisiteError("missing_bwrap");
        }
        return await realpath(systemBwrap);
      })();
  await cp(bwrapSource, bwrapExecutable);
  await chmod(bwrapExecutable, 0o500);
  return { codexExecutable, bwrapExecutable };
}

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export async function createCodexRuntimeLease(
  options: Readonly<{ artifactRoot: string }>,
  dependencies: CodexRuntimeStagingDependencies = {},
): Promise<CodexRuntimeLease> {
  const parent = resolve(options.artifactRoot, ".runtime");
  await mkdir(parent, { recursive: true, mode: 0o700 });
  await chmod(parent, 0o700);
  const root = await mkdtemp(join(parent, "codex-runtime-"));
  await chmod(root, 0o700);
  try {
    const staged = await stageCodexRuntime(root, dependencies);
    let cleaned = false;
    return {
      root,
      ...staged,
      cleanup: async () => {
        if (cleaned) return;
        await rm(root, { recursive: true, force: true });
        cleaned = true;
      },
    };
  } catch (error) {
    await rm(root, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
}
