---
title: Packed kibi check review rules and native case ingest
status: passing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-check-review-rules
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-11, approving the wording fixes of the second KB gold-standard review: "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-11T18:00:00.000Z'
id: TEST-e2e-check-review-rules
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-01dae18fc07b5b118b17888b
    test_id: TEST-e2e-check-review-rules
    scope: end_to_end
    outcome: passed
    code_snapshot: 546875c3bf244dc6f4f8f70901bc74ee03e91532305b46d03c19b99e4150e2c0
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-11T17:37:00.975Z'
    finished_at: '2026-11-11T17:38:21.050Z'
    artifact_digest: 8add81b24204eef5281487a01b989fd22d63d2831e6d8d3d37659fd88234faed
    contract_hash: e810192f7db557fcc06e72998c69fd1e8b94a1fc8988b71e51f0ca610b57f2bf
    binding_hash: 0660656e197b55c89a93adfece87cbb93495c60b789f13c1911e4faf060c43e9
    fingerprint: 80e7dba192b4e7b4659cd1cb2d4b79a4e7372fabfa0d8fccccda9bd63a9df1f8
    fingerprint_components:
      contract: e810192f7db557fcc06e72998c69fd1e8b94a1fc8988b71e51f0ca610b57f2bf
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
      - symbol_id: SYM-e2e-test-check-review-rules
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the packed CLI on a fixture KB and checks when kibi check asks a person to review a requirement: the broad-requirement review with its umbrella exemption and closed dependents, the coarse-anchor review with its exemption for files no extractor covers, and the coverage-depth review skipping proof-exempt requirements. It also checks that proof ingest refuses a native case result with no native_id.

## Context

These review rules decided every split of Kibi's own requirements in the gold-standard review, so they are tested the way users install Kibi. Source: maintainer decision, 2026-11-11, approving the second review's wording batch.
