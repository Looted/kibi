---
title: An ordinary comment block without knowledge cues triggers no durable knowledge routing
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:23:34.214Z'
id: SCEN-NEG-opencode-comment-routing-ORDINARY-COMMENT
type: scenario
---
Given the packed OpenCode plugin with comment detection enabled and minLines 3, when an agent edits a Python file whose four-line comment only describes the arithmetic of the code, then guidance is still injected but carries no durable knowledge routing, while a cue-bearing docstring in another project is routed as a FACT.

This is the failure side of confidence filtering in comment routing: ordinary code commentary must not be pushed toward FACT, ADR or REQ entities. documentation/tests/e2e/packed/opencode-comment-guidance.test.ts "routes no durable knowledge guidance for an ordinary comment without knowledge cues" exercises it.
