---
id: SCEN-kibi-conservative-requirement-proof
title: Inspect conservative proof separately from structural coverage
status: active
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
source: documentation/scenarios/SCEN-kibi-conservative-requirement-proof.md
tags: [requirements, proof, coverage, e2e]
links:
  - type: verified_by
    target: TEST-kibi-conservative-requirement-proof
---

Given a structurally linked requirement whose semantic inventory, scenario E2E path, executable test symbol, production symbol coverage, or source coordinates are incomplete, when `kb_coverage` runs, then the row retains its compatibility-oriented structural coverage fields while reporting a non-proven `proofStatus`, failed or unresolved proof stages, stable gap codes, and ranked repair actions.

Given a requirement with a complete proposition ledger, exactly one valid logical grounding per modeled claim, no detected contradiction, a requirement-specified scenario with a passing end-to-end test, an executable symbol for that test, production symbols implementing the requirement and covered by that test, and exact source coordinates for every proof-bearing symbol, when `kb_coverage` runs, then the proof outcome is `proven` with inspectable stage evidence.
