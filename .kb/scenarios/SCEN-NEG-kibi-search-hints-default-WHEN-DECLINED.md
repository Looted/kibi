---
title: A project that declined the plugin still gets the bundled provider
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-24T08:21:16.126Z'
id: SCEN-NEG-kibi-search-hints-default-WHEN-DECLINED
type: scenario
---
Given a project whose package.json lists kibi-plugin-search-hints in kibi.declinedPlugins, when kb_search gets a weak answer, then the bundled provider still answers and shows hints.

packages/cli/tests/plugins/bundled-search-hints.test.ts "stays off for a project that declined the plugin" rejects it.