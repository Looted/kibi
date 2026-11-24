---
title: Search hints are on for a project that configured nothing
status: active
origin:
  kind: agent
  recorded_at: '2026-11-24T08:21:14.657Z'
id: SCEN-kibi-search-hints-default
type: scenario
expects: success
---
Given a project whose package.json names no kibi.search-hints.v1 provider and does not list kibi-plugin-search-hints in kibi.declinedPlugins, when kb_search gets a weak or abstained intent answer, then the bundled kibi-plugin-search-hints answers as the replace provider, loaded from Kibi's own install, and its provider stamp reads as not external.

packages/cli/tests/plugins/bundled-search-hints.test.ts "answers when the project names no provider" and "is the shipped kibi-plugin-search-hints package by default" exercise it.