# kibi-mcp

The [Model Context Protocol](https://modelcontextprotocol.io) server for [Kibi](https://looted.github.io/kibi/). It exposes a repository's branch-local Kibi knowledge base to coding agents as `kb_*` tools: search and query, modeling prose into typed facts, compiling and applying approved plans, upserts with dry runs, gap and coverage analysis, and validation with `kb_check`.

## Install

Install it in your repository alongside the CLI and core (Node.js 22+):

```bash
npm install --save-dev kibi-core kibi-cli kibi-mcp
npm exec -- kibi init
```

## Connect an agent

Every client starts the same project-local stdio server, with the repository as the working directory:

```bash
npx --no-install kibi-mcp
```

For example:

```bash
claude mcp add --scope project kibi -- npx --no-install kibi-mcp
codex mcp add kibi -- npx --no-install kibi-mcp
```

Cursor, VS Code, OpenCode and other MCP clients use `command: npx` with `args: ["--no-install", "kibi-mcp"]`. See [Connect an agent](https://looted.github.io/kibi/guide/connect-an-agent.html) for per-host configuration and the optional host plugins, and the [MCP reference](https://looted.github.io/kibi/reference/mcp.html) for every tool.

## Links

- [Documentation](https://looted.github.io/kibi/)
- [Source](https://github.com/Looted/kibi)
- [Issues](https://github.com/Looted/kibi/issues)

## License

AGPL-3.0-or-later
