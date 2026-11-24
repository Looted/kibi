---
title: A project that configured nothing gets no search hints
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-24T08:21:15.386Z'
id: SCEN-NEG-kibi-search-hints-default-NOT-WITHOUT-CONFIG
type: scenario
---
Given a project that configures no search hints provider and has not declined the plugin, when kb_search gets a weak answer, then no provider answers and no hints are shown. This is the case the default exists to prevent: a question worded unlike the knowledge base gets no suggestion.

packages/cli/tests/plugins/bundled-search-hints.test.ts "answers when the project names no provider" rejects it.