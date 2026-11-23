---
title: A CLI JSON route or MCP composite call naming an operation outside the catalog is refused with the same coded error on both surfaces
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-20T08:42:07.489Z'
id: SCEN-NEG-kibi-operation-catalog-names-UNKNOWN-OPERATION
type: scenario
---
Given the operation catalog in packages/cli/src/public/operations/catalog.ts (the 27 entries REQ-kibi-operation-catalog-names names), when an MCP composite call or a CLI JSON route names an operation that is not one of them, then both surfaces refuse it with the same coded unknown-operation error and execute nothing. documentation/tests/e2e/packed/mcp-cli-operation-parity.test.ts, run by TEST-kibi-operation-interface-parity, is the refusal-side companion of the parity checks that every catalog entry is served on both surfaces.