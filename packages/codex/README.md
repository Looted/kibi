# kibi-codex

Optional Codex plugin for [Kibi](https://looted.github.io/kibi/). It bundles Kibi's skills, MCP configuration and warning-only lifecycle hooks. Before `apply_patch` changes code linked to a requirement, the hook adds that requirement, what it must keep true, its decision and its tests to the agent's context.

The plugin is optional and builds on `kibi-core`, `kibi-cli` and `kibi-mcp`, which you install in the project first. It does not replace them.

## Install

Add the Kibi repository marketplace, open Codex, run `/plugins`, choose **Kibi Plugins** and install `kibi-codex`:

```bash
codex plugin marketplace add Looted/kibi
codex
```

The plugin only activates in workspaces that ran `kibi init` (a project root with `.kb/manifest.json`); elsewhere its hooks exit silently. Without the plugin, register the server directly:

```bash
codex mcp add kibi -- npx --no-install kibi-mcp
```

See the [Codex plugin guide](https://looted.github.io/kibi/guide/install.html#optional-codex-plugin) for details and host limitations.

## Links

- [Documentation](https://looted.github.io/kibi/)
- [Source](https://github.com/Looted/kibi)
- [Issues](https://github.com/Looted/kibi/issues)

## License

AGPL-3.0-or-later
