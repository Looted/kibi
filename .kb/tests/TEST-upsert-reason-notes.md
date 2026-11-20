---
title: kb_upsert reason note tests
status: passing
priority: must
tags:
  - upsert
  - rationale
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-16T14:58:14.721Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-upsert-reason-notes
      target: default
  success_policy: all_required_first_attempt
id: TEST-upsert-reason-notes
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f1cb3362d4fc8e3f958ddf3f
    test_id: TEST-upsert-reason-notes
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 45143b7c3917b7ec1b60f6e4833e2dc3fb8f0d166325ac6c39c81cf1ea5279d1
    binding_hash: a8d1a8f841b23ad0e7d9c48f757f84297ab27d37ab384217066e89d58dae4e80
    fingerprint: 2190f3c944f55e1d735d5ea8b84c75b0771e0a8471aa960bd656b626151948e0
    fingerprint_components:
      contract: 45143b7c3917b7ec1b60f6e4833e2dc3fb8f0d166325ac6c39c81cf1ea5279d1
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
      - symbol_id: SYM-test-upsert-reason-notes
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs kibi upsert through the built CLI on a workspace with an agent-authored requirement that records no reason and one that records a rationale, each grounded on a client quota fact (packages/cli/tests/consumer/upsert-reason-note.test.ts). It checks the note on a new requirement with and without a rationale, on a new requirement whose Context section names who asked and says Reason not stated, on an update that keeps or changes the statement, on a value change under each requirement, and that an unchanged value gets no note.

A false pass would be a fixture whose requirements all record a reason, or a fact write that never changes the value, so neither note is ever produced.
