---
id: SCEN-opencode-kibi-briefing-v4
title: "OpenCode Kibi Briefing v4: Render-First Delivery Scenarios"
status: closed
created_at: 2026-04-29T10:00:00Z
updated_at: 2026-04-30T10:00:00Z
source: documentation/scenarios/SCEN-opencode-kibi-briefing-v4.md
tags:
  - scenario
  - opencode
  - briefing
  - render-first
links:
  - type: relates_to
    target: REQ-opencode-kibi-briefing-v4
---

**Scenario: Render-First Delivery — Brief appended at idle time**
19#YT|
20#KH|**GIVEN** an active OpenCode session with `briefs.enabled: true` and `briefs.channels.tui: true`
21#HV|**WHEN** an idle briefing is generated and persisted to `.kb/briefs/`
22#BB|**THEN** the TUI should attempt immediate delivery via `appendPrompt`
23#WT|**AND** if successful, the brief is marked `unread: false`.
24#HY|
25#NN|**Scenario: Prompt-Time Replay — Unread brief surfaced on next transform**
26#ZK|
27#BP|**GIVEN** an unread brief exists in `.kb/briefs/` for the current branch
28#XN|**WHEN** the next `experimental.chat.system.transform` cycle runs
29#XX|**THEN** the brief must be appended via `appendPrompt`
30#JB|**AND** the brief is marked `unread: false`
31#WV|**AND** the same brief must not be replayed in subsequent cycles.
32#PY|
33#ZH|**Scenario: Failed Replay Leaves Brief Unread**
34#HQ|
35#BT|**GIVEN** an unread brief exists for the current branch
36#NV|**WHEN** the transform cycle runs but `appendPrompt` is unavailable or fails
37#YZ|**THEN** the brief must remain `unread: true` for a later retry.
38#JR|
39#QY|**Scenario: Branch Isolation — Only current branch briefs replayed**
40#ZJ|
41#BP|**GIVEN** unread briefs exist for both `main` and `feat-x` branches
42#XN|**WHEN** the transform cycle runs while on the `feat-x` branch
43#XX|**THEN** only the `feat-x` brief should be replayed.

**Scenario: Channel Gating — Delivery suppressed by config**
28#HQ|
29#BT|**GIVEN** a config where `briefs.channels.tui: false`
30#NV|**WHEN** an unread briefing envelope exists
31#YZ|**THEN** the OpenCode TUI must NOT append the briefing to the prompt guidance during transform
32#JR|**AND** the briefing remains available only via manual `/brief-kibi` command.
33#QY|
34#ZJ|**Scenario: Manual Retrieval — /brief-kibi force-renders context**
35#TX|
36#XT|**GIVEN** an active session
37#KY|**WHEN** the agent executes the `/brief-kibi` command
38#NB|**THEN** the plugin must invoke `kb_briefing_generate` immediately
39#YY|**AND** it must render the full briefing block regardless of the idle envelope state.
