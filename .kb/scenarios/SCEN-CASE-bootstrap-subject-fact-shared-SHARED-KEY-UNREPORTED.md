---
title: A subject key shared by claims from two sources is always reported in the plan diagnostics
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:56:51.918Z'
id: SCEN-CASE-bootstrap-subject-fact-shared-SHARED-KEY-UNREPORTED
type: scenario
---
Given intent claims about the same subject key from two knowledge sources, when bootstrap plans them, then the plan diagnostics hold one subject-key-shared line naming the key and both sources, so a shared key the plan kept silent about is caught.

This covers one violating item past the invariant, `gt 0` on `unreported_shared_subject_keys`. packages/cli/tests/consumer/bootstrap-write-failures.test.ts "claims about one subject from two sources share one subject fact" exercises it by asserting the subject-key-shared diagnostic names the key and both source references.
