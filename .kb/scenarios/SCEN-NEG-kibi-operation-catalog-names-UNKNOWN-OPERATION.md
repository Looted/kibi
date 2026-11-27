---
title: A CLI JSON route naming an operation outside the catalog is refused with the coded UNKNOWN_OPERATION error and runs nothing
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
Given the operation catalog in packages/cli/src/public/operations/catalog.ts (the 27 entries REQ-kibi-operation-catalog-names names), when a CLI JSON route names an operation that is not one of them, then it is refused with the coded UNKNOWN_OPERATION error (exit 2, status error, message "Unknown operation '<name>'.") and executes nothing. packages/cli/tests/cli-protocol.test.ts ('returns exit 2 for an unknown operation') and packages/cli/tests/cli-protocol-mutation.test.ts ('an unknown operation is an input error with no effects') assert it. documentation/tests/e2e/packed/mcp-cli-operation-parity.test.ts, run by TEST-kibi-operation-interface-parity, covers the refusal of invalid input on both surfaces and the parity of every catalog entry, not an unknown operation name; no test asserts that an MCP composite call naming an unknown operation is refused with the same code.