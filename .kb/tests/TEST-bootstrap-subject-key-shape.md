---
title: Bootstrap claim naming tests
status: passing
priority: must
tags:
  - bootstrap
  - modeling
  - naming
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-bootstrap-subject-key-shape
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-07T19:01:52.734Z'
id: TEST-bootstrap-subject-key-shape
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f5435075f5fffeba642110e5
    test_id: TEST-bootstrap-subject-key-shape
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 32ccb5ee476ceb6380ab6e48ede8392fa2093c4f538703ceb5296ee6b9065619
    binding_hash: 23128c8b792c4979184db3eceb6d57c66a7d7aa743032c746cfa91b28e2949ce
    fingerprint: aebaad4360205df0c8be9801fc43a39fa48417b3b9c87082f05bc8e643a6fcdc
    fingerprint_components:
      contract: 32ccb5ee476ceb6380ab6e48ede8392fa2093c4f538703ceb5296ee6b9065619
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
      - symbol_id: SYM-test-bootstrap-subject-key-shape
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs `packages/cli/tests/operations/bootstrap-subject-key-shape.test.ts`, which resolves claim names with and without a declared component, plans intent claims from a declared source, and checks the planned names, the diagnostic for a component-less claim, and the carried rationale.
