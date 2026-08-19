import {
  execFileSync as nodeExecFileSync,
  execSync as nodeExecSync,
  spawnSync as nodeSpawnSync,
  type ExecFileSyncOptions,
  type ExecSyncOptions,
  type SpawnSyncOptions,
  type SpawnSyncReturns,
} from "node:child_process";

/**
 * CLI sandboxes are independent Git checkouts. Host CI (especially the proof
 * workflow) may set `KIBI_BRANCH` for the dogfood repository's detached HEAD;
 * leaking that identity into a temp repo makes hashed stores and
 * `kibi init`/`sync`/`status` attach to the host branch instead of the
 * sandbox branch.
 *
 * Spreading `process.env` into `overrides` does not keep the host value.
 * Pass `KIBI_BRANCH` explicitly when a sandbox needs a synthetic identity.
 */
export function isolatedCliSandboxEnv(
  overrides: NodeJS.ProcessEnv = {},
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, ...overrides };
  delete env.KIBI_BRANCH;
  const explicit = overrides.KIBI_BRANCH;
  if (
    typeof explicit === "string" &&
    explicit.length > 0 &&
    explicit !== process.env.KIBI_BRANCH
  ) {
    env.KIBI_BRANCH = explicit;
  }
  return env;
}

export function execSync(
  command: string,
  options?: ExecSyncOptions,
): ReturnType<typeof nodeExecSync> {
  return nodeExecSync(command, {
    ...options,
    env: isolatedCliSandboxEnv(options?.env ?? {}),
  });
}

export function spawnSync(
  command: string,
  args: readonly string[],
  options?: SpawnSyncOptions,
): SpawnSyncReturns<string | Buffer> {
  return nodeSpawnSync(command, args as string[], {
    ...options,
    env: isolatedCliSandboxEnv(options?.env ?? {}),
  });
}

export function execFileSync(
  command: string,
  args: readonly string[],
  options?: ExecFileSyncOptions,
): ReturnType<typeof nodeExecFileSync> {
  return nodeExecFileSync(command, args as string[], {
    ...options,
    env: isolatedCliSandboxEnv(options?.env ?? {}),
  });
}
