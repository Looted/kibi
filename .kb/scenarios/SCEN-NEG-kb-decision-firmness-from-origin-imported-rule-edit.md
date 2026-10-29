---
title: An imported requirement without firmness reads as firm and its statement is not changed in place
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:00:27.829Z'
id: SCEN-NEG-kb-decision-firmness-from-origin-imported-rule-edit
type: scenario
---
Given a requirement imported from documentation that has no firmness field and no agent origin, when kb_upsert tries to change its statement or title in place without citing new human words, then the write is refused because the requirement reads as a firm decision, and the file on disk is unchanged.

This is the failure side of reading firmness from origin: an absent firmness field must not let an imported rule be rewritten as if an agent had drafted it. packages/cli/tests/commands/decision-firmness.test.ts "kb_upsert refuses to change a firm rule's statement or title and writes nothing" exercises it.
