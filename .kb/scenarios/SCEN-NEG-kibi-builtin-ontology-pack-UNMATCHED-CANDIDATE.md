---
title: 'Prose that no rule matches gets no predicate candidate'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-NEG-kibi-builtin-ontology-pack-UNMATCHED-CANDIDATE
type: scenario
---
Given the sentence "Session tokens should be handled carefully.", when the builtin ontology pack matches it, then it returns no candidate.

This is the failure side of builtin ontology matching: the pack never invents a predicate the rules do not support. documentation/tests/e2e/capability-plugins.e2e.ts, in its builtin providers section, exercises it.
