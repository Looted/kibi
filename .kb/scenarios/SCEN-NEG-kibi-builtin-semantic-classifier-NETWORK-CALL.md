---
title: 'Classification succeeds while every network call fails'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-NEG-kibi-builtin-semantic-classifier-NETWORK-CALL
type: scenario
---
Given a fetch that throws on every call, when the builtin semantic classifier classifies the sentences, then it returns its decisions and fetch was never called.

This is the failure side of builtin classification: a classifier that reached the network would either fail or count a call here. documentation/tests/e2e/capability-plugins.e2e.ts, in its builtin providers section, exercises it.
