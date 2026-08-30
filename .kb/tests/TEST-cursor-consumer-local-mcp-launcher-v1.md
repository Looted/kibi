---
title: Cursor Consumer-Local MCP Launcher Verification
status: active
tags:
  - test
  - cursor
  - plugin
  - mcp
  - consumer-local
  - launcher
  - verification
priority: must
id: TEST-cursor-consumer-local-mcp-launcher-v1
type: test
text_ref: documentation/tests/e2e/packed/cursor-plugin-launcher.test.ts
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-cursor-packed-launcher-e2e
      target: default
  success_policy: all_required_first_attempt
---
