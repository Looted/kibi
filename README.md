![Kibi Wordmark](assets/wordmark.svg)

[![Status: Beta](https://img.shields.io/badge/status-beta-4c8bf5.svg)](#beta-status)
[![CI](https://github.com/Looted/kibi/actions/workflows/ci.yml/badge.svg)](https://github.com/Looted/kibi/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/Looted/kibi/branch/develop/graph/badge.svg)](https://codecov.io/gh/Looted/kibi)
[![Kibi requirement health](https://looted.github.io/kibi/kibi-report/badge.svg)](https://looted.github.io/kibi/kibi-report/)
[![License: AGPL-3.0-or-later](https://img.shields.io/badge/license-AGPL--3.0--or--later-6f42c1.svg)](LICENSE.md)
[![X @kibi_dev](https://img.shields.io/badge/%40kibi__dev-000000.svg?logo=x&logoColor=white)](https://x.com/kibi_dev)

**Say what the software should do. Kibi makes agents follow it—and prove they did.**

Kibi is an agent-native requirements compiler and enforcement layer. You describe product intent in natural language; the agent creates and maintains the structured requirements, scenarios, tests, semantic facts, and code links. Kibi then checks that the implementation remains coherent with that intent.

Unlike passive memory or retrieval systems, Kibi is designed to place itself in the agent's workflow. The agent does not have to remember to consult a ticket, board, or requirements folder: Kibi's hooks, tools, and validation gates continuously bring the relevant product context back into the work.

## Why Kibi

Most project knowledge is scattered across prompts, tickets, code, and conversations—and most AI agents eventually forget part of it. Kibi turns that knowledge into an enforceable, branch-local model:

- **Humans maintain intent, not artifacts** — The prompt is the primary authoring interface. Agents own the routine work of creating and evolving requirements, scenarios, tests, facts, and symbol links; humans resolve genuine ambiguity and product decisions.
- **Memory is enforceable** — Symbols need requirement ownership, requirements need complete semantics and scenarios, scenarios need tests, and proof-bearing tests need fresh execution evidence.
- **Prolog guards against drift** — Typed properties, predicates, and safe rules let deterministic checks expose contradictions, unsupported invention, and incomplete semantics before they become accepted project knowledge.
- **E2E behavior is traceable** — Kibi records what an end-to-end test proves, not merely which lines it happened to execute. You can navigate from a symbol to its requirement or from a test to the scenario and intent it verifies.
- **Intent survives branch changes** — Each Git branch has its own KB snapshot, keeping feature context isolated and available when you return.
- **Keep knowledge local** — KB state lives in your repository's `.kb/` directory; Kibi does not send external telemetry or analytics.

## Quick start

Kibi requires **SWI-Prolog 9.0+** with `swipl` available on your `PATH`.

Install the core runtime, CLI, and MCP server in your project:

```bash
npm install --save-dev kibi-core kibi-cli kibi-mcp
```

Then initialize Kibi and ask your coding agent to bootstrap the existing codebase:

```bash
# Initialize Kibi infrastructure and install Git hooks
npm exec -- kibi init
```

`kibi init` installs Git hooks by default and adds the required `.kb/` entries to `.gitignore`. It initializes Kibi infrastructure only; it does not infer product knowledge. Next, ask your coding agent: **“Bootstrap Kibi for this repository.”** The agent runs the read-only `kibi-bootstrap` plan, shows the exact plan hash for approval, applies it through `kb_apply_plan`, and validates the result.

After bootstrap, work normally with your agent. For manual inspection or troubleshooting, use `kibi status`, `kibi check`, `kibi search`, and `kibi sync` as needed.

Use your project's local binary runner with pnpm, Yarn, or Bun. See the [installation guide](docs/install.md) for package-manager equivalents, SWI-Prolog setup, global installation, and troubleshooting.

### Explore gaps and coverage

```bash
# Start broad, then narrow to a source file
npm exec -- kibi search login
npm exec -- kibi query req --source src/auth/login.ts --format table

# Find under-specified or under-tested requirements
npm exec -- kibi gaps req --missing-rel specified_by,verified_by --format table
npm exec -- kibi coverage --by req --format table

# Generate a visual requirement-health report and open it locally
npm exec -- kibi report --open
```

The same `kibi report` command writes both files from **one** coverage snapshot:

```text
kibi-report/index.html
kibi-report/badge.svg
```

They are meant to be published together. `% proven` is the share of applicable
current Kibi requirements that have current proof. The HTML report is where to
inspect which requirements are proven, which are missing proof, contradictions,
and stale verification. No server, CDN, or external assets are required. On
pushes to `develop`, this repository publishes that pair at
`https://looted.github.io/kibi/kibi-report/`.

### Publish requirement health on GitHub

The recommended integration is a continuously updated report on GitHub Pages
with a clickable `% proven` badge in the README. Kibi does not host badges or
reports; GitHub Pages is the expected publisher, and the only GitHub UI step is
enabling Actions as the Pages source.

1. In GitHub: **Settings → Pages → Source → GitHub Actions**.
2. Copy the canonical workflow to `.github/workflows/kibi-report.yml`. The
   complete file lives at
   [docs/examples/github/kibi-report.yml](docs/examples/github/kibi-report.yml)
   (same content as the `kibi-cli` template).
3. Add the clickable badge, replacing the lowercase Pages owner and repository
   path. Files are published under `/kibi-report/` so they do not occupy the
   Pages site root. For an owner-site repo named `OWNER.github.io`, omit the
   repository segment (`https://OWNER.github.io/kibi-report/` and
   `https://OWNER.github.io/kibi-report/badge.svg`).

```markdown
[![Kibi requirement health](https://OWNER.github.io/REPOSITORY/kibi-report/badge.svg)](https://OWNER.github.io/REPOSITORY/kibi-report/)
```

The workflow generates the report on pull requests, on the repository default
branch (it does not assume `main`), and on `workflow_dispatch`. Pull requests
fail if `kibi report` fails and upload the candidate `kibi-report/` directory
as the `kibi-pr-report` artifact. Only the default branch and
`workflow_dispatch` deploy GitHub Pages under `/kibi-report/`. A pull request
never replaces the canonical public report or badge. Copy
[docs/examples/github/kibi-report.yml](docs/examples/github/kibi-report.yml)
rather than maintaining a second workflow. Adapt `cache: npm` and `npm ci` if
the project does not use npm; see
[GitHub integration](docs/github-integration.md).

To scaffold those same files automatically:

```bash
npm exec -- kibi init --github
```

`kibi init --github` writes the documented workflow, adds the clickable badge
when a README exists, and prints the Pages enable step. It is safe to re-run:
it will not duplicate the badge or overwrite a customized workflow.

Do not commit generated `kibi-report/` files. The image URL must be anonymously
reachable for GitHub to render it in a public README.

Badge-only publishing is an explicit opt-out, not the recommended flow:

```bash
npm exec -- kibi init --github --badge-only
```

That still generates the report from the same snapshot, but publishes only
`badge.svg`. The README link then points at the metric explanation rather than
a report that was never published. See
[docs/github-integration.md](docs/github-integration.md) for package-manager
adaptations, owner-site URLs, and troubleshooting.

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

This makes questions answerable in both directions:

- Why does this symbol exist, and which requirement owns it?
- What requirement and scenario does this E2E test actually verify?
- Which requirements have no scenario, semantic grounding, or passing behavioral evidence?
- What changes when a feature flag is toggled?
- Do two current requirements impose contradictory constraints?
- Is the knowledge snapshot for this branch fresh?

Code coverage alone cannot provide this proof. It can show that an E2E run touched a line, but not which product behavior was exercised or whether the test still represents the intended scenario.

### Prolog as the safety layer

Suppose the product defines exactly three user roles. Once that constraint is encoded as a strict property or predicate, an agent cannot quietly invent a fourth role and treat it as established intent: Kibi can surface the contradiction or missing authorization deterministically.

Prolog does not decide whether the original human intent was correct. It verifies the knowledge that was encoded, while Kibi keeps ambiguity, missing ontology, incomplete grounding, and stale evidence explicit instead of calling them proof. This gives agents guardrails against hallucination and context drift without pretending probabilistic interpretation is infallible.

### Why this is possible now

Traditional knowledge bases required specialists to design ontologies, interpret semantics, write formal logic, and maintain every mapping by hand. That cost made them a poor fit for fast-moving software requirements.

LLMs change the economics of the authoring step. They can interpret natural-language intent, navigate a codebase, and propose structured semantic representations. Kibi and Prolog supply the complementary discipline:

| Participant | Strength and responsibility |
| --- | --- |
| Human | States product intent and resolves real ambiguity or policy choices |
| AI agent | Maps intent to the codebase and maintains requirements, scenarios, tests, facts, and symbol links |
| Kibi + Prolog | Validates schemas, checks coherence and contradictions, enforces traceability, and evaluates proof evidence |

The result uses LLM strengths to address LLM weaknesses: limited memory, hallucination, context drift, and the loss of the product-to-code mapping traditionally spread across product owners, ticket systems, and planning boards.

### What Kibi models

Kibi intentionally supports eight core entity types:

| Entity | Purpose |
| --- | --- |
| `req` | Functionality, behavior, or constraints the system must satisfy |
| `scenario` | User or system behavior expressed as concrete flows |
| `test` | Unit, integration, or end-to-end verification evidence |
| `fact` | Domain facts and invariants, plus contextual observations and notes |
| `adr` | Architecture decisions and their rationale |
| `flag` | Runtime or configuration gates such as feature flags and kill switches |
| `event` | Domain or system events published and consumed by components |
| `symbol` | Functions, classes, modules, and other code-level ownership anchors |

Use `flag` only for real runtime or configuration gates. Bugs and workarounds belong in `fact` entities with `fact_kind: observation` or `meta`; contradiction-sensitive invariants use the strict fact or predicate lanes. See the [entity schema](docs/entity-schema.md) for the complete model.

## Connect an AI client

Every MCP client starts the same project-local `kibi-mcp` binary. Most stdio clients need this configuration:

```text
command: npx
args: --no-install kibi-mcp
transport: stdio
```

If the client supports a working-directory setting, point it at the project where Kibi is installed.

<details>
<summary>OpenCode</summary>

Add Kibi to `opencode.json`:

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

The optional `kibi-opencode` plugin adds prompt guidance and background maintenance:

```json
{
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
<summary>Codex</summary>

Add Kibi with the Codex CLI:

```bash
codex mcp add kibi -- npx --no-install kibi-mcp
```

Or configure it in `~/.codex/config.toml` or `$CODEX_HOME/config.toml`:

```toml
[mcp_servers.kibi]
command = "npx"
args = ["--no-install", "kibi-mcp"]
enabled = true
```

The optional `kibi-codex` plugin bundles Kibi skills, MCP configuration, and warning-only lifecycle hooks. Add the Kibi repository marketplace, open Codex, then run `/plugins`, choose **Kibi Plugins**, and install `kibi-codex`:

```bash
codex plugin marketplace add Looted/kibi
codex
```

The repository marketplace is not the official OpenAI Plugin Directory; self-serve plugin publishing is not available there yet. Manual MCP configuration remains fully supported.

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

The optional `kibi-cursor` plugin adds rules, bundled skills, commands, and advisory hooks. See the [Cursor package guide](packages/cursor/README.md) for supported installation and behavior.

</details>

### Bundled agent guidance

Kibi's **skill subsystem** is the agent-guidance mechanism. It ships four reusable, bundled skills for operation safety, bootstrap, freshness, and traceability. Normal users can simply ask their agent to bootstrap; hosts use the bundled skills as infrastructure. MCP-capable agents can inspect them with `kb_skills_list` and `kb_skills_load`, and the same read-only operations are available through the trusted project-local CLI. Do not copy a long system prompt into the agent.

See [generic-agent onboarding](docs/generic-agent-onboarding.md) for the copy-paste discovery snippet, and [MCP reference](docs/mcp-reference.md#generic-agent-onboarding) for the progressive-disclosure and safety contract.

## Packages

| Package | Role |
| --- | --- |
| `kibi-core` | Prolog-backed knowledge graph, inference, and validation |
| `kibi-cli` | Human, agent, automation, and Git-hook interface |
| `kibi-mcp` | MCP surface exposing the public Kibi operation contracts |
| `kibi-opencode` | Optional OpenCode guidance and maintenance adapter |
| `kibi-codex` | Optional Codex skills, MCP, and lifecycle adapter |
| `kibi-cursor` | Optional Cursor rules, skills, MCP, and advisory hooks |
| `kibi-vscode` | VS Code knowledge explorer and traceability integration |

## Documentation

- [Installation guide](docs/install.md) — Prerequisites, package managers, client setup, and verification
- [GitHub badge + report](docs/github-integration.md) — Publish requirement health on GitHub Pages
- [CLI reference](docs/cli-reference.md) — Commands, flags, and structured JSON routes
- [MCP reference](docs/mcp-reference.md) — Tools, schemas, examples, and agent onboarding
- [Entity schema](docs/entity-schema.md) — Entity types, relationships, and semantic fact lanes
- [Inference rules](docs/inference-rules.md) — Validation and contradiction checks
- [Architecture](docs/architecture.md) — Storage, branch isolation, data flow, and components
- [Troubleshooting](docs/troubleshooting.md) — Common setup and recovery procedures
- [Generic-agent onboarding](docs/generic-agent-onboarding.md) — Copy-paste skill discovery for generic MCP/CLI agents

## Beta status

Kibi is in beta and ready for use in real projects. Public interfaces may still evolve before 1.0, so pin exact package versions when reproducibility matters.

Kibi is licensed under [AGPL-3.0-or-later](LICENSE.md).
