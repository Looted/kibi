---
title: What is Kibi?
description: Kibi is an agent-native requirements compiler. It turns product intent into an enforceable model your coding agent carries with it — and proves.
---

You say what the software should do. Your coding agent writes the code. Kibi keeps those two attached: the behavior you asked for, the code that is supposed to do it, and evidence that it still does.

Kibi compiles product intent into a structured, checkable model — requirements, scenarios, tests, facts, and code links — that lives beside your code and travels with every branch.

Your agent does the routine work: authoring and updating the model as the code changes. Kibi does the unforgiving part: checking that the model stays coherent, that the code still maps to it, and that claims of "done" are backed by fresh evidence.

## The problem it solves

AI agents forget. Context windows roll over, sessions end, and the reasoning behind yesterday's change quietly disappears. Intent gets scattered across prompts, tickets, and conversations, and nothing connects it to the code that was supposed to implement it.

Kibi makes project memory part of the agent workflow instead of hoping the agent remembers. It brings the relevant product context back into the work automatically, and it treats undocumented or unproven behavior as a gap — not as success.

## How it fits into your work

You keep working the way you already do: prompt your agent, review its changes, merge. Underneath, a loop runs:

1. **You state intent.** "Draft edits must auto-save when the user navigates away."
2. **The agent compiles it.** Your coding agent turns the prompt into typed requirements, scenarios, tests, and links to the code symbols that implement them.
3. **Kibi checks it.** A deterministic Prolog layer verifies schemas, coherence, traceability, and contradictions before anything becomes accepted project knowledge.
4. **Evidence closes the loop.** Proof-bearing tests record fresh end-to-end results tied to the current code snapshot, and a health report shows exactly what is proven and what is still waiting.

Nothing about this requires you to maintain a parallel requirements bureaucracy. The prompt is the interface; humans resolve genuine product decisions, agents own the bookkeeping.

## What you will see

- A `.kb/` directory in your repository holding the branch-local project model.
- Git hooks that keep the model synchronized as you work.
- New tools available to your agent, through MCP or the `kibi` CLI: search, query, gap analysis, coverage, validation, and proof.
- A self-contained HTML health report and a status badge you can publish, showing the percentage of requirements with current proof.

## What Kibi is not

- **Not a ticket system.** It does not replace your issue tracker; it connects intent to code and evidence.
- **Not a passive memory store.** Retrieval alone cannot tell you a requirement is contradictory or a test is stale. Kibi checks.
- **Not an oracle.** Prolog proves what has been encoded. Ambiguity and missing knowledge stay explicitly visible instead of being dressed up as consistency.

## Where to go next

- [Quick start](quick-start.md) — install Kibi and bootstrap your repository.
- [Read the health report](reading-the-report.md) — what proven, a proof gap, and a contradiction mean.
- [How Kibi works](how-it-works.md) — the mental model behind the loop.
- [Connect your coding agent](connect-an-agent.md) — wire Kibi into your client.
