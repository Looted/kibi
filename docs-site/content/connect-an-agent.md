---
title: Connect your coding agent
description: Point your MCP client at the project-local kibi-mcp server, or use the kibi CLI directly — both expose the same operation catalog.
---

Kibi reaches your agent through two peer surfaces. Both expose the same canonical operation catalog, so which one you use depends on what your client shows you:

- **MCP server** (`kibi-mcp`) — visible tools such as `kb_search`, `kb_check`, and `kb_upsert`.
- **CLI** (`kibi`) — the same operations as dedicated JSON routes, plus human-friendly commands like `kibi report`.

## Configure the MCP server

Every MCP client starts the same project-local binary. Most stdio clients need:

```text
command: npx
args: --no-install kibi-mcp
transport: stdio
```

Point the client's working-directory setting at the project where Kibi is installed, so the server attaches to that repository's `.kb/`.

### Client-specific setup

- **OpenCode** — add the server to `opencode.json`; the optional `kibi-opencode` plugin adds prompt guidance and background maintenance.
- **Codex** — the `kibi-codex` adapter wires Kibi into Codex CLI sessions.
- **Cursor** — the `kibi-cursor` adapter does the same for Cursor.
- **Visual Studio Code** — the `kibi-vscode` extension integrates Kibi with VS Code agent sessions.

Exact snippets for each client are in the [MCP reference](mcp.md). Install the adapter package alongside `kibi-core`, `kibi-cli`, and `kibi-mcp` if you use one.

## No MCP? Use the CLI

If your agent cannot use MCP tools, it can drive the same operations through the CLI's JSON routes:

```bash
printf '%s\n' '{"query":"login","limit":10}' | kibi search --input -
```

Agents discover this path themselves from the [agent onboarding snippet](agent-onboarding.md); you do not need to configure anything beyond installing the packages.

## The first prompt

Once connected, the prompt that starts everything is:

> Bootstrap Kibi for this repository.

Your agent will propose a read-only bootstrap plan and wait for your approval before writing anything. After that, ordinary prompts — features, fixes, refactors — keep the project model in step with the code.

## What your agent may and may not do

Kibi enforces discipline on the agent side, and it is worth knowing the shape of it:

- **Nothing is written without a schema-valid operation.** The agent works through typed operations, not ad-hoc file edits to `.kb/`.
- **Destructive or bulk changes go through plans.** Bootstrap and migrations surface an explicit plan and hash for your approval before applying.
- **Mutations run sequentially.** The agent creates relationship targets before links and keeps changes in small, reviewable batches.
- **Validation is part of the job.** A change is not finished until checks pass and the knowledge snapshot is fresh.

You approve intent and ambiguity. The agent handles the bookkeeping. Kibi keeps both honest.
