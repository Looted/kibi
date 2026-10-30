---
title: A gold question the built CLI cannot answer fails the repository search gate
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:59:58.122Z'
id: SCEN-CASE-kibi-search-gold-set-gate-unasked-gold-question
type: scenario
---
Given a consumer KB built through the kibi CLI and a gold set with one blank question the CLI rejects, when the repository search gate runs, then it exits non-zero without printing an evaluation and names the failed kibi search call, so a gold question that was not asked through the CLI cannot pass silently.

scripts/tests/repo-search-gold-gate.test.ts "a gold question the CLI cannot answer fails the gate" exercises this edge case through the gate script as the proof workflow runs it. It covers one gold question not asked through the built CLI, `gold_questions_not_asked_through_built_cli_in_proof_workflow gt 0`.
