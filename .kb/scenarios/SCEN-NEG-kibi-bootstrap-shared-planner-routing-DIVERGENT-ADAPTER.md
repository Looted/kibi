---
title: MCP and the CLI refuse an undefined plan-bootstrap field with one error
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T05:00:00.000Z'
id: SCEN-NEG-kibi-bootstrap-shared-planner-routing-DIVERGENT-ADAPTER
type: scenario
---
Given a packed consumer workspace, when kb_plan_bootstrap over MCP and the plan-bootstrap CLI JSON route each receive an input with a field the shared planner does not define, then both refuse it with the same VALIDATION_FAILED error that names the field.

This is the failure side of routing adapters to the shared planner: no adapter may keep its own bootstrap contract. documentation/tests/e2e/packed/mcp-cli-operation-parity.test.ts "refuses a plan-bootstrap input the shared planner does not define with the same coded error on MCP and the CLI JSON route" exercises it.
