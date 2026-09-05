import {
  type ExecFileSyncOptions,
  type ExecSyncOptions,
  type SpawnSyncOptions,
  type SpawnSyncReturns,
  execFileSync as nodeExecFileSync,
  execSync as nodeExecSync,
  spawnSync as nodeSpawnSync,
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
  Reflect.deleteProperty(env, "KIBI_BRANCH");
  for (const key of ["KIBI_WORKSPACE", "KIBI_PROJECT_ROOT", "KIBI_ROOT"]) {
    Reflect.deleteProperty(env, key);
  }
  // Proof producer env must not leak into sandbox CLIs (workspace identity,
  // snapshot, or the selected test list).
  for (const key of Object.keys(env)) {
    if (key.startsWith("KIBI_PROOF_")) Reflect.deleteProperty(env, key);
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (
      key.startsWith("KIBI_PROOF_") &&
      typeof value === "string" &&
      value.length > 0 &&
      value !== process.env[key]
    ) {
      env[key] = value;
    }
  }
  const explicit = overrides.KIBI_BRANCH;
  if (
    typeof explicit === "string" &&
    explicit.length > 0 &&
    explicit !== process.env.KIBI_BRANCH
  ) {
    env.KIBI_BRANCH = explicit;
  }
  for (const key of ["KIBI_WORKSPACE", "KIBI_PROJECT_ROOT", "KIBI_ROOT"] as const) {
    const value = overrides[key];
    if (
      typeof value === "string" &&
      value.length > 0 &&
      value !== process.env[key]
    ) {
      env[key] = value;
    }
  }
  return env;
}

export function execSync(
  command: string,
  options: ExecSyncOptions & { encoding: BufferEncoding },
): string;
export function execSync(command: string, options?: ExecSyncOptions): Buffer;
export function execSync(
  command: string,
  options?: ExecSyncOptions,
): string | Buffer {
  return nodeExecSync(command, {
    ...options,
    env: isolatedCliSandboxEnv(options?.env ?? {}),
  });
}

export function spawnSync(
  command: string,
  args: readonly string[],
  options: SpawnSyncOptions & { encoding: BufferEncoding },
): SpawnSyncReturns<string>;
export function spawnSync(
  command: string,
  args: readonly string[],
  options?: SpawnSyncOptions,
): SpawnSyncReturns<Buffer>;
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
  options: ExecFileSyncOptions & { encoding: BufferEncoding },
): string;
export function execFileSync(
  command: string,
  args: readonly string[],
  options?: ExecFileSyncOptions,
): Buffer;
export function execFileSync(
  command: string,
  args: readonly string[],
  options?: ExecFileSyncOptions,
): string | Buffer {
  return nodeExecFileSync(command, args as string[], {
    ...options,
    env: isolatedCliSandboxEnv(options?.env ?? {}),
  });
}
