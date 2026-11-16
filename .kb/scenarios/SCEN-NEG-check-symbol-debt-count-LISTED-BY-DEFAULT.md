---
title: A plain check that lists symbol debt per file fails the contract
status: active
expects: rejection
tags:
  - negative-path
  - check
  - symbols
origin:
  kind: agent
  recorded_at: '2026-11-16T15:47:00.000Z'
id: SCEN-NEG-check-symbol-debt-count-LISTED-BY-DEFAULT
type: scenario
---
Given the same repository, a plain kibi check or kb_check whose output names an unrecorded declaration, or whose symbolDebt carries files without being asked, fails the packed test's assertions.

## Context

The failure side of the symbol debt count.