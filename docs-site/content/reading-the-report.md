---
title: Read the health report
description: How to open the requirement-health report and what proven, a proof gap, stale evidence, and a contradiction mean.
---

The health report is the page you read. It is a single HTML file generated from one coverage snapshot. It does not call a server, and it does not fetch fonts or images.

## Open it

From the repository root:

```bash
npm exec -- kibi report --open
```

That writes `kibi-report/index.html` and `kibi-report/badge.svg` together, then opens the HTML file. Use your package manager's local runner if you are not on npm (`pnpm exec kibi report --open`, `yarn exec kibi report --open`).

## The number at the top

The score is a count, not a mood:

> 4 of 11 current requirements fully proven end-to-end

The percentage is that fraction. The numerator is requirements with fresh end-to-end evidence on this code. The denominator is current requirements. An honest zero on the day you bootstrap is a working report.

> [!NOTE]
> A passing test suite, a coverage percentage, and an old receipt are not this number. The report keeps those facts separate from proof.

## What the page is showing you

Each requirement sits on a ladder. The report names the earliest thing still missing, and it totals these across the branch:

- **Fully proven** — a test that claims this requirement has fresh end-to-end evidence for the current code snapshot.
- **Proof gap** — the chain is incomplete. Typical gaps are a missing scenario, incomplete semantics, or evidence that was never recorded.
- **Stale evidence** — a receipt exists, and the code has moved since. It stops counting as proof until the test is run again.
- **Contradiction** — two encoded claims about the same behavior disagree. Kibi will not pick a winner.
- **Unowned production symbols** — code the model does not yet connect to a requirement.

Color repeats the word. Do not read status from color alone.

## What you do with a row

| What you see | What you do |
| --- | --- |
| Fully proven | Nothing, until the code changes. |
| Proof gap | Ask the agent to close that gap, or decide the behavior is not a requirement. |
| Stale evidence | Re-run the test that claims to prove it. |
| Contradiction | You choose which claim is the product. The agent updates the model. |
| Unowned symbol | Ask the agent which requirement that code implements, or whether it should. |

You do not edit the report. The next `kibi report` rebuilds it from the repository.

## Go deeper

- [The proof ladder](proof-ladder.md) — the stages a requirement climbs before it counts as proven.
- [Publish requirement health](github-integration.md) — put this report and its badge on GitHub Pages.
- [Quick start](quick-start.md) — generate the report for the first time.
