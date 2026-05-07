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

For a reproducible, CI-friendly workflow, install kibi as project-level dev dependencies:

```bash
npm install --save-dev kibi-cli kibi-mcp
```

After installation, verify the tools from the local project using `npx`:

```bash
npx kibi --version
npx kibi-mcp --help
```

Common environment check: `npx kibi doctor`.

Validation command: `npx kibi check`.

### OpenCode MCP

For OpenCode, add a local MCP server in `opencode.json`. OpenCode uses a token-array `command` field:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "kibi": {
      "type": "local",
      "command": ["npx", "-y", "kibi-mcp"],
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
      "args": ["-y", "kibi-mcp"]
    }
  }
}
```

### Optional: Global install

Global install is convenient for interactive use across projects, but local install is preferred for reproducibility.

```bash
npm install -g kibi-cli kibi-mcp
```

Optional Bun alternative:

```bash
bun add -g kibi-cli kibi-mcp
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

## Development / dogfood workflow for this repository

For contributors to this repository only:

This repository uses local built `kibi-mcp` and `kibi-opencode` artifacts in its OpenCode setup. After changing package versions or local package wiring, rebuild before testing or using OpenCode here:

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

1. Verify your environment: `npx kibi doctor`
2. Initialize your project: `npx kibi init` (installs hooks by default and adds `.kb/` + `.kb/briefs/` to `.gitignore`)
3. Import documentation: `npx kibi sync`
4. Explore the KB: `npx kibi search <query>`
5. Inspect branch freshness: `npx kibi status`
6. Validate integrity: `npx kibi check`

See [Entity Schema](entity-schema.md) for details on entity types and when to use each.
Example:

```bash
npx kibi doctor
npx kibi init
npx kibi sync
npx kibi search auth
npx kibi status
npx kibi check
```

For more details, see:
- [Quick Start](../README.md#quick-start) - Brief getting started guide
- [CLI Reference](cli-reference.md) - Complete command documentation
- [Troubleshooting](troubleshooting.md) - Recovery procedures
