---
title: Predicate requirement subject tests
status: active
priority: must
tags:
  - modeling
  - predicates
  - bindings
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-model-predicates-requirement-subject
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-08T15:34:40.057Z'
id: TEST-model-predicates-requirement-subject
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-3d224131e13dfffc15b43d8d
    test_id: TEST-model-predicates-requirement-subject
    scope: end_to_end
    outcome: passed
    code_snapshot: 3464ae42f083c2b6e9ed9b482fa7e54f58e94f0d5628e4ace6c2f8d99ecacd37
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-08T21:31:01.029Z'
    finished_at: '2026-10-08T21:31:05.868Z'
    artifact_digest: f12173e6829bdb4f8699537e980b3b15af6c4fedf82abb77eb3941d46239160d
    contract_hash: 71e629f239ea9b5dc8bf7574430bf2afe3bf7afe6761083f9aec5c339f38114e
    binding_hash: 00b8094e54f6975556684a1dd4054f6509f44375c196d023e39ba8513c46296e
    fingerprint: d16ba384b056223b58011aa9bda3d52e19217a5af1df8ad686318c3932041818
    fingerprint_components:
      contract: 71e629f239ea9b5dc8bf7574430bf2afe3bf7afe6761083f9aec5c339f38114e
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
      - symbol_id: SYM-test-model-predicates-requirement-subject
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
Runs `packages/cli/tests/operations/suggest-predicates-existing-grounding.test.ts`, which answers the requirement's `constrains` lookup from a stubbed KB and checks the bound subject, its provenance, the plan's `predicate_args`, the `subjectHint` override, the unbound subject without a subject fact and the binding examples for several subject facts, and the MCP stdio round trip that checks the applied predicate's first argument.