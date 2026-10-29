---
title: An ambiguous unit is never equated with a known unit when checks look for redundancy
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:22:13.021Z'
id: SCEN-NEG-kibi-unit-canonicalization-AMBIGUOUS-UNIT
type: scenario
---
Given three requirements bounding the same upload size, at 1 KB, 1 kB and 1000 B, when kibi check runs domain-redundancy, then only the 1 kB and 1000 B pair is reported as redundant, and the requirement in KB, whose size could be 1000 or 1024 bytes, is never equated with either.

This is the failure side of unit canonicalization: a spelling that names no single conversion must not be folded into a base unit. documentation/tests/e2e/packed/vocabulary-convergence.test.ts "never equates an ambiguous unit with a known one when looking for redundancy" exercises it.
