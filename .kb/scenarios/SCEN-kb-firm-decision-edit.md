---
title: A firm rule's claim changes only with new human words
status: active
priority: must
tags:
  - kb
  - decisions
origin:
  kind: agent
  recorded_at: '2026-10-14T08:00:09.906Z'
id: SCEN-kb-firm-decision-edit
type: scenario
---
Given a current requirement imported from a person's document with no firmness, when an agent sends kb_upsert with a changed statement, title or a lower firmness, then the write is refused, the dry run reports it invalid and the file is unchanged; a change to its context section or tags is written.

Given the same requirement committed at HEAD, when its statement is edited directly on disk, then kb_check reports decision-firm-edited for it, and the finding clears once the edit carries a new origin.ref.

Given the person's agreement, when kb_upsert changes the title and statement with origin.ref to their words, then the write succeeds.

This exists because agents rewrote firm rules in place instead of superseding them or asking; the guard keeps the rule's words owned by the person who stated them.
