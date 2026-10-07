---
title: A staged success scenario that a current requirement forbids fails kibi check --staged, and an unrelated staged change over the committed violation passes
status: active
tags:
  - check
  - staged
  - scenario-feasibility
expects: success
origin:
  kind: agent
  recorded_at: '2026-10-06T18:18:38.165Z'
id: SCEN-cli-staged-consistency
type: scenario
---
Staging a success scenario that a current requirement forbids makes `kibi check --staged` fail with the scenario-feasibility finding. Staging an unrelated change on top of a violation that is already committed passes, because the base commit's tree already has that violation.

The scenario ties REQ-cli-staged-consistency to what a contributor sees at commit time. Before the change, the pre-commit hook passed such a commit and only a later full `kibi check` failed on the same tree. The scenario also pins the opposite side: a commit must not be blocked for a consistency violation it did not introduce. Source: commit 21b889a4.
