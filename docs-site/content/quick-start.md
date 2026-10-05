---
title: Quick start
description: Paste one prompt into your coding agent to install Kibi, initialize it, and bootstrap the project model behind a plan you approve.
---

This page takes you from an empty repository to a bootstrapped, validated project model. It assumes you have a coding agent you can prompt (Claude Code, Cursor, Codex, OpenCode, VS Code, and other MCP clients all work) and commit access to the repository.

Kibi is meant to be run by your agent, not by hand, so the recommended setup is one prompt. The manual commands are still there if you want them.

## 1. Check the prerequisites

Kibi runs on **Node.js 22+**, and its deterministic checks run on SWI-Prolog. SWI-Prolog ships with Kibi as a per-platform npm package, so on Linux (x64 or arm64, glibc 2.28+) and macOS (Apple silicon or Intel) there is nothing else to install; the setup brings it along.

On other platforms, such as Alpine (musl) or native Windows, install **SWI-Prolog 9.0+** yourself and make sure `swipl` is on your `PATH` (on Windows, running Kibi inside WSL uses the bundled build). Platform instructions, the `KIBI_SWIPL` override, and what to do if an install skipped the bundled runtime are in the [installation guide](install.md).

## 2. Paste the setup prompt into your agent (recommended)

From your repository, give your coding agent this prompt:

```prompt
Set up Kibi (https://github.com/Looted/kibi) in this repository, then bootstrap its knowledge base.

1. Install: confirm Node.js 22+ is available. With the package manager this repository already uses, add kibi-core, kibi-cli and kibi-mcp as dev dependencies. Do not skip optional dependencies; the bundled SWI-Prolog runtime is one.
2. Initialize: run every `kibi` command through the package manager's local runner (npm: `npm exec -- kibi <command>`). Run `kibi init`; if it reports a problem, run `kibi doctor` and fix what it names. If this platform has no bundled SWI-Prolog, tell me what to install and stop.
3. Connect: register the project-local `kibi-mcp` server for the agent host you are running in, following https://looted.github.io/kibi/guide/connect-an-agent.html. Prefer project-scoped configuration, and ask me before installing a plugin or changing global settings. Until the kb_* tools are visible to you, use Kibi's CLI JSON routes instead.
4. Bootstrap: run `kibi skills load kibi-bootstrap --format markdown` and follow that skill exactly. It starts by asking me where product intent lives outside the code (issue trackers, wikis, specs) and which sources to trust; read them through the connectors you have and cite them. Show me the complete plan and its hash, and write nothing until I approve it.
5. Verify: run `kibi check` and `kibi status`, fix anything they report, and summarize what was added. Do not commit; I will review the changes.
```

The agent installs `kibi-core`, `kibi-cli`, and `kibi-mcp` with your package manager, runs `kibi init` to create the `.kb/` layout and the Git hooks that keep it synchronized, and registers Kibi's MCP server for itself. Some agents only see new MCP tools after a restart; until then they use the same operations through the CLI.

Next it interviews you. Code shows what the software does but rarely why, so the agent asks where product intent already lives (issue trackers such as Jira or YouTrack, wikis, specs, decision logs), which of those sources are authoritative and which are stale, and what it cannot reach yet. It reads the sources through the connectors it has, then combines what they say with what it finds in the codebase into a read-only bootstrap plan. Each requirement taken from a source cites the ticket or page it came from. Nothing is written until you approve it: the agent shows you the complete plan and its hash, you approve, and it applies the plan in one audited step, then validates the result.

> [!NOTE]
> Initialization does not invent product knowledge. Behavior enters when you approve the plan.

<details>
<summary>Manual installation</summary>

From your repository root:

```bash
npm install --save-dev kibi-core kibi-cli kibi-mcp
npm exec -- kibi init
```

If anything looks off, `npm exec -- kibi doctor` reports which SWI-Prolog Kibi is using (`bundled`, `KIBI_SWIPL`, or `PATH`) and whether its required libraries load. pnpm, Yarn, and Bun equivalents are in the [installation guide](install.md#manual-project-local-install).

Then [connect your coding agent](connect-an-agent.md) and ask it:

> Bootstrap Kibi for this repository.

</details>

Bootstrap validates every candidate before offering write actions. Claims that cannot be grounded stay cited authoring follow-ups; product intent takes priority over repository observations, and candidates beyond the limit are reported. Invalid approved plans are refused before any bootstrap write. Deterministic failures are terminal and require a corrected plan; interrupted writes and derived effects retain journal recovery.

Existing KBs upgrade to schema 7 with `kibi migrate --yes` followed by `kibi sync`. The migration preserves fact IDs and bodies while encoding legacy polarity-only facts as typed booleans; malformed strict facts now fail `kibi check`.

## 3. Approve the bootstrap plan

Read the plan the agent shows you. Check that requirements cite the sources you trust, answer any remaining questions the planner raises, and correct any product call it got wrong before you approve. Kibi never contacts your tracker or wiki itself; it records what the agent read and binds it into the plan's hash.

Bootstrap plans bind approval to the current workspace and KB snapshot, including the journal generation and revision. A changed KB requires a new plan and matching approval.

## 4. Look at the proof state

After bootstrap, ask your agent for the health report — or run it yourself:

```bash
npm exec -- kibi report --open
```

You get a self-contained HTML page. The headline is a count, such as "0 of 12 current requirements fully proven end-to-end." An honest zero on day one is a successful report: it exists to make gaps explicit. [Read the health report](reading-the-report.md) explains the rows.

## 5. Work normally

From here, prompt as usual. Ask for features, fixes, refactors. Your agent keeps the requirements, scenarios, tests, and code links in step with the code, and Kibi's validation gates run in the background on every change. Useful manual commands:

```bash
npm exec -- kibi status   # branch, snapshot freshness, migration state
npm exec -- kibi search login
npm exec -- kibi gaps req --format table
```

## Upgrading

After you update the Kibi packages, ask your agent to run `kibi migrate`, or run it yourself. It shows a plan and its hash and changes nothing; `kibi migrate --apply-safe --approved-plan-hash <hash>` applies the automatic steps you approved. The move to KB schema 6 records `origin: {kind: migration}` on the entities you already have and re-derives any requirement that `kibi sync` now rejects because the semantic advisor reads its prose differently. Claims that still match keep their grounding, and changed ones are marked unresolved. It also closes requirements that were superseded but left open, since `kibi check` now blocks them, and cleans up leftover `source` fields in entity frontmatter. Kibi always takes an entity's source from its own file, so `kibi migrate` removes values that name that file or point at nothing (`kibi check` blocks the second kind), and repoints pre-canonical paths such as `documentation/...` that name another moved knowledge file. Everything Kibi cannot decide for you, such as an exception nobody has approved or two requirements that supersede each other, stays in the plan as a review item.

## Next steps

- [Connect your coding agent](connect-an-agent.md) — per-client configuration.
- [Modeling requirements](modeling.md) — how intent becomes structured knowledge.
- [Publish requirement health](github-integration.md) — put the report and badge on GitHub Pages.
