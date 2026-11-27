---
title: The bundled provider answers beside a configured one
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-24T08:21:16.834Z'
id: SCEN-NEG-kibi-search-hints-default-BESIDE-CONFIGURED
type: scenario
---
Given a project that configures its own kibi.search-hints.v1 provider in any mode, when kb_search gets a weak answer, then the bundled provider also answers or replaces the configured one.

packages/cli/tests/plugins/bundled-search-hints.test.ts "gives way to any provider the project configured, in any mode" rejects it.