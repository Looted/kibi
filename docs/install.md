# Installation Guide

## Prerequisites

Kibi needs **Node.js 22+** for the CLI, MCP server, and engine. It also needs **SWI-Prolog 9.0+**, and on supported platforms that comes with Kibi: you install nothing extra.

### Bundled SWI-Prolog

`kibi-cli` (and `kibi-runtime`, which `kibi-mcp` uses) depend on `kibi-swipl`, which lists one platform package per target as an optional dependency. Your package manager installs only the one that matches your machine:

| Platform | Package | Requirement |
| --- | --- | --- |
| Linux x64 | `kibi-swipl-linux-x64-gnu` | glibc 2.28 or newer (for example Debian 10+, Ubuntu 20.04+, RHEL 8+) |
| Linux arm64 | `kibi-swipl-linux-arm64-gnu` | glibc 2.28 or newer |
| macOS arm64 (Apple silicon) | `kibi-swipl-darwin-arm64` | macOS 12 or newer |
| macOS x64 (Intel) | `kibi-swipl-darwin-x64` | macOS 12 or newer |

On these platforms `npm install --save-dev kibi-cli kibi-mcp kibi-core` followed by `kibi init` works on a machine with no SWI-Prolog at all. The build is relocatable, ships its own libraries and licenses, and is tested with the same Prolog suites Kibi's own CI runs.

Not covered by a bundled build: Alpine and other musl-based Linux, and native Windows. On Windows, run Kibi inside WSL (a glibc distribution uses the bundled build); otherwise install SWI-Prolog yourself as described below.

### Which SWI-Prolog Kibi uses

Kibi picks a SWI-Prolog in this order and uses the first that works:

1. `KIBI_SWIPL=<absolute path>`: that executable, which must be SWI-Prolog 9.0 or newer. An invalid value is an error, never a silent fallback.
2. The bundled platform package, after Kibi verifies its manifest and the binary's SHA-256.
3. `swipl` on your `PATH`, which must be 9.0 or newer.
4. Otherwise Kibi stops with an error that names your platform, the platform package that would have covered it, and the install command for your OS.

When both a bundled build and a system `swipl` exist, the bundled build wins, so a project behaves the same on every machine that installs the same packages. To use the system install instead, set `KIBI_SWIPL=system`, which skips the bundle and uses `swipl` from `PATH`:

```bash
KIBI_SWIPL=system npm exec -- kibi doctor
KIBI_SWIPL=/opt/swipl/bin/swipl npm exec -- kibi doctor
```

`kibi doctor` shows what was chosen: the `SWI-Prolog` check reports the source (`bundled`, `KIBI_SWIPL`, or `PATH`), the executable's path and version, and loads every library Kibi needs, so a SWI-Prolog build that lacks one (for example a minimal `swi-prolog-nox` package) fails there rather than in the middle of a command. With `--format json` the same facts appear as `details.source`, `details.path`, and `details.version`.

#### If the bundled runtime is missing

The platform packages are optional dependencies, so an install can leave them out without failing. `kibi doctor` and the first command that needs Prolog then name the package to add:

```bash
npm install --save-dev kibi-swipl-linux-x64-gnu   # the package for your platform
```

The usual causes:

- Installing with `--omit=optional` or `--no-optional` (or `npm_config_omit=optional`, `optional=false`). Install without it.
- pnpm `supportedArchitectures` (in `pnpm-workspace.yaml` or `package.json`) that does not include your platform, for example a Docker build that fixes `os`/`cpu` to another machine. Add your platform to it, or build the image for the platform it runs on.
- Installing on one platform and running on another (copying `node_modules` from macOS into a Linux container, or the reverse). Install on the machine, or in the image, that runs Kibi.
- An Alpine/musl or Windows host, which has no bundled build; see below.

### Installing SWI-Prolog yourself

Do this on platforms with no bundled build, or when you want Kibi to use a system install through `KIBI_SWIPL=system` or `KIBI_SWIPL=<path>`. Kibi needs SWI-Prolog **9.0 or newer** with its standard libraries (`semweb`, `pcre`, `crypto`, `http/json`, `chr`, and others, all in a normal full install).

#### Ubuntu (Recommended)

The official SWI-Prolog project provides a Personal Package Archive (PPA) for Ubuntu that stays current with every release.

```bash
sudo apt-get install software-properties-common
sudo apt-add-repository ppa:swi-prolog/stable
sudo apt-get update
sudo apt-get install swi-prolog
```

#### Other Linux Distributions

Official Linux distribution packages are often outdated. For other Linux distributions, including Alpine, please refer to the official SWI-Prolog documentation:

- [Unix/Linux installation guide](https://www.swi-prolog.org/build/unix.html) - Comprehensive instructions for building from source or using other methods
- [Stable downloads page](https://www.swi-prolog.org/download/stable) - Source archives and binaries
- [Flatpak](https://flathub.org/apps/org.swi_prolog.swipl) - Available for most Linux distributions

#### macOS

```bash
brew install swi-prolog
```

#### Windows

Use the installer from the [stable downloads page](https://www.swi-prolog.org/download/stable) and let it add `swipl` to your `PATH`, or set `KIBI_SWIPL` to the full path of `swipl.exe`. Alternatively run Kibi inside WSL, which uses the bundled build and needs no SWI-Prolog install.

#### Verify a system install

```bash
swipl --version
```

You should see output like `SWI-Prolog version 10.x.x`.

## Installing kibi

### Recommended: Agent-led setup

Kibi is operated by your coding agent, so the recommended install is a prompt. Paste this into Claude Code, Cursor, Codex, OpenCode, or any coding agent that can run commands in your repository:

```prompt
Set up Kibi (https://github.com/Looted/kibi) in this repository, then bootstrap its knowledge base.

1. Install: confirm Node.js 22+ is available. With the package manager this repository already uses, add kibi-core, kibi-cli and kibi-mcp as dev dependencies. Do not skip optional dependencies; the bundled SWI-Prolog runtime is one.
2. Initialize: run every `kibi` command through the package manager's local runner (npm: `npm exec -- kibi <command>`). Run `kibi init`; if it reports a problem, run `kibi doctor` and fix what it names. If this platform has no bundled SWI-Prolog, tell me what to install and stop.
3. Connect: register the project-local `kibi-mcp` server for the agent host you are running in, following https://looted.github.io/kibi/guide/connect-an-agent.html. Prefer project-scoped configuration, and ask me before installing a plugin or changing global settings. Until the kb_* tools are visible to you, use Kibi's CLI JSON routes instead.
4. Bootstrap: run `kibi skills load kibi-bootstrap --format markdown` and follow that skill exactly. It starts by asking me where product intent lives outside the code (issue trackers, wikis, specs) and which sources to trust; read them through the connectors you have and cite them. Show me the complete plan and its hash, and write nothing until I approve it.
5. Verify: run `kibi check` and `kibi status`, fix anything they report, and summarize what was added. Do not commit; I will review the changes.
```

The agent picks your package manager, installs the three packages project-locally, runs `kibi init`, registers the `kibi-mcp` server for its own host, and runs the [bootstrap workflow](#first-run-lifecycle). It writes no product knowledge until you approve the plan, and it leaves the changes uncommitted for your review. The rest of this section is the manual route, and the reference for what the agent does.

<details>
<summary>Manual installation</summary>

### Manual: Project-local install

For a reproducible, CI-friendly workflow, install kibi as project-level dev
dependencies. Use your project's package manager; npm is shown as the Node
baseline:

```bash
npm install --save-dev kibi-cli kibi-mcp kibi-core
```

Equivalent project-local installs:

```bash
pnpm add -D kibi-cli kibi-mcp kibi-core
yarn add -D kibi-cli kibi-mcp kibi-core
bun add -d kibi-cli kibi-mcp kibi-core
```

`kibi-mcp` depends on compatible `kibi-cli` and `kibi-core` versions, but
installing all three explicitly makes version pinning and lockfile review clear.

After installation, verify the tools from the local project using your package
manager's local binary runner:

```bash
npm exec -- kibi --version
npx --no-install kibi-mcp --help
```

For other package managers, use the same local-runner pattern:

| Package manager | CLI example | MCP example |
| --- | --- | --- |
| npm | `npm exec -- kibi status` | `npx --no-install kibi-mcp` |
| pnpm | `pnpm exec kibi status` | `pnpm exec kibi-mcp` |
| Yarn | `yarn exec kibi status` | `yarn exec kibi-mcp` |

Common environment check: `npm exec -- kibi doctor` (optional troubleshooting after initialization).

Validation command: `npm exec -- kibi check`.

</details>

The CLI and MCP server are peer agent-operation surfaces. MCP-capable hosts can call the public `kb_*` contracts directly; agents in trusted project-local shells can invoke the equivalent CLI JSON routes with `kibi <route> --input <file|->`. Neither path requires direct access to `.kb/**` files.

### First-run lifecycle

After installing the packages, use this short path:

1. Run `kibi init` to create repository infrastructure and Git hooks.
2. Ask your coding agent to “Bootstrap Kibi for this repository.” The agent first asks where product intent lives outside the code (issue trackers, wikis, specs) and which of those sources are authoritative, reads them through its own connectors, and passes cited intent claims to the read-only `kb_plan_bootstrap` planner. After that it asks only questions returned by a `needs_context` result, and shows the exact plan for approval.
3. After approval, the agent passes the unchanged returned plan to `kb_apply_plan`, then runs `kb_check` and `kb_status`.
4. Continue normal work with the seeded Kibi context. Use `kibi doctor` only when typed status says infrastructure is degraded.

Avoid auto-install or hot-load commands for MCP startup (`npx -y`, `pnpm dlx` /
`pnx`, or `yarn dlx`) unless you intentionally
want the client to fetch a package outside the project lockfile.

### OpenCode MCP

For OpenCode, add a local MCP server in `opencode.json`. OpenCode uses a token-array `command` field. This npm example is local-only and does not download packages at startup:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "kibi": {
      "type": "local",
      "command": ["npx", "--no-install", "kibi-mcp"],
      "enabled": true
    }
  }
}
```

If your project uses another package manager, keep the same MCP shape and use
that manager's local binary runner. For example, pnpm projects can use:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "kibi": {
      "type": "local",
      "command": ["pnpm", "exec", "kibi-mcp"],
      "enabled": true
    }
  }
}
```

### VS Code MCP

For VS Code, create `.vscode/mcp.json`. VS Code uses a `command` string with a separate `args` array:

```json
{
  "servers": {
    "kibi": {
      "type": "stdio",
      "command": "npx",
      "args": ["--no-install", "kibi-mcp"]
    }
  }
}
```

If you use pnpm, replace `"command": "npx"` and `"args"` with:

```json
{
  "servers": {
    "kibi": {
      "type": "stdio",
      "command": "pnpm",
      "args": ["exec", "kibi-mcp"]
    }
  }
}
```

### Optional: OpenCode plugin

`kibi-opencode` is an optional OpenCode plugin. It injects Kibi guidance,
provides the `/kibi-bootstrap` convenience command when the host supports it, and runs
background sync/check maintenance. Canonical bootstrap behavior lives in the
bundled `kibi-bootstrap` skill (`kb_plan_bootstrap`, preview, apply via the approved plan).
Generic MCP agents should start from
[generic-agent onboarding](generic-agent-onboarding.md). The plugin does **not**
ship a replacement `kibi` or `kibi-mcp` binary, so keep the base `kibi-cli`,
`kibi-mcp`, and `kibi-core` packages installed and keep the `mcp.kibi` server
configured separately.

```bash
npm install --save-dev kibi-opencode
```

```json
{
  "plugin": ["kibi-opencode"]
}
```

The OpenCode plugin auto-updates itself by default on OpenCode startup. This
only refreshes OpenCode's cached `kibi-opencode` package; it does not update
your project-local `kibi-cli`, `kibi-mcp`, or `kibi-core` dependencies. To lock
the plugin, use an exact semver entry in the plugin array:

```json
{
  "plugin": ["kibi-opencode@0.18.1"]
}
```

Set `autoUpdate: false` in `.opencode/kibi.json` or
`~/.config/opencode/kibi.json` to disable the startup updater entirely.

The plugin's internal maintenance expects a `kibi` CLI command to be available
from the project context or `PATH`; the canonical setup above satisfies that by
installing `kibi-cli` project-locally.

### Optional: Codex plugin

`kibi-codex` is an optional adapter that gives Codex users prepackaged Kibi skills,
hooks, and MCP configuration. It builds on `kibi-core`, `kibi-cli`, and `kibi-mcp` and does not replace them.

Install through the repo-scoped Kibi marketplace:

```bash
codex plugin marketplace add Looted/kibi
codex
```

Then run `/plugins`, choose **Kibi Plugins**, and install `kibi-codex`.

The marketplace lives at `.agents/plugins/marketplace.json` and points Codex at
`./packages/codex`, where the plugin manifest, skills, hooks, and MCP config are
stored. Codex resolves that path relative to the marketplace root. Local
marketplace installs copy the plugin directory as-is. The committed
`bin/hook-runner.mjs` makes lifecycle hooks work from an unbuilt source
checkout; run `bun run build:codex` when you also need refreshed generated
skills or MCP configuration. (Packed npm installs run the build automatically
via `prepack`.)

#### Workspace opt-in rule

The plugin may be installed and enabled globally, but it only activates in
workspaces that opted into Kibi:

- A workspace is opted in when its Kibi project root owns `.kb/manifest.json`
  (the manifest `kibi init` creates). Installing the plugin, having `kibi-mcp`
  on `PATH`, or enabling the plugin in `~/.codex/config.toml` never counts.
- Project-root resolution honors the standard `KIBI_WORKSPACE`,
  `KIBI_PROJECT_ROOT`, and `KIBI_ROOT` environment overrides, then walks up
  from the session directory and stops at the first `.kb/manifest.json`
  (opted in) or `.git` boundary (not opted in). Subdirectories of an opted-in
  repository map to that repository; a Git worktree is evaluated by its own
  root and never inherits the main checkout's state; an unrelated enclosing
  repository never leaks opt-in into a nested project.
- In unconfigured workspaces every hook exits successfully and silently —
  no bootstrap prompts, no edit tracking, no reminders, no state writes — and
  the MCP server starts with an empty tool catalog. Nothing is initialized or
  written unless you explicitly ask for it (`kibi init` or the kibi-bootstrap
  skill).
- In opted-in workspaces the plugin behaves as before: hooks warn about direct
  `.kb` edits, track changed paths, and surface freshness/impact reminders at
  session stop, scoped to the workspace they were generated in, so activity in
  one project cannot generate reminders in another.

#### Codex host limitations and the MCP launcher

Codex (verified against `codex-cli 0.153.4`) has no workspace-scoped or
content-conditional activation for plugins or their MCP servers: plugin
enablement is global, and legacy `.codex-plugin` MCP entries support no
placeholder expansion or plugin-root environment. To keep non-Kibi workspaces
free of MCP startup errors, the plugin's `.mcp.json` therefore inlines a
launcher (`node -e`, built from `packages/codex/bin/mcp-launcher.cjs`) that:

- resolves the workspace from the active session cwd and the opt-in rule above;
- serves a silent MCP server with zero tools in unconfigured workspaces;
- probes and proxies the project-local `kibi-mcp` (`npx --no-install
  kibi-mcp`, exactly the previous config) in opted-in workspaces, with
  `KIBI_WORKSPACE` set to the resolved root;
- starts cleanly with a guidance message when an opted-in workspace has no
  resolvable `kibi-mcp` executable — the MCP handshake still succeeds, so no
  startup error is reported.

The launcher is a supported stdio server from Codex's point of view; it simply
stays empty unless the workspace opted in.

For local development or npm package smoke testing, you can also install the
adapter package with your project-local dependencies:

```bash
npm install --save-dev kibi-codex
```

The official OpenAI Plugin Directory does not currently provide self-serve public
plugin publishing. Use the repo marketplace or a local plugin fixture while
developing/testing.

The installed plugin package contributes:

- `.codex-plugin/plugin.json` manifest
- `.mcp.json` MCP config with the inline workspace-opt-in launcher
- `hooks/hooks.json` lifecycle hooks
- `skills/*/SKILL.md` Kibi workflow guidance

Review hook trust policy before enabling automatic trust:

- confirm the plugin source and hook paths are expected in your environment
- review local trust settings if your Codex host requires explicit plugin trust
- prefer warning-only behavior and disable automatic trust for unvetted sources

Manual MCP fallback (no plugin install required): keep base dependencies and configure
your Codex MCP client directly:

```toml
[mcp_servers.kibi]
command = "npx"
args = ["--no-install", "kibi-mcp"]
```

This fallback is supported for teams that do not use the adapter package.

### Optional: Cursor plugin

`kibi-cursor` is an optional adapter that gives Cursor users prepackaged Kibi rules,
skills, commands, MCP configuration, and advisory editor hooks. It builds on
`kibi-core`, `kibi-cli`, and `kibi-mcp` and does not replace them.

Install from the repo marketplace at `.cursor-plugin/marketplace.json`, which points
at `./plugins/kibi-cursor`. For local development, copy the built plugin into
Cursor's user-plugins directory (symlinks are rejected on WSL):

```bash
./scripts/sync-cursor-plugin-local.sh
```

On WSL workspaces, Cursor reads `~/.cursor/plugins/local` in your Linux home.
Restart Cursor or run **Developer: Reload Window**, then check **Plugins → User**.

You can also install the npm package for smoke testing:

```bash
npm install --save-dev kibi-cursor
```

The installed plugin package contributes:

- `.cursor-plugin/plugin.json` manifest
- `mcp.json` MCP config with a launcher that resolves and starts the `kibi-mcp` installed in the opened project
- `hooks/hooks.json` advisory lifecycle hooks
- `rules/*.mdc` workflow and traceability guidance
- `skills/*/SKILL.md` Kibi workflow skills
- `commands/kibi-bootstrap.md` bootstrap command guidance

The plugin launcher runs the consumer project's `kibi-mcp` with the opened
workspace as its current directory and with `KIBI_WORKSPACE` set to that root.
It does not download, bundle, or use a global Kibi runtime. Install the base
packages in each project before enabling the plugin MCP server.

Manual MCP fallback (no plugin install required):

```json
{
  "mcpServers": {
    "kibi": {
      "command": "npx",
      "args": ["--no-install", "kibi-mcp"]
    }
  }
}
```

See [Cursor Plugins](https://cursor.com/docs/plugins) and `packages/cursor/README.md`
for hook behavior and local testing details.

### Optional: ZCode plugin

`kibi-zcode` is an optional adapter that gives ZCode users prepackaged Kibi skills,
a `/kibi-bootstrap` command, advisory lifecycle hooks, and MCP configuration. It
builds on `kibi-core`, `kibi-cli`, and `kibi-mcp` and does not replace them.

Local ZCode development, package builds, and tests currently use Linux/WSL.
The launcher retains shell-free runtime handling for Windows npm shims.

Install through the repo marketplace from a **locally built checkout**:

1. Clone this repository and run `bun run build:zcode` in it. A marketplace
   install from a local directory copies the plugin directory as-is, and an
   install from a tree without a build is missing `dist/hook-runner.js`, so
   every lifecycle hook fails to start.
2. In ZCode, open **Settings → Plugin Management → Discover**, use the **`+`**
   button, choose **local directory**, and select the repository root — the
   directory that contains `.claude-plugin/marketplace.json` (the manifest
   points ZCode at `./packages/zcode`).
3. Install `kibi-zcode` from the **Kibi** marketplace. New installs are
   enabled by default.

> **GitHub-source installs are not supported.** Adding `Looted/kibi` as a
> GitHub marketplace cannot work today: the plugin's `dist/hook-runner.js` is
> generated by the build and is not committed, so a GitHub-sourced copy has no
> hook runner. This route stays unsupported until a built remote distribution
> exists. Note that `prepack` (the automatic build for packed npm installs)
> runs only for `npm pack`/`npm install kibi-zcode` packaging flows — ZCode's
> marketplace copy never builds anything.

The installed plugin package contributes:

- `.zcode-plugin/plugin.json` manifest with the inline `mcpServers` entry
- `bin/mcp-launcher.cjs` workspace-gated MCP launcher (resolves kibi-mcp
  shell-free: the project-local package entry through Node's own resolution,
  then a PATH lookup, with the Windows npm-shim layout handled without a
  command interpreter)
- `hooks/hooks.json` advisory lifecycle hooks (`SessionStart`, `PreToolUse`,
  `PostToolUse`, `Stop`)
- `skills/*/SKILL.md` Kibi workflow skills (frontmatter rewritten for ZCode's
  skill loader; bodies and resources are byte-identical to the canonical
  bundled skills)
- `commands/kibi-bootstrap.md` slash command that routes into the
  `kibi-bootstrap` skill

The plugin follows the same workspace opt-in rule as the Codex adapter: hooks
and the MCP launcher stay completely silent in workspaces whose Kibi project
root does not own `.kb/manifest.json`. In opted-in workspaces, the MCP launcher
proxies the resolved `kibi-mcp` with `KIBI_WORKSPACE` set, and hooks are
advisory only — they warn about direct `.kb` edits, track file mutations per
host session (read-only tool calls never count as changes, and a later edit
invalidates an earlier impact check for that path), and surface
freshness/impact reminders at session stop with workspace-relative paths. The
hard enforcement gate remains the `kibi check --staged` git hook installed by
`kibi init`.

Manual MCP fallback (no plugin install required):

```json
{
  "mcpServers": {
    "kibi": {
      "command": "npx",
      "args": ["--no-install", "kibi-mcp"]
    }
  }
}
```

See `packages/zcode/README.md` for the ZCode declaration contract the plugin
targets (hook events, output schema, skill frontmatter rules).

### Optional: Claude Code plugin

`kibi-claude` is an optional Claude Code adapter. It builds on `kibi-core`,
`kibi-cli`, and `kibi-mcp` and does not replace them. It contributes:

- the workspace-gated Kibi MCP server;
- the four bundled Kibi skills, invoked as `/kibi-claude:kibi-usage`,
  `/kibi-claude:kibi-bootstrap`, and so on;
- advisory hooks that show the agent requirement and test context before it
  reads or edits linked code, and remind it once to run an impact check
  before finishing.

The repository root is a Claude Code marketplace, and the hook runner is a
committed self-contained bundle, so a GitHub install needs no build:

```bash
claude plugin marketplace add Looted/kibi
```

```bash
claude plugin install kibi-claude@kibi
```

To try a local checkout without installing, run
`claude --plugin-dir packages/claude` from a Kibi workspace.

The plugin follows the same workspace opt-in rule as the Codex and ZCode
adapters: hooks and the MCP launcher stay completely silent in workspaces
whose project root does not own `.kb/manifest.json`. Hooks read a cached
index of `.kb/symbols.yaml` instead of calling the CLI, so they add tens of
milliseconds per tool call. The hard enforcement gate remains the
`kibi check --staged` git hook installed by `kibi init`. See
`packages/claude/README.md` for exactly what each hook emits and how often.

### Optional capability plugins

Builtin classification, ontology matching, and symbol extraction need no plugin configuration. Installing an optional package does not activate it.

```text
install package → explicitly activate in package.json → provide required secret/environment → restart long-lived Kibi MCP/client runtime
```

`kibi-plugin-jev` is the optional TypeSafe semantic classifier. It is not part of the default Kibi install.

```bash
npm install --save-dev kibi-plugin-jev
```

```json
{
  "kibi": {
    "plugins": [
      {
        "package": "kibi-plugin-jev",
        "capabilities": {
          "kibi.semantic-classifier.v1": {
            "mode": "augment"
          }
        }
      }
    ]
  }
}
```

Set provider secrets through Kibi-owned env files (same resolution for every
harness that starts `kibi` / `kibi-mcp` — no Cursor/OpenCode/Codex/ZCode-specific
secret config is required):

```bash
mkdir -p ~/.config/kibi
printf '%s\n' 'TYPESAFE_API_KEY=...' >> ~/.config/kibi/env
```

Optional project override: `<workspace>/.env.kibi`. Existing process environment
variables always win. `KIBI_ENV_FILE` replaces the project file path. A legacy
`<workspace>/.env` is still loaded for compatibility to fill remaining gaps, but
is not preferred (it can pull unrelated app secrets into Kibi). Restart
long-running MCP or host processes after changing env files. Do not put secrets
in `package.json`.

Optional settings:

| Variable | Role |
| --- | --- |
| `KIBI_JEV_MODEL` | Model id. Empty is unset. Default `jev-latest`. |
| `KIBI_JEV_TIMEOUT_MS` | Positive integer timeout in milliseconds, at most 120000. A malformed value fails activation with a provider diagnostic. |

Modes:

```text
augment — builtin handles normal cases; external provider helps unresolved/ambiguous cases
replace — configured provider owns the capability; builtin is only failure fallback
shadow — provider runs for comparison but cannot affect canonical output
```

Removing the `kibi.plugins` entry disables the plugin. Restart long-running MCP or host processes after plugin configuration changes. Activating a third-party package grants that package code-execution trust. `permissions` metadata is disclosure, not sandbox enforcement.

`kibi doctor` lists configured packages, capabilities, modes, and dependency declaration without importing plugin packages. For first-party Jev it also reports secret source labels (`process` / `project_env` / `user_env` / `legacy_env` / `missing`) without values, plus effective model and timeout from env. It fails when a known first-party plugin secret is missing. Legacy `.env` sources get a migration hint. Deeper authoring rules live in [plugin-development.md](./plugin-development.md).

### Optional: Global install

Global install is convenient for interactive use across projects, but local install is preferred for reproducibility.

```bash
npm install -g kibi-cli kibi-mcp kibi-core
```

Optional Bun alternative:

```bash
bun add -g kibi-cli kibi-mcp kibi-core
```

If `kibi` is not found afterwards, add the directory printed by `npm config get prefix` (plus `/bin` on macOS and Linux) to your `PATH`.

## Local checkout workflow

When a workspace is intentionally configured to run Kibi from a local checkout,
invoke that checkout's wrapper or binary directly. Do not use `pnpm exec
kibi-mcp` in an application repository unless you intend to run that
repository's installed `node_modules` version. After changing package versions
or local package wiring in a checkout used by another workspace, rebuild before
testing or using OpenCode with those local artifacts:

```bash
bun run build
```

## Troubleshooting Installation

### SWI-Prolog Issues

Start with `npm exec -- kibi doctor`: it reports which SWI-Prolog Kibi chose, from where, and whether every required library loads.

- `could not find a usable SWI-Prolog`: the message names your platform and the platform package that should have supplied it. Add that package (see [If the bundled runtime is missing](#if-the-bundled-runtime-is-missing)), or install SWI-Prolog 9.0+ and put `swipl` on `PATH`, or set `KIBI_SWIPL`.
- `The bundled SWI-Prolog package ... is damaged`: reinstall the platform package, or set `KIBI_SWIPL=system` to use `swipl` from `PATH` meanwhile.
- `KIBI_SWIPL=... is not an executable file` (or is too old): `KIBI_SWIPL` must be the absolute path of a SWI-Prolog 9.0+ executable, or `system`. Unset it to use the bundled build.
- A system SWI-Prolog is installed but ignored: that is the default when the bundled package is present. Set `KIBI_SWIPL=system` to prefer `swipl` from `PATH`.

If you need help with SWI-Prolog itself:

- Refer to the [SWI-Prolog build documentation](https://www.swi-prolog.org/build/) for platform-specific guidance
- Check the [SWI-Prolog FAQ](https://www.swi-prolog.org/FAQ/)
- Report issues on the [SWI-Prolog forum](https://swi-prolog.discourse.group/)

## Next Steps

1. Paste the [agent setup prompt](#recommended-agent-led-setup) into your coding agent. It covers steps 2 to 4.
2. Check the environment: `npm exec -- kibi doctor`
3. Initialize the repository: `npm exec -- kibi init`
4. [Connect your coding agent](../docs-site/content/connect-an-agent.md) and ask it to "Bootstrap Kibi for this repository."
5. Open the health report: `npm exec -- kibi report --open`

The [CLI reference](cli-reference.md) documents every command, and [Troubleshooting](troubleshooting.md) covers recovery.
