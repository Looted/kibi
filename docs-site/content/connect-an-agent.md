---
title: Connect your coding agent
description: Give your coding agent the same Kibi operations you can run yourself, through an MCP server or the kibi CLI.
---

If you used the [agent setup prompt](quick-start.md#2-paste-the-setup-prompt-into-your-agent-recommended), your agent has already done this for its own host; this page is the manual route and the reference for other clients.

Once Kibi is installed in the repository, your agent needs a way to call it. Two surfaces expose the same operations:

- **MCP server** (`kibi-mcp`) — all 19 tools show up in the client's tool list at Kibi level `test`. At Kibi level `remember`, the `full` profile lists only the knowledge tools (plus bootstrap tools while the KB is empty and impact-review tools when an impact policy is active, omitting `kb_ingest_proof`). With `KIBI_MCP_TOOLS=core` only eight are listed (`kb_search`, `kb_query`, `kb_record`, `kb_upsert`, `kb_check`, `kb_status`, `kb_skills` and `kb_review_firm_edit`), and the others run through the project CLI with the same input. `kb_search` also answers plain questions, such as "what governs checkout rounding?", with decision cards and bundled meaning hints. The [MCP reference](../reference/mcp.md) lists every tool.
- **CLI** (`kibi`) — the same operations as JSON on stdin, plus commands you run yourself, such as `kibi report`.

Use whichever surface your client can see. You do not configure both unless you want to.

> [!TIP]
> Antigravity, Claude Code, Cursor, Codex, OpenCode, Mistral Vibe, and ZCode also have optional plugins that wire this up for you. Each plugin shows the agent linked requirements when reading, searching, or editing code, and guards firm requirements, the project's Kibi level, and requirement evidence floors. The JSON below is the manual fallback when you are not using a plugin. Details and plugin install steps are in the [installation guide](install.md).

## Antigravity

Install the optional `kibi-antigravity` plugin (bundled skills, always-on workflow rules, workspace-gated MCP server with automatic `roots/list` workspace discovery, and lifecycle hooks for read/search/edit requirement context, firm-edit and level/floor prompts, and stop reminders):

```bash
agy plugin install https://github.com/Looted/kibi/tree/master/packages/antigravity
```

Without the plugin, add `npx --no-install kibi-mcp` to `~/.gemini/config/mcp_config.json`. See [Antigravity plugin](install.md#optional-antigravity-plugin).

## Claude Code

The `kibi-claude` plugin brings the server, the bundled skills, and hooks that show the agent the linked requirements and tests before it reads or edits code, and before an edit, what those requirements must keep true, why the lead one exists, and the decision behind them. The same context reaches reads and writes the agent makes through shell commands such as `cat`, `sed -i` or a script, and an in-place write such as `sed -i` hears what must stay true before it runs:

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

- [Antigravity plugin](install.md#optional-antigravity-plugin)
- [Cursor plugin](install.md#optional-cursor-plugin)
- [Codex plugin](install.md#optional-codex-plugin)
- [ZCode plugin](install.md#optional-zcode-plugin)
- [Mistral Vibe plugin](install.md#optional-vibe-plugin)

## Mistral Vibe

Install the optional `kibi-vibe` plugin from a local checkout, then restart Vibe
or run `/reload`:

```bash
mkdir -p ~/.vibe/plugins && cp -r packages/vibe ~/.vibe/plugins/kibi
```

The plugin brings the `kibi` MCP server, the bundled skills, and fail-open
hooks (KB status at session start, KB hits for each prompt, entities linked to
a file after reads/edits). On Windows the launcher runs Kibi natively with the bundled SWI-Prolog, and
inside WSL only for a `\\wsl.localhost\<distro>` workspace — see [Vibe plugin](install.md#optional-vibe-plugin).

Without the plugin, register the server in `~/.vibe/config.toml`:

```toml
[[mcp_servers]]
name = "kibi"
transport = "stdio"
command = "node"
args = ["<path-to-checkout>/packages/vibe/bin/launch-kibi-mcp.mjs"]
startup_timeout_sec = 120
tool_timeout_sec = 300
```

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

The optional `kibi-opencode` plugin adds prompt guidance, background maintenance and, on OpenCode v1, the decision hooks the other plugins run: a message that states a rule gets a `kb_record` capture template, an edit of code that implements a firm requirement is stopped once so the agent asks the person first, and a session that changed source and recorded nothing is asked once to record the decision. Shell in-place edits count as source edits. It does not replace the server above. See [OpenCode MCP](install.md#opencode-mcp).

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

The agent first asks where product intent already lives outside the code, such as your issue tracker or wiki, and reads those sources through its other connectors. Connect those tools to the agent too if you want them used. It then shows a read-only plan and a hash, and it waits for your approval before writing. After that, ordinary prompts — features, fixes, refactors — keep the model in step with the code.

## What stays in your hands

- **Product calls.** If two behaviors would contradict, you pick one. Kibi will not paper over that.
- **Approval of the plan.** Bootstrap and other bulk writes show you the plan before they apply it. A plan compiled from a prompt applies in full or not at all; if the agent is interrupted mid-write, its next write completes or rolls back that plan.
- **The report.** You decide whether a gap is work still to do, or a behavior you no longer want.

The agent writes the model through typed operations. It does not edit `.kb/` by hand. A change is not finished while checks are failing or the snapshot is stale.
