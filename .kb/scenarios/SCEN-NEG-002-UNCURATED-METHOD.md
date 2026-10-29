---
title: A JSON-RPC call to a method outside the curated MCP surface is refused with method-not-found
status: active
expects: error
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:53:28.795Z'
id: SCEN-NEG-002-UNCURATED-METHOD
type: scenario
---
Given a running kibi-mcp server, when a client sends a JSON-RPC request for a method that is not part of the curated public surface, then the server answers with a JSON-RPC error of code -32601 (method not found) and performs no operation.

This is the failure side of the curated surface: anything outside the published tool list must be refused rather than handled. documentation/tests/e2e/packed/mcp-crud.test.ts "should return error for invalid method" exercises it against the packed server over stdio.
