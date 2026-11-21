---
title: Predicate requirement subject tests
status: passing
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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-19105da1df0e2c0141279982
    test_id: TEST-model-predicates-requirement-subject
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 71e629f239ea9b5dc8bf7574430bf2afe3bf7afe6761083f9aec5c339f38114e
    binding_hash: 583a9bfabbc8a57431070582793e291d10e404c1c2fa229c9a9da58ff984044f
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
    kind: e2e
    evidence_level: tested
---
Runs `packages/cli/tests/operations/suggest-predicates-existing-grounding.test.ts`, which answers the requirement's `constrains` lookup from a stubbed KB and checks the bound subject, its provenance, the plan's `predicate_args`, the `subjectHint` override, the unbound subject without a subject fact and the binding examples for several subject facts, and the MCP stdio round trip that checks the applied predicate's first argument.