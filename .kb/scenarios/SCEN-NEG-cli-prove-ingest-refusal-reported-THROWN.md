---
title: A refused ingest that ends kibi prove without a summary is caught
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-20T16:10:50.786Z'
id: SCEN-NEG-cli-prove-ingest-refusal-reported-THROWN
type: scenario
---
Given an integration whose artifact proof ingest refuses, when kibi prove throws the refusal instead of reporting it, then the prove command tests fail because no JSON summary is printed. An error that is not a refusal (an engine failure) must still end the command, and the tests check that it does.