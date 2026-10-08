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
    receipt_id: PR-4b2e9a1aad3f388d56a3c4ea
    test_id: TEST-model-predicates-requirement-subject
    scope: end_to_end
    outcome: passed
    code_snapshot: 6cca97613441c1fbaabc1ae371ee3f303736b4d4b1a0c6d7c908439c9eabb06d
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-08T16:07:14.217Z'
    finished_at: '2026-10-08T16:07:17.581Z'
    artifact_digest: 7a83de924f2c352978d822ea75c88860b248076ef3d6a916136093cad5a30400
    contract_hash: 71e629f239ea9b5dc8bf7574430bf2afe3bf7afe6761083f9aec5c339f38114e
    binding_hash: f57930832db633afe1fc91c3fb04c0566cbcef212842396945db58053e89e228
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