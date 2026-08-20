import {
  execSync as nodeExecSync,
  spawnSync as nodeSpawnSync,
  type ExecSyncOptions,
  type SpawnSyncOptions,
  type SpawnSyncReturns,
} from "node:child_process";

/**
 * MCP sandboxes are independent Git checkouts. Host CI (especially the proof
 * workflow) may set `KIBI_BRANCH` for the dogfood repository's detached HEAD;
 * leaking that identity into a temp repo makes hashed stores and
 * `kibi init`/`sync` attach to the host branch while the MCP server resolves
 * the sandbox Git branch.
 *
 * Spreading `process.env` into `overrides` does not keep the host value.
 * Pass `KIBI_BRANCH` explicitly when a sandbox needs a synthetic identity.
 * Assigning `KIBI_BRANCH: undefined` is not enough: Bun spawn can still
 * inherit the parent value unless the key is deleted.
 */
export function isolatedMcpSandboxEnv(
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

export function clearHostKibiBranch(): void {
  delete process.env.KIBI_BRANCH;
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
    env: isolatedMcpSandboxEnv(options?.env ?? {}),
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
    env: isolatedMcpSandboxEnv(options?.env ?? {}),
  });
}
