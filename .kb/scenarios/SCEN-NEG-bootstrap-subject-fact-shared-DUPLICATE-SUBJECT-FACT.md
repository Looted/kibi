---
title: Claims about one subject from two sources share one subject fact instead of duplicating it
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:04:54.154Z'
id: SCEN-NEG-bootstrap-subject-fact-shared-DUPLICATE-SUBJECT-FACT
type: scenario
---
Given intent claims from two knowledge sources about the same subject key, when bootstrap plans them, then one subject fact is planned for that key and every requirement about the subject links to it.

This is the failure side of shared subject facts: two sources must not produce two competing facts for one subject. packages/cli/tests/consumer/bootstrap-write-failures.test.ts "claims about one subject from two sources share one subject fact" exercises it.
