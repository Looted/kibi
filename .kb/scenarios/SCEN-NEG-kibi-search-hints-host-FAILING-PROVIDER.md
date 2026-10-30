---
title: A throwing, invalid or late search hints provider gives no hints and a diagnostic
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-30T08:43:03.188Z'
id: SCEN-NEG-kibi-search-hints-host-FAILING-PROVIDER
type: scenario
---
Given a search hints provider that throws, returns an invalid result or answers after its time budget, when kb_search gets a weak answer and asks for hints, then the search still answers, shows no hints and reports a diagnostic.

This is the failure side of the host contract: a failing provider must not break or change the lexical answer. packages/cli/tests/search-hints.test.ts "a throwing, invalid or late provider gives no hints and a diagnostic" exercises it.
