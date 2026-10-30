---
title: kb_upsert refuses an in-place change to a firm requirement's statement or title and writes nothing
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:01:08.018Z'
id: SCEN-NEG-kb-firm-decision-edit-in-place-claim-edit
type: scenario
---
Given a current firm requirement committed at HEAD, when kb_upsert changes its statement or title in place without citing new human words, then the write is refused with a message that the requirement is a firm decision, and the requirement file is unchanged.

This is the failure side of firm decision editing: a firm rule only changes when a person's new words are cited, never by a silent rewrite. packages/cli/tests/commands/decision-firmness.test.ts "kb_upsert refuses to change a firm rule's statement or title and writes nothing" exercises it.
