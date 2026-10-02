---
title: Connect your coding agent
description: Give your coding agent the same Kibi operations you can run yourself, through an MCP server or the kibi CLI.
---

If you used the [agent setup prompt](quick-start.md#2-paste-the-setup-prompt-into-your-agent-recommended), your agent has already done this for its own host; this page is the manual route and the reference for other clients.

Once Kibi is installed in the repository, your agent needs a way to call it. Two surfaces expose the same operations:

- **MCP server** (`kibi-mcp`) — tools such as `kb_search`, `kb_check`, and `kb_upsert` show up in the client's tool list.
- **CLI** (`kibi`) — the same operations as JSON on stdin, plus commands you run yourself, such as `kibi report`.

Use whichever surface your client can see. You do not configure both unless you want to.

> [!TIP]
> Claude Code, Cursor, Codex, OpenCode, and ZCode also have optional plugins that wire this up for you. The JSON below is the manual fallback when you are not using a plugin. Details and plugin install steps are in the [installation guide](install.md).

## Claude Code

The `kibi-claude` plugin brings the server, the bundled skills, and hooks that show the agent the linked requirements and tests before it reads or edits code:

```bash
claude plugin marketplace add Looted/kibi
claude plugin install kibi-claude@kibi
```

Without the plugin, register the server for the project. This writes `.mcp.json`, so the whole team gets it:

```bash
claude mcp add --scope project kibi -- npx --no-install kibi-mcp
```

See [Claude Code plugin](install.md#optional-claude-code-plugin).

## Cursor, Codex, and most other clients

Add this server to the client's MCP config. The working directory must be the repository where you ran `kibi init`, so the server attaches to that project's `.kb/`.

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

`--no-install` matters. The client starts the `kibi-mcp` already in the project. It does not download a different copy at launch.

Plugin pages in the installation guide:

- [Cursor plugin](install.md#optional-cursor-plugin)
- [Codex plugin](install.md#optional-codex-plugin)
- [ZCode plugin](install.md#optional-zcode-plugin)

## OpenCode

OpenCode takes the command as a list of tokens, in `opencode.json`:

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

The optional `kibi-opencode` plugin adds prompt guidance and background maintenance. It does not replace the server above. See [OpenCode MCP](install.md#opencode-mcp).

## VS Code

Create `.vscode/mcp.json`:

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

See [VS Code MCP](install.md#vs-code-mcp).

## pnpm or Yarn

Keep the same shape and swap in that package manager's local runner. For pnpm, the command is `pnpm` with args `["exec", "kibi-mcp"]`. For Yarn, `yarn` with args `["exec", "kibi-mcp"]`. The [installation guide](install.md#manual-project-local-install) has the full table.

## No MCP? Use the CLI

If the agent cannot see MCP tools, it can call the same operations through the CLI:

```bash
printf '%s\n' '{"query":"login","limit":10}' | npm exec -- kibi search --input -
```

Agents discover this path from the [agent onboarding snippet](agent-onboarding.md). You do not configure it beyond installing the packages.

## The first prompt

After the tools are visible, ask:

> Bootstrap Kibi for this repository.

The agent shows a read-only plan and a hash, and it waits for your approval before writing. After that, ordinary prompts — features, fixes, refactors — keep the model in step with the code.

## What stays in your hands

- **Product calls.** If two behaviors would contradict, you pick one. Kibi will not paper over that.
- **Approval of the plan.** Bootstrap and other bulk writes show you the plan before they apply it.
- **The report.** You decide whether a gap is work still to do, or a behavior you no longer want.

The agent writes the model through typed operations. It does not edit `.kb/` by hand. A change is not finished while checks are failing or the snapshot is stale.
