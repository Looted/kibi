![Kibi Wordmark](assets/wordmark.svg)

[![Status: Beta](https://img.shields.io/badge/status-beta-4c8bf5.svg)](#beta-status)
[![CI](https://github.com/Looted/kibi/actions/workflows/ci.yml/badge.svg)](https://github.com/Looted/kibi/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/Looted/kibi/branch/develop/graph/badge.svg)](https://codecov.io/gh/Looted/kibi)
[![Kibi requirement health](https://looted.github.io/kibi/kibi-report/badge.svg)](https://looted.github.io/kibi/kibi-report/)
[![License: AGPL-3.0-or-later](https://img.shields.io/badge/license-AGPL--3.0--or--later-6f42c1.svg)](LICENSE.md)
[![X @kibi_dev](https://img.shields.io/badge/%40kibi__dev-000000.svg?logo=x&logoColor=white)](https://x.com/kibi_dev)

**Prompt the intent. Kibi makes the agent remember it—and prove the implementation.**

Kibi is an agent-native requirements compiler and enforcement layer. You describe product intent in natural language; the agent creates and maintains the structured requirements, scenarios, tests, semantic facts, and code links. Kibi then checks that the implementation remains coherent with that intent.

Unlike passive memory or retrieval systems, Kibi is designed to place itself in the agent's workflow. The agent does not have to remember to consult a ticket, board, or requirements folder: Kibi's hooks, tools, and validation gates continuously bring the relevant product context back into the work.

**[Documentation](https://looted.github.io/kibi/)** · **[Quick start](https://looted.github.io/kibi/guide/quick-start.html)** · **[Kibi's own health report](https://looted.github.io/kibi/kibi-report/)**

## Why Kibi

Most project knowledge is scattered across prompts, tickets, code, and conversations—and most AI agents eventually forget part of it. Kibi turns that knowledge into an enforceable, branch-local model:

- **Humans maintain intent, not artifacts** — The prompt is the primary authoring interface. Agents own the routine work of creating and evolving requirements, scenarios, tests, facts, and symbol links; humans resolve genuine ambiguity and product decisions.
- **Memory is enforceable** — Symbols need requirement ownership, requirements need complete semantics and scenarios, scenarios need tests, and proof-bearing tests need fresh execution evidence.
- **Prolog guards against drift** — Typed properties, predicates, and safe rules let deterministic checks expose contradictions, unsupported invention, and incomplete semantics before they become accepted project knowledge.
- **E2E behavior is traceable** — Kibi records what an end-to-end test proves, not merely which lines it happened to execute. You can navigate from a symbol to its requirement or from a test to the scenario and intent it verifies.
- **Intent survives branch changes** — Each Git branch has its own KB snapshot, keeping feature context isolated and available when you return.
- **Keep knowledge local** — KB state lives in your repository's `.kb/` directory; Kibi does not send external telemetry or analytics.

## Quick start

Kibi requires **Node.js 22+**. SWI-Prolog is bundled: on Linux (x64 or arm64, glibc 2.28+) and macOS (Apple silicon or Intel) there is nothing else to install. On other platforms, such as Alpine/musl or native Windows (use WSL), install SWI-Prolog 9.0+ and put `swipl` on your `PATH` ([details](https://looted.github.io/kibi/guide/install.html)). Then, in your repository:

```bash
npm install --save-dev kibi-core kibi-cli kibi-mcp
npm exec -- kibi init
```

`kibi init` creates the `.kb/` layout and installs the Git hooks that keep it in sync. It does not infer product knowledge. [Connect your coding agent](#connect-your-coding-agent), then ask it:

> **Bootstrap Kibi for this repository.**

The agent produces a read-only plan, shows you its hash, and writes nothing until you approve. After that, work normally: prompt for features, fixes, and refactors, and the agent keeps requirements, scenarios, tests, and code links in step with the code.

pnpm, Yarn, and Bun work the same way through their local runners; the [installation guide](https://looted.github.io/kibi/guide/install.html) has the equivalents, and `npm exec -- kibi doctor` reports which SWI-Prolog Kibi is using. Do not install with `--omit=optional` (or pnpm `supportedArchitectures` that exclude your platform): the bundled runtime is an optional dependency.

## Connect your coding agent

Every client starts the same project-local `kibi-mcp` server (`npx --no-install kibi-mcp`, stdio, working directory = your repository). Optional plugins add bundled skills and hooks on top.

<details>
<summary>Claude Code</summary>

Install the optional `kibi-claude` plugin from this repository's marketplace. It brings the MCP server, the bundled skills, and advisory hooks that show the agent the linked requirements and tests before it reads or edits code:

```bash
claude plugin marketplace add Looted/kibi
```

```bash
claude plugin install kibi-claude@kibi
```

Without the plugin, register the server for the project:

```bash
claude mcp add --scope project kibi -- npx --no-install kibi-mcp
```

</details>

<details>
<summary>Cursor</summary>

Add Kibi to `.cursor/mcp.json`:

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

The optional `kibi-cursor` plugin adds rules, bundled skills, commands, and advisory hooks. See the [Cursor plugin guide](https://looted.github.io/kibi/guide/install.html#optional-cursor-plugin).

</details>

<details>
<summary>Codex</summary>

```bash
codex mcp add kibi -- npx --no-install kibi-mcp
```

The optional `kibi-codex` plugin bundles Kibi skills, MCP configuration, and warning-only lifecycle hooks. Add the Kibi repository marketplace, open Codex, then run `/plugins`, choose **Kibi Plugins**, and install `kibi-codex`:

```bash
codex plugin marketplace add Looted/kibi
```

The repository marketplace is not the official OpenAI Plugin Directory; self-serve plugin publishing is not available there yet. Manual MCP configuration remains fully supported.

</details>

<details>
<summary>OpenCode</summary>

Add Kibi to `opencode.json`. The optional `kibi-opencode` plugin adds prompt guidance and background maintenance:

```json
{
  "mcp": {
    "kibi": {
      "type": "local",
      "enabled": true,
      "command": ["npx", "--no-install", "kibi-mcp"]
    }
  },
  "plugin": ["kibi-opencode"]
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
<summary>ZCode and other MCP clients</summary>

Any stdio MCP client works with `command: npx`, `args: --no-install kibi-mcp`. ZCode also has an optional plugin, installed from a local checkout; see the [ZCode plugin guide](https://looted.github.io/kibi/guide/install.html#optional-zcode-plugin). Agents without MCP can use the same operations through the CLI's JSON routes.

</details>

Kibi's **skill subsystem** is the agent-guidance mechanism: four bundled skills cover operation safety, bootstrap, freshness, and traceability. Agents load them with `kb_skills_list` and `kb_skills_load` (or the equivalent read-only CLI routes), so you do not paste a long system prompt. See [agent onboarding](https://looted.github.io/kibi/reference/agent-onboarding.html) for the copy-paste discovery snippet for generic agents.

## See what is proven

```bash
npm exec -- kibi report --open
```

`kibi report` writes a self-contained `kibi-report/index.html` and `kibi-report/badge.svg` from one coverage snapshot. `% proven` is the share of current requirements with fresh end-to-end proof on the current code; the report lists what is proven, what is missing proof, what contradicts, and what has gone stale. See [reading the report](https://looted.github.io/kibi/guide/reading-the-report.html).

To publish the report and a clickable badge on GitHub Pages, run `npm exec -- kibi init --github`, then enable **Settings → Pages → Source → GitHub Actions**. The [GitHub integration guide](https://looted.github.io/kibi/guide/github-integration.html) covers the workflow ([docs/examples/github/kibi-report.yml](docs/examples/github/kibi-report.yml)), badge-only publishing, and other package managers. The same guide has a CI step that keeps pull requests mergeable when only `.kb/symbols.yaml` or a relationship shard conflicts ([docs/examples/github/kibi-kb-merge.yml](docs/examples/github/kibi-kb-merge.yml)).

For day-to-day inspection, `kibi status`, `kibi search`, `kibi gaps`, `kibi coverage`, and `kibi check` are in the [CLI reference](https://looted.github.io/kibi/reference/cli.html).

## How it works

Kibi combines probabilistic interpretation with deterministic verification:

```text
Human prompt
    |
    v
Agent updates code and product knowledge
    |
    v
Requirements + semantic facts/rules + scenarios + tests + symbol links
    |
    v
Prolog coherence checks + traceability gates + fresh E2E evidence
    |
    v
Proven result or explicit, repairable gaps
```

The agent never writes arbitrary Prolog as trusted truth. It works through typed facts, predicate schemas, and safe logic representations; Kibi validates those encodings before the Prolog layer uses them for inference.

### What Kibi enforces

Kibi maintains a canonical traceability and proof chain:

```text
Requirement -> Scenario -> Test
     ^                       ^
     |                       |
 Production symbol     Executable test symbol
```

For a requirement to be proven rather than merely documented:

- Every production symbol must trace to the requirement it implements.
- Every normative requirement clause must have one complete semantic grounding or remain explicitly unresolved.
- Requirements must be specified by scenarios, and tests must verify those scenarios.
- Executable test symbols must identify the code that actually performs the verification.
- Proof-bearing production symbols must be covered by qualifying tests.
- End-to-end evidence must be fresh and bound to the current code snapshot.

That makes questions answerable in both directions: which requirement owns this symbol, what this E2E test actually verifies, which requirements lack a scenario or current evidence, and whether two current requirements contradict each other. Code coverage alone cannot answer them: it shows that a test touched a line, not which product behavior was exercised.

### Prolog as the safety layer

Suppose the product defines exactly three user roles. Once that constraint is encoded as a strict property or predicate, an agent cannot quietly invent a fourth role and treat it as established intent: Kibi can surface the contradiction or missing authorization deterministically.

Prolog does not decide whether the original human intent was correct. It verifies the knowledge that was encoded, while Kibi keeps ambiguity, missing ontology, incomplete grounding, and stale evidence explicit instead of calling them proof.

### Why this is possible now

Traditional knowledge bases required specialists to design ontologies, write formal logic, and maintain every mapping by hand. LLMs change the economics of that authoring step, and Kibi and Prolog supply the discipline:

| Participant | Strength and responsibility |
| --- | --- |
| Human | States product intent and resolves real ambiguity or policy choices |
| AI agent | Maps intent to the codebase and maintains requirements, scenarios, tests, facts, and symbol links |
| Kibi + Prolog | Validates schemas, checks coherence and contradictions, enforces traceability, and evaluates proof evidence |

The result uses LLM strengths to address LLM weaknesses: limited memory, hallucination, context drift, and the loss of the product-to-code mapping traditionally spread across product owners, ticket systems, and planning boards.

### What Kibi models

Eight entity types: `req`, `scenario`, `test`, `fact`, `adr`, `flag`, `event`, and `symbol`. The [entity schema](https://looted.github.io/kibi/reference/entity-schema.html) has the complete model.

Use `flag` only for real runtime or configuration gates. Bug and workaround notes are `fact` records with `fact_kind: observation` or `meta`.

## Packages

Install `kibi-core`, `kibi-cli`, and `kibi-mcp` in the project. Everything else is optional.

| Package | Role |
| --- | --- |
| `kibi-core` | Prolog-backed knowledge graph, inference, and validation |
| `kibi-cli` | Human, agent, automation, and Git-hook interface |
| `kibi-mcp` | MCP surface exposing the public Kibi operation contracts |
| `kibi-claude` | Claude Code skills, MCP, requirement context before reads/edits, and advisory hooks (plugin marketplace) |
| `kibi-cursor` | Cursor rules, skills, MCP, and advisory hooks |
| `kibi-codex` | Codex skills, MCP, and lifecycle hooks |
| `kibi-opencode` | OpenCode guidance and background maintenance |
| `kibi-zcode` | ZCode skills, command, MCP, and advisory hooks (local checkout) |
| `kibi-vscode` | VS Code knowledge explorer and traceability view |
| `kibi-plugin-sdk` | Protocol types and validators for [capability plugins](https://looted.github.io/kibi/reference/plugins.html) |
| `kibi-plugin-builtin` | Default semantic, ontology, and TypeScript symbol capabilities |
| `kibi-plugin-jev` | Optional TypeSafe Jev semantic classifier |

## Documentation

The guide and reference are published at **<https://looted.github.io/kibi/>**. Language models can start from the [documentation index](https://looted.github.io/kibi/llms.txt).

- [Installation](https://looted.github.io/kibi/guide/install.html) — the bundled SWI-Prolog runtime, package managers, plugins, and verification
- [How Kibi works](https://looted.github.io/kibi/guide/how-it-works.html) and [the proof ladder](https://looted.github.io/kibi/guide/proof-ladder.html)
- [Proving requirements](https://looted.github.io/kibi/reference/proving.html) — proof contracts, `kibi prove`, and receipts
- [CLI reference](https://looted.github.io/kibi/reference/cli.html) and [MCP reference](https://looted.github.io/kibi/reference/mcp.html)
- [Entity schema](https://looted.github.io/kibi/reference/entity-schema.html) and [inference rules](https://looted.github.io/kibi/reference/inference-rules.html)
- [Architecture](https://looted.github.io/kibi/reference/architecture.html) — storage, branch isolation, and data flow
- [Troubleshooting](https://looted.github.io/kibi/guide/troubleshooting.html)

## Beta status

Kibi is in beta and ready for use in real projects. Public interfaces may still evolve before 1.0, so pin exact package versions when reproducibility matters.

Kibi is licensed under [AGPL-3.0-or-later](LICENSE.md).
