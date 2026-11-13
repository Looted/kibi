---
title: Unmodeled claims in a pair with another current requirement pass kibi check
status: active
priority: must
expects: rejection
tags:
  - negative-path
  - contradictions
origin:
  kind: agent
  recorded_at: '2026-11-13T09:00:00.000Z'
id: SCEN-NEG-kb-unmodeled-pair-UNREPORTED
type: scenario
---
Given a current requirement whose rule claims stay unmodeled while it relates_to another current requirement, or while its ontology_gap claims name a subject that requirement is about, when kibi check runs with no verdict on the pair, then it must report the requirement under related-requirement-unmodeled, so a check that let the pair pass unexamined is caught.

packages/cli/tests/consumer/related-requirement-unmodeled.test.ts exercises both pairings end to end.
