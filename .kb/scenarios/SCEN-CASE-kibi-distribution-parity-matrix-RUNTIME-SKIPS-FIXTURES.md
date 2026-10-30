---
title: The parity gate fails when an audited runtime never runs the canonical fixture set
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:51:54.078Z'
id: SCEN-CASE-kibi-distribution-parity-matrix-RUNTIME-SKIPS-FIXTURES
type: scenario
---
Given a parity run that declares a project-resolved audited CLI runtime but records no observation for it, when the shipped parity matrix builds its report, then the report status is failed, it lists a missing_capability_observation issue for every canonical capability of that runtime, and each of its rows is missing and not compared.

This covers the value past the bound, `gt 0`, of the claim that every audited runtime runs the canonical fixture set. documentation/tests/e2e/packed/distribution-parity-matrix.test.ts "fails the gate when capability evidence has zero or two states or an audited runtime skips the fixture set" exercises it through the packed distribution-parity module.
