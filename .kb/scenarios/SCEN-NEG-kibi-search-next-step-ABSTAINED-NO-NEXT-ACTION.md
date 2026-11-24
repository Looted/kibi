---
title: An abstained search with no hint names no next action
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-24T08:39:00.383Z'
id: SCEN-NEG-kibi-search-next-step-ABSTAINED-NO-NEXT-ACTION
type: scenario
---
Given an abstained kb_search whose hints are off, declined, failed or empty, when its structured result is read, then it names no next action, and a harness that shows only structured content tells the agent that nothing is recorded.

packages/cli/tests/public-mutation/operations/discovery-search.mutation.test.ts "an abstained search without a provider lists the requirement titles and carries the note" rejects it.