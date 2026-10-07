---
title: Bootstrap claim naming tests
status: active
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-4c819a583887ce1c3f4bb185
    test_id: TEST-bootstrap-subject-key-shape
    scope: end_to_end
    outcome: passed
    code_snapshot: 5bcd0d322a2e6c7d354ab67006c2435d002496d92294aa2d93965813f4aabe00
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-07T19:05:31.445Z'
    finished_at: '2026-10-07T19:05:31.867Z'
    artifact_digest: cd36105019b832ffca855dd99cb6f11da236a5e5af8a820828bdf92271be1852
    contract_hash: 32ccb5ee476ceb6380ab6e48ede8392fa2093c4f538703ceb5296ee6b9065619
    binding_hash: acedc1a959e50e7fc844e34f706742cbec4755123c9bb34f1c9e7e50a27a4481
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
---
Runs `packages/cli/tests/operations/bootstrap-subject-key-shape.test.ts`, which resolves claim names with and without a declared component, plans intent claims from a declared source, and checks the planned names, the diagnostic for a component-less claim, and the carried rationale.
