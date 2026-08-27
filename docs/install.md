# Installation Guide

This document provides detailed installation instructions for kibi.

## Prerequisites

Kibi depends on **SWI-Prolog 9.0+**. You must have `swipl` installed and available in your `PATH` before installing kibi.

### Installing SWI-Prolog on Linux

#### Ubuntu (Recommended)

The official SWI-Prolog project provides a Personal Package Archive (PPA) for Ubuntu that stays current with every release. This is the recommended installation method for Ubuntu users.

```bash
sudo apt-get install software-properties-common
sudo apt-add-repository ppa:swi-prolog/stable
sudo apt-get update
sudo apt-get install swi-prolog
```

#### Other Linux Distributions

Official Linux distribution packages are often outdated. For other Linux distributions, please refer to the official SWI-Prolog documentation:

- [Unix/Linux installation guide](https://www.swi-prolog.org/build/unix.html) - Comprehensive instructions for building from source or using other methods
- [Stable downloads page](https://www.swi-prolog.org/download/stable) - Source archives and binaries
- [Flatpak](https://flathub.org/apps/org.swi_prolog.swipl) - Available for most Linux distributions

#### Verify SWI-Prolog Installation

After installation, verify that `swipl` is available:

```bash
swipl --version
```

You should see output like `SWI-Prolog version 10.x.x`.

## Installing kibi

### Recommended: Project-local install

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

The CLI and MCP server are peer agent-operation surfaces. MCP-capable hosts can call the public `kb_*` contracts directly; agents in trusted project-local shells can invoke the equivalent CLI JSON routes with `kibi <route> --input <file|->`. Neither path requires direct access to `.kb/**` files.

### First-run lifecycle

After installing the packages, use this short path:

1. Run `kibi init` to create repository infrastructure and Git hooks.
2. Ask your coding agent to “Bootstrap Kibi for this repository.” The agent calls the read-only `kb_plan_bootstrap` planner, asks only questions returned by a `needs_context` result, and shows the exact plan for approval.
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
stored. Codex resolves that path relative to the marketplace root.

The plugin's `.mcp.json` deliberately leaves `cwd` unset. Codex then launches
`npx --no-install kibi-mcp` from the active task workspace, so the MCP server
comes from the consumer project's local dependencies. Do not change this to
`cwd: "."`: that would run from the installed plugin cache instead. The manual
project-level MCP configuration below remains an independent fallback.

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
- `.mcp.json` MCP config pointing to your local `kibi-mcp` and inheriting the active task cwd
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

### Optional: Global install

Global install is convenient for interactive use across projects, but local install is preferred for reproducibility.

```bash
npm install -g kibi-cli kibi-mcp kibi-core
```

Optional Bun alternative:

```bash
bun add -g kibi-cli kibi-mcp kibi-core
```

#### Command Not Found

If you see "command not found" after installing kibi globally, you may need to adjust your `PATH`:

1. **Check global npm/bin location:**
   ```bash
   npm config get prefix
   ```
   The output shows where npm installs global packages.

2. **Add to PATH (if needed):**
   Add the global bin directory to your shell configuration:
   ```bash
   # For bash (in ~/.bashrc or ~/.bash_profile):
   export PATH="$PATH:/usr/local/bin"
   # For zsh (in ~/.zshrc):
   export PATH="$PATH:/home/$USER/.npm-global/bin"
   ```

3. **Reload your shell configuration:**
   ```bash
   source ~/.bashrc  # or source ~/.zshrc
   ```

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

If you encounter problems with SWI-Prolog:

- Refer to the [SWI-Prolog build documentation](https://www.swi-prolog.org/build/) for platform-specific guidance
- Check the [SWI-Prolog FAQ](https://www.swi-prolog.org/FAQ/)
- Report issues on the [SWI-Prolog forum](https://swi-prolog.discourse.group/)

## Next Steps

After installing kibi and verifying SWI-Prolog:

1. Verify your environment: `npm exec -- kibi doctor`
2. Initialize your project: `npm exec -- kibi init` (installs hooks by default and adds `.kb/` to `.gitignore`)
3. Import documentation: `npm exec -- kibi sync`
4. Explore the KB: `npm exec -- kibi search <query>`
5. Inspect branch freshness: `npm exec -- kibi status`
6. Validate integrity: `npm exec -- kibi check`

See [Entity Schema](entity-schema.md) for details on entity types and when to use each.
Example:

```bash
npm exec -- kibi doctor
npm exec -- kibi init
npm exec -- kibi sync
npm exec -- kibi search auth
npm exec -- kibi status
npm exec -- kibi check
```

For more details, see:
- [Quick Start](../README.md#quick-start) - Brief getting started guide
- [CLI Reference](cli-reference.md) - Complete command documentation
- [Troubleshooting](troubleshooting.md) - Recovery procedures
