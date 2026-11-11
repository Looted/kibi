---
title: 'An unlisted analyzer and an edited installed analyzer file are refused'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-NEG-kibi-approved-source-analyzers-UNAPPROVED-RUNS
type: scenario
---
Given the same fixture, when the maintenance source set names kibi-unapproved-analyzer, then fingerprinting throws "Source analyzer is not approved for impact review: kibi-unapproved-analyzer"; and when one pinned file of the installed Tree-sitter analyzer is changed, verifying it against its approval throws "Source analyzer integrity mismatch".

This is the failure side of approved source analyzers. documentation/tests/e2e/packed/impact-review-stage-e.test.ts, in its derived coordinate workflow, exercises it.
