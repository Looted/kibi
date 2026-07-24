![Kibi Wordmark](assets/wordmark.svg)

[![CI](https://github.com/Looted/kibi/actions/workflows/ci.yml/badge.svg)](https://github.com/Looted/kibi/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/Looted/kibi/branch/develop/graph/badge.svg)](https://codecov.io/gh/Looted/kibi)

Kibi is a repo-local, per-git-branch, queryable knowledge base for software projects. It stores requirements, scenarios, tests, architecture decisions, and more as linked entities, ensuring end-to-end traceability between code and documentation.

## Entity Taxonomy

Kibi intentionally supports **eight core entity types**, organized into two logical groups:

### Common Authoring Entities
- **req** — Software requirements specifying functionality or constraints.
- **scenario** — BDD scenarios describing user behavior (Given/When/Then).
- **test** — Executable unit, integration, or e2e test cases.
- **fact** — Atomic domain facts and invariants. Supports a **strict lane** for contradiction-sensitive modeling and a **context lane** (`observation`, `meta`) for bugs and workarounds.

### Supporting & System Entities
- **adr** — Architecture Decision Records documenting technical choices.
- **flag** — Runtime or config gates (feature flags, kill-switches).
- **event** — Domain or system events published/consumed by components.
- **symbol** — Abstract code symbols (functions, classes, modules).


## Why Kibi

Kibi is designed to boost AI agents' memory during software development. It maintains a living, verifiable project memory that:

- **Tracks context across branches** — Every git branch gets its own KB snapshot, preserving context as you switch between features
- **Enforces traceability** — Links code symbols to requirements, preventing orphan features and technical debt
- **Validates automatically** — Rules catch missing requirements, dangling references, and consistency issues
- **Agent-friendly** — LLM assistants can query and update the knowledge base through peer MCP tools or dedicated CLI JSON routes without risking direct file corruption
- **Guides semantic modeling** — The MCP server can inspect prose requirements and suggest strict facts or reusable predicate facts before agents treat text as machine-checkable knowledge

### What You Get

Kibi provides concrete, day-to-day benefits for developers and teams:

- **Requirements Traceability** — Track every code symbol back to its requirement. Know why code exists and what business need it addresses.

- **Test Coverage Visibility** — See which requirements have tests, which don't, and what's covered at a glance. Ensure nothing slips through the cracks.

- **Architectural Constraints** — Link code to ADRs. Know what constraints apply to each symbol and verify architecture decisions are honored.

- **Feature Flag Blast Radius** — See what code depends on a runtime/config gate before toggling it. Understand the impact of enabling or disabling a feature.

- **Event-Driven Architecture** — Map who publishes and consumes each domain event. Trace event flows and identify couplings across the system.

- **Branch-Local Memory** — Every git branch keeps its own KB snapshot. Switch contexts without losing traceability or polluting other branches.

- **Semantic Advisor** — Get reviewable modeling suggestions for requirement prose, including scalar constraints, permissions, workflow rules, operational policies, privacy rules, and consistency requirements.

For OpenCode users, bootstrap an existing repo with \`/init-kibi\` (\`kb_autopilot_generate\`).


> **Entity Modeling Note:** Use `flag` for runtime/config gates only. Document bugs and workarounds as `fact` entities with `fact_kind: observation` or `meta`. See [Entity Schema](docs/entity-schema.md) and [AGENTS.md](AGENTS.md) for the canonical guidance.

## Key Components

- **kibi-core** — Prolog-based knowledge graph that tracks entities across branches
- **kibi-cli** — Command-line interface for people, agents, automation, and hooks, including 18 dedicated JSON routes
- **kibi-mcp** — Peer Model Context Protocol surface exposing the same 18 public operations to MCP-capable agents
- **kibi-opencode** — OpenCode plugin that injects Kibi guidance and runs background syncs
- **kibi-codex** — Optional Codex adapter that brings Kibi MCP skills and hooks into Codex workflows
- **kibi-cursor** — Optional Cursor plugin with rules, skills, MCP wiring, and advisory editor hooks
- **kibi-vscode** — VS Code extension for exploring the knowledge base
- **Skill subsystem** — Reusable Markdown skills for agent guidance (bundled skills, CLI + MCP progressive disclosure)

## Prerequisites

- **SWI-Prolog 9.0+** — Kibi's knowledge graph runs on Prolog




## Installation

Kibi is designed to run from your project, so each MCP client starts the same local `kibi-mcp` binary for that workspace.

Install the CLI, MCP server, and core package as project dependencies. Use your
project's package manager; npm is shown only as the Node baseline:

```bash
npm install --save-dev kibi-cli kibi-mcp kibi-core
```

Equivalent project-local installs are:

```bash
pnpm add -D kibi-cli kibi-mcp kibi-core
yarn add -D kibi-cli kibi-mcp kibi-core
bun add -d kibi-cli kibi-mcp kibi-core
```

Run the CLI through the same project-local package context:

```bash
npm exec -- kibi status
```

For pnpm, Yarn, or Bun projects, use that manager's local binary runner instead
(`pnpm exec kibi`, `yarn exec kibi`, or `bunx --no-install kibi`). Avoid global
Kibi binaries for project automation unless you intentionally want a global tool.

The MCP server should also run from the project-local install. For npm-based
projects, use `npx --no-install kibi-mcp` or the equivalent `npm exec --no -- kibi-mcp`; for other package managers, use the local runner for that project
(`pnpm exec kibi-mcp`, `yarn exec kibi-mcp`, or `bunx --no-install kibi-mcp`).
These commands control package resolution only: each MCP client still starts and
owns its own stdio server subprocess.

`kibi-opencode` is optional. It adds OpenCode guidance/background maintenance,
but it does not replace the base `kibi-cli` and `kibi-mcp` installation.

For detailed setup, global install alternatives, and troubleshooting, see [the installation guide](docs/install.md).

### MCP client examples

<details>
<summary>OpenCode</summary>

Add Kibi to your `opencode.json`:

```json
{
  "mcp": {
    "kibi": {
      "type": "local",
      "enabled": true,
      "command": ["npx", "--no-install", "kibi-mcp"]
    }
  }
}
```

</details>

<details>
<summary>VS Code</summary>

Add Kibi to `.vscode/mcp.json`:

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

</details>

<details>
<summary>Codex</summary>

Add Kibi to `~/.codex/config.toml` or `$CODEX_HOME/config.toml`:

```toml
[mcp_servers.kibi]
command = "npx"
args = ["--no-install", "kibi-mcp"]
enabled = true
```

Or add it with the Codex CLI:

```bash
codex mcp add kibi -- npx --no-install kibi-mcp
```

`kibi-codex` is optional and can be installed through a Codex plugin source or a
local plugin fixture when you want bundled Kibi skills, MCP config, and
warning-only lifecycle hooks. It is not required for base Kibi operations, and it
does not replace `kibi-core`, `kibi-cli`, or `kibi-mcp`.

To install it from the Kibi repo marketplace, add the marketplace source and then
open the Codex plugin browser:

```bash
codex plugin marketplace add Looted/kibi
codex
```

Then run `/plugins`, choose **Kibi Plugins**, and install `kibi-codex`.

You can also install the npm package directly when you are developing or testing
the plugin locally:

```bash
npm install --save-dev kibi-codex
```

For pinned environments, install an exact `kibi-codex` version and expose that
version through your chosen Codex plugin source. This repo marketplace is not the
official OpenAI Plugin Directory; self-serve plugin publishing is not available
yet, so keep the manual MCP configuration above as the supported fallback.

</details>

<details>
<summary>Cursor</summary>

Install the optional `kibi-cursor` plugin from the repo marketplace at `.cursor-plugin/marketplace.json`, or test locally:

```bash
./scripts/sync-cursor-plugin-local.sh
```

Then reload Cursor and check **Plugins → User**. The plugin bundles:

- `mcp.json` pointing at the project-local `kibi-mcp` binary
- Rules, skills, and `/init-kibi` command guidance
- Advisory hooks for bootstrap reminders, read/write guidance, and freshness follow-ups

`kibi-cursor` is optional and does not replace `kibi-core`, `kibi-cli`, or `kibi-mcp`.

You can also install the npm package for local development:

```bash
npm install --save-dev kibi-cursor
```

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

See [Cursor Plugins](https://cursor.com/docs/plugins) and `packages/cursor/README.md` for details.

</details>

<details>
<summary>Generic MCP clients</summary>

Most stdio MCP clients need the same command and arguments:

```text
command: npx
args: --no-install kibi-mcp
transport: stdio
```

If your client supports a working-directory setting, point it at the project where `kibi-mcp` is installed.

</details>

If your project uses a different package manager, keep the same MCP shape and swap the command/args for your local runner, for example `pnpm exec kibi-mcp`, `yarn exec kibi-mcp`, or `bunx --no-install kibi-mcp`.

Optional OpenCode plugin usage is separate from the MCP server command:

```json
{
  "plugin": ["kibi-opencode"]
}
```

Use the plugin when you want OpenCode prompt guidance and background sync/check
maintenance. Keep the `mcp.kibi` entry configured against the project-local
`kibi-mcp` binary either way.

`kibi-opencode` auto-updates its cached OpenCode plugin package by default on
startup. To keep the plugin fixed, pin an exact version in the plugin array,
for example `"kibi-opencode@0.18.1"`; MCP/CLI/core project dependencies remain
under your package manager's control.

## Quick Start

Initialize kibi in your repository:

```bash
# Verify environment prerequisites
npm exec -- kibi doctor

# Initialize .kb/ and install git hooks
npm exec -- kibi init

# Parse markdown docs and symbols into branch KB
npm exec -- kibi sync

# Discover relevant knowledge before exact lookups
npm exec -- kibi search auth

# Inspect current branch snapshot and freshness
npm exec -- kibi status

# Run integrity checks
npm exec -- kibi check
```

> **Note:** `kibi init` installs git hooks by default and writes `.kb/` ignore entries to `.gitignore`. Hooks automatically sync your KB on branch checkout and merge.

### Typical discovery workflow

```bash
# Explore the KB first
npm exec -- kibi search login

# Then follow up with exact/source-linked queries
npm exec -- kibi query req --source src/auth/login.ts --format table

# Check branch attachment and freshness when needed
npm exec -- kibi status

# Ask focused reporting questions
npm exec -- kibi gaps req --missing-rel specified_by,verified_by --format table
npm exec -- kibi coverage --by req --format table
```

## Documentation

- **[Installation Guide](docs/install.md)** — Prerequisites, SWI-Prolog setup, and verification steps
- **[CLI Reference](docs/cli-reference.md)** — Complete command documentation with all flags and options
- **[Troubleshooting](docs/troubleshooting.md)** — Recovery procedures and common issues
- **[Entity Schema](docs/entity-schema.md)** — Entity types, relationships, and examples
- **[Architecture](docs/architecture.md)** — System architecture and component descriptions
- **[Inference Rules](docs/inference-rules.md)** — Validation rules and constraint logic
- **[MCP Reference](docs/mcp-reference.md)** — MCP server documentation
- **[SkillOpt Workflow](docs/skillopt.md)**, operator guide for the fake workflow, artifact layout, and approval gate notes
- **[LLM Prompts](docs/prompts/llm-rules.md)** — Ready-to-copy system prompts for agents
- **[AGENTS.md](AGENTS.md)** — Guidelines for AI agents working on kibi projects
- **[Contributing](CONTRIBUTING.md)** — Development setup and contributor workflow

## Release and Versioning

Kibi uses a two-branch release model with [Changesets](https://github.com/changesets/changesets). Work happens on `develop`, where version bumps are applied. The `master` branch is publish-only.

### Release Flow
1. **Development**: Create changesets on `develop` as you work.
2. **Versioning**: Run `bun run version-packages` on `develop` to consume changesets, apply bumps, update changelogs, and sync plugin manifests.
3. **Review**: Review and commit the generated release changes.
4. **Merge**: Merge `develop` into `master`.
5. **Publish**: `master` CI builds, verifies, and publishes new versions to npm.

There is no `master → develop` back-merge.

```bash
# Add release metadata (run on develop)
bun run changeset

# Apply version bumps (run on develop)
bun run version-packages
```

Do not publish manually or merge `master` back into `develop`.

---

⚠️ **Alpha Status:** Kibi is in early alpha. Expect breaking changes. Pin exact versions of `kibi-cli`, `kibi-mcp`, `kibi-opencode`, `kibi-codex`, and `kibi-cursor` in your projects, and expect to occasionally delete and rebuild your `.kb` folder when upgrading.
