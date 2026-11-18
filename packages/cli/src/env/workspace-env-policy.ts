/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program. If not, see <https://www.gnu.org/licenses/>.
*/

/**
 * Which keys a workspace env file (the project `.env.kibi` or its
 * `KIBI_ENV_FILE` replacement, and the legacy `.env`) may set.
 *
 * Workspace files come with the checkout, so a cloned repository controls
 * them. They exist for provider secrets and provider settings. They must not
 * change what Kibi executes or loads, where it keeps runtime state, which
 * workspace or branch it attaches, or how the processes it starts behave.
 * The user file (`~/.config/kibi/env`) and the process environment are
 * trusted and are not filtered.
 *
 * The policy denies by default on both sides. Inside the `KIBI_` namespace
 * only the provider-setting prefixes below pass. Outside it only a provider
 * secret or setting passes (a name ending in `_API_KEY`, `_TOKEN`,
 * `_SECRET`, `_MODEL` and the like, such as `TYPESAFE_API_KEY`), and
 * never one of the process-level variables below: a process variable that
 * loads code (`OPENSSL_CONF`, `_JAVA_OPTIONS`, `RUSTC_WRAPPER`, ...) has no
 * such name, so a list of them cannot fall behind. An endpoint (`_URL`,
 * `_ENDPOINT`, such as `TYPESAFE_BASE_URL`) never passes: a cloned
 * repository could point a provider SDK at its own server and receive the
 * API key the user keeps in the trusted files.
 */

/**
 * The shape of a provider secret or setting outside the `KIBI_` namespace:
 * a vendor word, then a secret or setting suffix.
 */
export const WORKSPACE_PROVIDER_KEY =
  /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*_(?:API_KEY|KEY|TOKEN|SECRET|PASSWORD|MODEL|ORG|ORG_ID|ORGANIZATION|PROJECT|PROJECT_ID|REGION)$/;

/** `KIBI_` keys a workspace file may set: first-party provider settings. */
export const WORKSPACE_ALLOWED_KIBI_PREFIXES: readonly string[] = ["KIBI_JEV_"];

/**
 * Process-level variables a workspace file may not set, matched without
 * regard to case (Windows names are case-insensitive). They choose
 * executables, libraries, interpreter options, homes, temp and config
 * directories, shells, git behaviour or the network route.
 */
export const WORKSPACE_DENIED_PROCESS_KEYS: readonly string[] = [
  "APPDATA",
  "BASH_ENV",
  "BASHOPTS",
  "CDPATH",
  "COMSPEC",
  "EDITOR",
  "ELECTRON_RUN_AS_NODE",
  "ENV",
  "GCONV_PATH",
  "HOME",
  "HOMEDRIVE",
  "HOMEPATH",
  "IFS",
  "JAVA_TOOL_OPTIONS",
  "LOCALAPPDATA",
  "PAGER",
  "PATH",
  "PATHEXT",
  "PERL5LIB",
  "PERL5OPT",
  "PROGRAMDATA",
  "PROMPT_COMMAND",
  "PS4",
  "RUBYLIB",
  "RUBYOPT",
  "SHELL",
  "SHELLOPTS",
  "SWI_HOME_DIR",
  "SYSTEMROOT",
  "TEMP",
  "TMP",
  "TMPDIR",
  "USERPROFILE",
  "VISUAL",
  "WINDIR",
];

/** Prefixes of process-level variable families, matched without case. */
export const WORKSPACE_DENIED_PROCESS_PREFIXES: readonly string[] = [
  "ALL_PROXY",
  "BUN_",
  "DYLD_",
  "GIT_",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "LD_",
  "MALLOC_",
  "NO_PROXY",
  "NODE_",
  "NPM_CONFIG_",
  "PYTHON",
  "SSH_",
  "SSL_CERT_",
  "SWIPL",
  "XDG_",
];

const deniedProcessKeys = new Set(WORKSPACE_DENIED_PROCESS_KEYS);

/**
 * Whether `key` is a Kibi or process-level variable: the keys a workspace
 * file must not set that matter to Kibi, as opposed to an application's own
 * settings in a shared legacy `.env`.
 */
export function isKibiOrProcessEnvKey(key: string): boolean {
  const upper = key.toUpperCase();
  return (
    upper.startsWith("KIBI_") ||
    deniedProcessKeys.has(upper) ||
    WORKSPACE_DENIED_PROCESS_PREFIXES.some((prefix) => upper.startsWith(prefix))
  );
}

/** Whether a workspace env file may set `key`. */
export function isWorkspaceEnvKeyAllowed(key: string): boolean {
  const upper = key.toUpperCase();
  if (upper.startsWith("KIBI_")) {
    return WORKSPACE_ALLOWED_KIBI_PREFIXES.some((prefix) =>
      upper.startsWith(prefix),
    );
  }
  if (deniedProcessKeys.has(upper)) return false;
  if (
    WORKSPACE_DENIED_PROCESS_PREFIXES.some((prefix) => upper.startsWith(prefix))
  )
    return false;
  return WORKSPACE_PROVIDER_KEY.test(upper);
}
