---
title: An agent reads how strong the evidence behind each requirement is
status: active
priority: should
tags:
  - proof
  - coverage
  - evidence
origin:
  kind: agent
  recorded_at: '2026-10-23T12:08:49.277Z'
id: SCEN-kibi-evidence-levels
type: scenario
---
Given a synced repository whose hand-written requirement has no passing end-to-end proof, when the agent runs kibi coverage --by req --include-passing, then every row carries proof version kibi.requirement-proof.v4, an evidence level of proved, tested, asserted or unverified and the evidence entries that earned it, no row reports the old status proven, the hand-written requirement reads as asserted because a person stands behind it, and the summary counts rows per evidence level. When the agent filters coverage by the status tested it succeeds, and the status proven is rejected. When the person opens the report or runs kibi signoff, the same evidence level is shown next to the requirement, so a requirement nothing checks never reads as proven.