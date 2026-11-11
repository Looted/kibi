---
title: MCP and the CLI refuse invalid plan-bootstrap input with one coded error
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
Given a packed consumer workspace, when kb_plan_bootstrap over MCP and the plan-bootstrap CLI JSON route each receive an input with a field the shared planner does not define, or a value of the wrong type, then both refuse it with a VALIDATION_FAILED error that names the field; the CLI adds only a hint naming its --schema flag.

This is the failure side of routing adapters to the shared planner: no adapter may keep its own bootstrap contract. documentation/tests/e2e/packed/mcp-cli-operation-parity.test.ts "refuses plan-bootstrap input the shared planner does not define, or of the wrong type, with the same coded error on MCP and the CLI JSON route" exercises it.
