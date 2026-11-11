/**
 * The agent harness ("host") a SkillOpt run uses for preflight, canaries,
 * the optimizer step and target cells.
 *
 * The operator picks it per run with `--host`; `KIBI_SKILLOPT_HOST` stays a
 * fallback and Codex is the default when neither is set. The resolved host
 * is passed on to child processes through the same variable, so a flag can
 * never be silently overridden by an inherited environment.
 *
 * This module holds only the names. What each host runs is registered in
 * `skillopt-host-registry.ts`.
 */

export const SKILLOPT_HOST_ENV = "KIBI_SKILLOPT_HOST" as const;

export const SKILLOPT_HOSTS = ["codex", "claude-code"] as const;

export type SkillOptHost = (typeof SKILLOPT_HOSTS)[number];

export const DEFAULT_SKILLOPT_HOST: SkillOptHost = "codex";

export class SkillOptHostSelectionError extends Error {
  readonly name = "SkillOptHostSelectionError";
}

export function isSkillOptHost(value: unknown): value is SkillOptHost {
  return (
    typeof value === "string" &&
    (SKILLOPT_HOSTS as readonly string[]).includes(value)
  );
}

function parseHost(value: string, source: string): SkillOptHost {
  if (isSkillOptHost(value)) return value;
  throw new SkillOptHostSelectionError(
    `${source} must be one of ${SKILLOPT_HOSTS.join("|")}`,
  );
}

/** The host named by `KIBI_SKILLOPT_HOST`, or Codex when it is unset. */
export function selectedSkillOptHost(
  env: NodeJS.ProcessEnv = process.env,
): SkillOptHost {
  const value = env[SKILLOPT_HOST_ENV];
  if (value === undefined || value === "") return DEFAULT_SKILLOPT_HOST;
  return parseHost(value, SKILLOPT_HOST_ENV);
}

/**
 * The host for this run: an explicit `--host` value wins over the
 * environment, which wins over the Codex default. Unknown names are refused
 * before any work.
 */
export function resolveSkillOptHost(
  input: Readonly<{ requested?: string; env?: NodeJS.ProcessEnv }>,
): SkillOptHost {
  if (input.requested !== undefined)
    return parseHost(input.requested, "--host");
  return selectedSkillOptHost(input.env ?? process.env);
}

/** `env` with the run's host pinned, for this process and its children. */
export function envWithSkillOptHost(
  env: NodeJS.ProcessEnv,
  host: SkillOptHost,
): NodeJS.ProcessEnv {
  return { ...env, [SKILLOPT_HOST_ENV]: host };
}

/**
 * The host a legacy preflight receipt was produced on. Receipts written
 * before the host was recorded carry only the CLI version string, which the
 * Claude Code preflight prefixes with `claude-code `.
 */
export function hostFromPreflightVersion(
  version: unknown,
): SkillOptHost | undefined {
  if (typeof version !== "string" || version.trim() === "") return undefined;
  return version.startsWith("claude-code ") ? "claude-code" : "codex";
}
