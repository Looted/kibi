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
    receipt_id: PR-fbcec9cfd5a7593865d48e5c
    test_id: TEST-staged-gate-inherited-symbol-gaps
    scope: end_to_end
    outcome: passed
    code_snapshot: c66891e96b160476643f161d5141eca8459243daf4f5fdcf21ae95fe0c600685
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T09:14:41.179Z'
    finished_at: '2026-11-16T09:16:10.487Z'
    artifact_digest: e86f282fce5c129146c27734d1f3b9bb68b7f5050a43409ff5cd7f50ee95ccd1
    contract_hash: fc771d16f8ca1525d049d65635a3d2b0142ff0d044b957b38d05cd5405587b95
    binding_hash: 6e9a2539566303cad5a9f2c44a944f066d2201d07b556e03e1523f1ed922e7dc
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