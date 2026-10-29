---
title: A requirement without passing end-to-end proof is never reported as tested or proved
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:12:51.963Z'
id: SCEN-NEG-kibi-evidence-levels-overstated-level
type: scenario
---
Given a packed sandbox whose hand-authored requirement has no passing end-to-end proof, when `kibi coverage` reports evidence levels, then no row without tested proof status is reported as tested, no row is reported as proved, and the hand-authored requirement reads as asserted.

This is the failure side of evidence levels: the reported level must never overstate the evidence a requirement actually has. documentation/tests/e2e/packed/cli-workflows.test.ts "should report the evidence level of every requirement" exercises it.
