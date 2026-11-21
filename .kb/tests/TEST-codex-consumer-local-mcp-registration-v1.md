---
title: Packed Codex Plugin Resolves Consumer-Local MCP
status: passing
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
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-codex-packed-plugin-e2e
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c7bb83186a4176b57861d16c
    test_id: TEST-codex-consumer-local-mcp-registration-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 7b29e35547a59070b55bf4c40c2104f6669e91783ae4db028daf1e6469cd02d3
    binding_hash: 285921e6d9bf2f05a9b428062e4abb36c9dcb8897b1e8f6e4946129eaa4efb70
    fingerprint: 1e95b07047d3e1d44d685c212e49b5f856f0a98f85af76d6f6aaab05bf056b0d
    fingerprint_components:
      contract: 7b29e35547a59070b55bf4c40c2104f6669e91783ae4db028daf1e6469cd02d3
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-codex-packed-plugin-e2e
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 5): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---

## Context
This proves through a packed plugin that the server resolves from the consumer project.
