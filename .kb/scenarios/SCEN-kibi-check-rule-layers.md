---
title: The verification layer holds exactly the rules that ask for tests or proof
status: active
expects: success
tags:
  - check
  - rules
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T08:31:56.770Z'
id: SCEN-kibi-check-rule-layers
type: scenario
---
Given the check-rule registry, when Kibi reads each rule's layer, then every rule is either knowledge or verification, the verification layer holds exactly evidence-floor, symbol-coverage, must-priority-coverage, must-positive-scenario, proof-contract-claims and proof-contract-symbols, and the Prolog registry states the same layer for each rule as the TypeScript registry.
