---
title: A sed -i through the shell tool counts as a source edit
status: active
origin:
  kind: agent
  recorded_at: '2026-11-17T17:02:42.781Z'
id: SCEN-agent-hosts-shell-edits-count
type: scenario
---
Given a Kibi workspace with src/a.ts, when the agent runs sed -i, perl -i, a > or >> redirection or tee on src/a.ts through the host shell tool, directly or inside bash -lc as a string or argv, the hook counts src/a.ts as edited; sed -n, a shell without -c and other tools count nothing.
