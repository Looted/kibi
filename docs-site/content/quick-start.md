---
title: Quick start
description: Install Kibi, initialize it in your repository, and let your coding agent bootstrap the project model in one guided step.
---

This page takes you from an empty repository to a bootstrapped, validated project model. It assumes you have a coding agent you can prompt (OpenCode, Codex, Cursor, and other MCP clients all work) and commit access to the repository.

## 1. Install the prerequisite

Kibi's deterministic checks run on SWI-Prolog. Install **SWI-Prolog 9.0+** and make sure `swipl` is on your `PATH`:

```bash
swipl --version
```

Platform-specific instructions — Ubuntu, macOS, Windows, and other Linux distributions — are in the [installation guide](install.md).

## 2. Add Kibi to your project

From your repository root:

```bash
npm install --save-dev kibi-core kibi-cli kibi-mcp
npm exec -- kibi init
```

`kibi init` creates the local infrastructure: the `.kb/` directory layout and the Git hooks that keep it synchronized. It does **not** invent product knowledge — that comes from your intent and your agent.

## 3. Let your agent bootstrap the repository

This is the one prompt that does the heavy lifting. Ask your coding agent:

> Bootstrap Kibi for this repository.

The agent discovers Kibi's bundled workflow guidance, analyzes the codebase, and produces a read-only bootstrap plan. Nothing is written until you approve it: the agent shows you the complete plan and its hash, you approve, and it applies the plan in one audited step, then validates the result.

## 4. Look at the proof state

After bootstrap, ask your agent for the health report — or run it yourself:

```bash
npm exec -- kibi report --open
```

You get a self-contained HTML page showing, per requirement: what is proven, what has no scenario or test yet, what is contradictory, and what evidence has gone stale. An honest 0% is fine on day one — the report exists to make gaps explicit, not to shame anyone.

## 5. Work normally

From here, prompt as usual. Ask for features, fixes, refactors. Your agent keeps the requirements, scenarios, tests, and code links in step with the code, and Kibi's validation gates run in the background on every change. Useful manual commands:

```bash
npm exec -- kibi status   # branch, snapshot freshness, migration state
npm exec -- kibi search login
npm exec -- kibi gaps req --format table
```

## Next steps

- [Connect your coding agent](connect-an-agent.md) — per-client configuration.
- [Modeling requirements](modeling.md) — how intent becomes structured knowledge.
- [Publish requirement health](github-integration.md) — put the report and badge on GitHub Pages.
