---
title: A decision written without firmness is read as default and may not replace a firm decision
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T22:11:03.790Z'
id: SCEN-NEG-kb-decision-firmness-rule-ids-UNSET-AS-FIRM
type: scenario
---
Given a firm requirement with a human reference, when kb_upsert writes a requirement without firmness that supersedes it and kb_check runs, then the new requirement is read with firmness default and kb_check reports decision-firm-superseded and supersedes-reason-missing for it until it is made firm with a reference and explains the change.

This is the failure side of the default firmness: a decision written without firmness must not count as firm and replace a firm decision. packages/cli/tests/commands/decision-firmness.test.ts "kb_check blocks an unexplained supersede and a default decision replacing a firm one" exercises it.
