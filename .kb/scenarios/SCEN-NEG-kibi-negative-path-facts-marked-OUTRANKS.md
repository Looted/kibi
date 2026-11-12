---
title: A negative-path fact never outranks the requirement it guards
status: active
expects: rejection
tags:
  - negative-path
  - search
origin:
  kind: agent
  recorded_at: '2026-11-11T17:20:36.864Z'
id: SCEN-NEG-kibi-negative-path-facts-marked-OUTRANKS
type: scenario
---
Given a negative-path fact whose words match the question better than the requirement it guards, when kb_search ranks both, the requirement comes first, the fact follows it with its own score kept as evidence, and the fact is not counted as a rival that makes the answer ambiguous. packages/cli/tests/negative-path-facts.test.ts "marked, it follows its requirement and is no rival to it" exercises it.

This is the failure side of the negative-path facts requirement.