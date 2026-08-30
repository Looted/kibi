---
title: Reusable Consumer-Local Plugin Launcher End-to-End Contract
status: active
priority: must
text_ref: documentation/tests/e2e/packed/cursor-plugin-launcher.test.ts
tags:
  - kibi
  - test
  - e2e
  - launcher
  - consumer-local
  - ontology
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
      target: default
  success_policy: all_required_first_attempt
id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
type: test
---
