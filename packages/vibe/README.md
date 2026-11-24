# kibi-vibe

Kibi plugin for **Mistral Vibe** (Agent Plugins 1.0 format). It bundles:

- the `kibi` MCP server (`kb_*` tools) through `mcp.json`, started by
  `bin/launch-kibi-mcp.mjs`;
- the canonical Kibi skills under `skills/` (mirrored from
  `packages/runtime/src/skills/` by `scripts/sync-agent-skills.ts --target vibe`,
  with a CI drift check via `bun run --filter kibi-vibe check:skills`);
- Vibe-native context hooks in `ai.mistral.vibe/hooks.toml`.

The base packages (`kibi-core`, `kibi-cli`, `kibi-mcp`) stay installed
project-locally in the consumer repository; this plugin does not replace them.

## Install

Copy or clone this directory into a Vibe plugins root:

```bash
# user scope (every project)
mkdir -p ~/.vibe/plugins && cp -r packages/vibe ~/.vibe/plugins/kibi
# project scope (requires a trusted folder)
mkdir -p .vibe/plugins && cp -r packages/vibe .vibe/plugins/kibi
```

Then restart Vibe (or run `/reload`) — MCP servers connect at session start.
The `kb_*` tools appear as `mcp_kibi.kb_search`, `mcp_kibi.kb_upsert`, and so
on; the bundled skills load as `kibi:<skill-id>` (for example
`kibi:kibi-usage`).

Without the plugin, register the server manually in `~/.vibe/config.toml`:

```toml
[[mcp_servers]]
name = "kibi"
transport = "stdio"
command = "node"
args = ["<path-to-this-package>/bin/launch-kibi-mcp.mjs"]
# Cold WSL boots on Windows can exceed the 10s default startup timeout:
startup_timeout_sec = 120
tool_timeout_sec = 300
```

Vibe spawns stdio servers with the plugin/session directory as cwd, not
necessarily the session folder. When registering manually for one project,
write that workspace into a `kibi-workspace.txt` file next to the launcher; for
several projects, set `KIBI_WORKSPACE` per project instead (see "Workspace
resolution" below: the pointer serves a single project).

## Runtime detection (Windows/WSL)

Kibi needs Node.js 22+ and SWI-Prolog 9+. On Windows the launchers in `bin/`
detect the workspace kind automatically — nothing is hardcoded:

- A drive-letter workspace (`C:\...`) runs **natively on Windows**: the
  project-local `kibi-mcp` / `kibi-cli` bin is spawned directly with the
  current Node, and SWI-Prolog comes from the bundled `kibi-swipl-win32-x64`
  runtime (or `KIBI_SWIPL` / a system `swipl`). No WSL probe runs at all.
- A `\\wsl.localhost\<distro>\...` (or `\\wsl$\...`) UNC workspace runs inside
  that distro: `bin/kibi-runtime.mjs` probes once per distro whether WSL has
  Node.js 22+ (a single `wsl.exe [-d <distro>] --exec ...` call with a
  constant probe script whose result lines carry a sentinel prefix, and which
  asks the Node.js it found for its version; the result is cached per user for
  120 s so hooks stay cheap), then `bin/launch-kibi-mcp.mjs` and `bin/kibi.mjs` spawn
  `wsl.exe -d <distro> --cd <wsl-path> --exec <wsl-node> <kibi-bin> [args...]`.
  Paths and arguments are passed as **literal argv entries, never as a shell
  string**, so no path can be shell-injected, and a failed path conversion is
  a hard error, never a silent `cd .`. When the distro has no usable Node.js
  22+ the launch fails with a message saying so, rather than running Windows
  Node.js against the distro's Linux `node_modules` (set `KIBI_FORCE_DIRECT=1`
  to do that on purpose).
- Escape hatches: `KIBI_FORCE_WSL=1` forces the WSL wrap even for drive-letter
  workspaces (drive-letter paths then go through
  `wsl.exe --exec wslpath -a <path>` against the default distro), and `KIBI_FORCE_DIRECT=1` forces a native spawn even for
  UNC workspaces (Windows reads `\\wsl.localhost` paths natively).

`--no-install`-style resolution matters: the launcher starts the `kibi-mcp`
already installed in the project's `node_modules` and never downloads a
package at launch. The host name reported to the server comes from
`KIBI_MCP_HOST` (default `vibe`, set in `mcp.json`); on WSL the variable
crosses via `WSLENV` (with `/p` path translation for the workspace variables).
This launcher is Vibe's; the other agent hosts ship their own.

Startup budget: Vibe waits `startup_timeout_sec` (default 10s) for a stdio
server to answer `initialize`. A cold WSL boot can exceed that, so when
registering the server manually set `startup_timeout_sec = 120` (and
`tool_timeout_sec = 300` for the first `kb_check`, which consults
SWI-Prolog). The plugin `mcp.json` schema has no timeout keys, so
plugin-spawned servers use the host default; on Windows with a cold WSL,
prefer the manual `config.toml` route above.

## Workspace resolution and the silent fallback

Hosts do not always spawn MCP servers or hooks with the session folder as
cwd. `resolveWorkspace()` resolves the workspace in this order:

1. `KIBI_WORKSPACE`, then `KIBI_PROJECT_ROOT`, then `KIBI_ROOT` (trimmed and
   resolved);
2. the cwd, walked upward to the nearest ancestor owning `.kb/manifest.json` —
   the walk stops at a `.git` boundary so unrelated enclosing repositories
   never leak in;
3. a `kibi-workspace.txt` pointer file next to the launcher (one line, absolute
   or launcher-relative). **It is a single-project, last-resort fallback**: it
   names one workspace for every session that reaches it, so use it only for a
   plugin copy dedicated to that project, and set `KIBI_WORKSPACE` per project
   to serve several. It points a cwd that is outside any Git repository, or
   inside the repository that holds the launcher, at that workspace, which is
   what makes hosts that spawn from a foreign directory work. A cwd inside
   another Git repository without a KB is never redirected, so hooks in other
   projects keep their own folder. Write e.g.
   `\\wsl.localhost\Ubuntu-22.04\home\you\kibi` into
   `kibi-workspace.txt` beside your copied `bin/launch-kibi-mcp.mjs`;
4. the cwd unchanged.

The launcher does not read the client's MCP `roots/list`. It starts the real
`kibi-mcp` as a child that owns stdio, and a roots request cannot be answered
before that child exists, nor before the client has finished the handshake
(MCP servers must not send requests until then); the workspace is therefore
fixed at spawn time by the order above. In a direct (non-WSL) launch the
server it starts is still attached to that workspace only as a default:
`kibi-mcp` answers each call from the Kibi workspace under the client's
declared roots when they name one, and says so (`workspace_mismatch`) when it
falls back. A WSL launch pins the server to the resolved workspace.

A workspace without `.kb/manifest.json` is not a Kibi workspace: the MCP
launcher then serves a **silent zero-tool MCP server** and exits 0 (the host
never shows "MCP failed to connect"), and `bin/kibi.mjs` exits with code 3
before spawning anything, so hooks stay silent outside Kibi repos. The same
silent server, with an `instructions` hint, is served when a configured
workspace's `kibi-mcp` cannot be started.

Diagnosis is opt-in: set `KIBI_VIBE_LAUNCHER_DEBUG=1` to append one JSON line
per launch to a per-user, `0600` log file (`kibi-vibe-launcher.log-<user>` in
the OS temp dir). The same variable lets the hooks' child processes print to
stderr; without it they stay silent.

## Hooks

`ai.mistral.vibe/hooks.toml` ships three fail-open hooks (they run with the
plugin root as their process cwd and read the session folder from the `cwd`
field of the stdin payload; paths are matched against the resolved workspace
root, so sessions started in a subdirectory still match):

| Hook | Type | What it does |
| --- | --- | --- |
| `kibi-session-context` | `session_start` | summarizes the attached KB (branch, freshness) into the session |
| `kibi-prompt-context` | `pre_agent` | searches the KB for the prompt and injects the top entities as context |
| `kibi-file-context` | `post_tool` (`read_file`/`edit`/`write_file`/`search_replace`) | appends the Kibi entities linked to the file just read or written |

The hooks also run the decision guard the other Kibi adapters share
(`src/guard.ts`, bundled with kibi-agent-core into `bin/hooks/kibi-guard.mjs`):
the session start names missing Kibi git hooks; a prompt that states a rule
gets the rule note, with the person's reason when the prompt gives one; and
after an edit of code that implements a firm requirement, the context names
that requirement once per session and asks the agent to undo an edit that
breaks it unless the person agrees (Vibe has no pre-tool hook, so the notice
follows the edit; `KIBI_CONFIRM_FIRM_EDITS=0` turns it off). The first source
edit after a rule prompt gets the rule-capture template. Session markers live
in a per-user directory in the OS temp dir (`KIBI_VIBE_STATE_DIR` overrides
it).

Hook scripts call the CLI through `bin/kibi.mjs`, so they use the same
automatic runtime detection. They need a host `node` (>= 22) on `PATH`; the
Kibi processes themselves may still run inside WSL. Any failure exits 0 with
no output on stdout or stderr — a broken hook never blocks the session
(`KIBI_VIBE_LAUNCHER_DEBUG=1` lets the failure's stderr through).

A relative tool path (for example `src/a.ts`) is resolved against the `cwd` of
the hook payload, the folder the tool ran in, not the hook's own directory.

## Development

```bash
bun run build:vibe        # bundles bin/hooks/kibi-guard.mjs, syntax-checks bin/ and regenerates the skills mirror
bun run typecheck:vibe    # tsc --noEmit over bin/ and tests/ (checkJs)
bun test ./packages/vibe/tests/runtime.test.mjs   # fast unit tests (root test batch)
node --test packages/vibe/tests/*.test.mjs       # all tests incl. the MCP handshake contract
bun run --filter kibi-vibe check:skills            # CI drift check for the skills mirror
bun run --filter kibi-vibe check:hook-bundle       # CI drift check for the bundled guard
```

The tests import the built output of `kibi-agent-core`, so build it first
(`bun run build:agent-core`, or `bun run build`) before running
`node --test packages/vibe/tests/`.

The long-running MCP handshake contract
(`tests/launcher-contract.test.mjs`) runs as a proof step
(`proof/steps/TEST-vibe-plugin-contract-v1.json`), not in the 15s unit-test
batch.
