---
title: Packed Codex Plugin Resolves Consumer-Local MCP
status: active
priority: must
text_ref: documentation/tests/e2e/packed/codex-plugin.test.ts
tags:
  - test
  - e2e
  - packed
  - codex
  - plugin
  - mcp
  - consumer-local
id: TEST-codex-consumer-local-mcp-registration-v1
type: test
verification_scope: end_to_end
verification_perspective: consumer
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-codex-consumer-local-mcp-registration-v1
  required_case_symbols:
    - SYM-codex-packed-plugin-e2e
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
---
