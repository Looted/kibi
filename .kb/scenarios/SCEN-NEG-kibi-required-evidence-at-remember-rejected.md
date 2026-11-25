---
title: At level remember a write that raises a floor to tested or proved is refused
status: active
expects: rejection
text_ref: packages/cli/src/public/operations/level-evidence.ts
tags:
  - negative-path
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T09:48:42.145Z'
id: SCEN-NEG-kibi-required-evidence-at-remember-rejected
type: scenario
---
Given a project at level remember, when kb_upsert or kb_record writes a requirement that raises required_evidence to tested or proved, then the write is refused with LEVEL_DOES_NOT_CHECK_EVIDENCE, saying a person chooses level test first; keeping or lowering the floor is not refused.
