---
title: Requirements about a shared subject key are never planned without a subject fact
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:56:41.715Z'
id: SCEN-CASE-bootstrap-subject-fact-shared-NO-SUBJECT-FACT
type: scenario
---
Given intent claims about the same subject key from two knowledge sources, when bootstrap plans them, then exactly one subject fact is planned for that key and both requirements link to it with constrains, so a plan that left the key without a subject fact is caught.

This covers the value below the bound, `lt 1` on `subject_facts_per_subject_key`. packages/cli/tests/consumer/bootstrap-write-failures.test.ts "claims about one subject from two sources share one subject fact" exercises it by asserting one subject fact for the key and two constrains links to it.
