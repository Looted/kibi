---
title: The staged gate judges a partially recorded file only on the declarations a commit touches
status: passing
priority: must
tags:
  - symbols
  - staged-gate
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-staged-gate-inherited-symbol-gaps
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
id: TEST-staged-gate-inherited-symbol-gaps
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-44924a3823863ce0f03a6350
    test_id: TEST-staged-gate-inherited-symbol-gaps
    scope: end_to_end
    outcome: passed
    code_snapshot: 922722505874a39bf824680c85dc86f0274e2312643033c33145a58404c54cae
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T18:39:41.390Z'
    finished_at: '2026-11-16T18:39:56.211Z'
    artifact_digest: a46c076c878a9cd7299faf6f7fb80c36b6d29d9f621491bd0d74c492953f8c9f
    contract_hash: fc771d16f8ca1525d049d65635a3d2b0142ff0d044b957b38d05cd5405587b95
    binding_hash: 19e6b97ad73d7029ec6299450b1f1438a6281a601b7df12e27d339ee8696126c
    fingerprint: da264a35b7d6cf786f0914032f8583ce28cdef09c9defba3e08bfbd6244a2cc3
    fingerprint_components:
      contract: fc771d16f8ca1525d049d65635a3d2b0142ff0d044b957b38d05cd5405587b95
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
      - symbol_id: SYM-e2e-test-staged-gate-inherited-symbol-gaps
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Packed end-to-end test documentation/tests/e2e/packed/staged-inherited-symbol-gaps.test.ts: in an installed project with a partially recorded file (one recorded function, one unrecorded constant), it checks that kibi check --staged passes an edit to the recorded function with a non-blocking Symbol records note and a JSON inheritedSymbolGaps entry, ignores a comment and whitespace edit inside the constant, blocks a value edit to the constant, a new unrecorded function and a rename that orphans a record naming only those declarations, accepts a config record without a link for a changed constant, and still requires a link for a function or a function-valued constant recorded with a non-behavioral role.