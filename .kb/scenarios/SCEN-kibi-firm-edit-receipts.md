---
title: The agent records that an edit keeps a firm rule, and the receipt lapses when the rule or the code changes
status: active
expects: success
tags:
  - firmness
priority: must
origin:
  kind: agent
  recorded_at: '2026-11-16T06:59:06.541Z'
id: SCEN-kibi-firm-edit-receipts
type: scenario
---
Given a symbol that implements a current firm requirement, when the agent runs kibi review-firm-edit with a keeps verdict and a note, then a receipt is written under .kb/firm-edit-reviews, bound to the requirement's statement hash and the symbol's code hash. When the requirement's statement or the symbol's code later changes, or the requirement is superseded, the receipt no longer matches.