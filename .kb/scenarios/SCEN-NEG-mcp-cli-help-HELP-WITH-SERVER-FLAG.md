---
title: kibi-mcp --help --diagnostic-mode prints help and exits without starting the stdio server
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:21:15.792Z'
id: SCEN-NEG-mcp-cli-help-HELP-WITH-SERVER-FLAG
type: scenario
---
Given the packed kibi-mcp binary, when it is run with --help together with --diagnostic-mode, a flag that only matters to a running server, then it exits with code 0, prints the usage text, writes nothing to stderr and emits no JSON-RPC output, so no stdio server starts or waits for input.

This is the failure side of top-level help: a server flag next to the help flag must not pull the binary into stdio mode. documentation/tests/e2e/packed/mcp-cli-help.test.ts "should display help with --help --diagnostic-mode" exercises it.
