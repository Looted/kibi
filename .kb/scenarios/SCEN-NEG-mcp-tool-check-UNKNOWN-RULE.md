---
title: A kb_check call naming a rule outside the registry fails input validation
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:01:03.446Z'
id: SCEN-NEG-mcp-tool-check-UNKNOWN-RULE
type: scenario
---
Given an MCP server over a synced KB, when an agent calls kb_check with rules ["no-such-rule"], then the call fails MCP input validation with an error pointing at rules[0] instead of running an empty rule selection that would report no violations.

This is the failure side of rule filtering in kb_check: a misspelled or unknown rule name must not look like a clean check result. documentation/tests/e2e/packed/mcp-crud.test.ts "should reject a kb_check rule outside the generated registry" exercises it.
