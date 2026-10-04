---
title: Leftover config.json cannot weaken canonical enforcement
status: active
fact_kind: observation
tags:
  - canonical-layout
  - enforcement
id: FACT-canonical-kb-contract
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
After the canonical `.kb/` contract, leftover `.kb/config.json` is recognized only for one-way migration. It cannot relocate entity paths, disable canonical checks, or enable `requireAdr` as a project knob. `kibi check --rules` remains an invocation-time diagnostic filter only.
