---
title: Bootstrap intent claim accounting
status: active
fact_kind: subject
subject_key: bootstrap.intent_claim_accounting
origin:
  kind: agent
  ref: 'Maintainer request, 2026-10-06: fix bootstrap truncation after a test project onboarding rerun'
  recorded_at: '2026-10-06T11:35:40.478Z'
id: FACT-bootstrap-intent-claim-accounting-subject
type: fact
---

The bookkeeping a bootstrap plan keeps for intent claims: every declared claim is kept and accounted for per source, discovered candidates get their own budget, and suppressed candidates are summarized by reason. It covers counting and budgets, not how a claim is written.
