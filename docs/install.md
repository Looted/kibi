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

### Using npm (Primary)

Install the kibi CLI and MCP server globally using npm:

```bash
npm install -g kibi-cli kibi-mcp
```

### Using bun (Alternative)

If you prefer bun as your package manager:

```bash
bun add -g kibi-cli kibi-mcp
```

### Verify kibi Installation

After installation, verify that both tools are available:

```bash
kibi --version
kibi-mcp --help
```

## Troubleshooting Installation

### Command Not Found

If you see "command not found" after installing kibi, you may need to adjust your `PATH`:

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

### SWI-Prolog Issues

If you encounter problems with SWI-Prolog:

- Refer to the [SWI-Prolog build documentation](https://www.swi-prolog.org/build/) for platform-specific guidance
- Check the [SWI-Prolog FAQ](https://www.swi-prolog.org/FAQ/)
- Report issues on the [SWI-Prolog forum](https://swi-prolog.discourse.group/)

## Next Steps

After installing kibi and verifying SWI-Prolog:

1. Initialize your project: `kibi init`
2. Verify your environment: `kibi doctor`
3. Import documentation: `kibi sync`
4. Validate integrity: `kibi check`

For more details, see:
- [Quick Start](../README.md#quick-start) - Brief getting started guide
- [CLI Reference](cli-reference.md) - Complete command documentation
- [Troubleshooting](troubleshooting.md) - Recovery procedures
