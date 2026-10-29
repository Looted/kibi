---
title: A kb_search without a limit over more than ten matches is capped at ten rows and marked truncated
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:57:01.873Z'
id: SCEN-NEG-mcp-structured-text-per-host-UNBOUNDED-SEARCH
type: scenario
---
Given a synced KB with twelve requirements that match the same question, when an agent calls kb_search without a limit, then the answer is contained to ten ranked rows, count reports all twelve matches and truncated is true so the agent knows to page.

This is the failure side of the default search page size: a question that matches more rows than the default must not flood the host with an unbounded answer. packages/mcp/tests/server/structured-text-host.test.ts "kb_search without a limit returns ten ranked rows and says more remain" exercises it.
