---
title: kb_upsert implementedBy tests
status: passing
priority: must
tags:
  - mutation
  - traceability
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-16T07:13:21.038Z'
id: TEST-kb-upsert-implemented-by
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kb-upsert-implemented-by
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f20e85e7852d94912b1bd76c
    test_id: TEST-kb-upsert-implemented-by
    scope: end_to_end
    outcome: passed
    code_snapshot: 70d93e7455f99b57fc27757adc541ea701f294c063a8b0da60af6af7831943b4
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T10:37:20.578Z'
    finished_at: '2026-11-16T10:37:33.058Z'
    artifact_digest: 7df0490a128a1b4a23171cd2ebfa1468efce0a3a4d88f0d121eb05e0aa093af2
    contract_hash: a8d0ce5de0dddad9c482d8df92fc8539a38c5ec325dbb68af444b322f1288e84
    binding_hash: 0b0ffebd1fae93b2e38cf8356287e4c6d4e63ed9e19eaf3f2a8eb739e6e0538f
    fingerprint: 086d6977faf01e66d464004762d90243c83eeeb89fa32fa1e4a99367348e7abe
    fingerprint_components:
      contract: a8d0ce5de0dddad9c482d8df92fc8539a38c5ec325dbb68af444b322f1288e84
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
      - symbol_id: SYM-test-kb-upsert-implemented-by
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
The operation tests run kb_upsert of a requirement with implementedBy entries against a workspace whose files declare known symbols. An entry that names one granular declaration records an implements link from that symbol to the requirement, creating the symbol entity when it is new. An entry that matches no declaration or several is refused with the candidate symbols and nothing is written. An entry that would link a whole file or a coarse declaration such as a class with methods is refused, and implementedBy on a non-requirement entity is refused (packages/cli/tests/operations-mutation/mutation/implemented-by.test.ts). The consumer tests run the same writes through the kibi upsert command (packages/cli/tests/consumer/upsert-implemented-by.test.ts).

A false pass would be a test that checks only the returned status, never that the stored link comes from the declared symbol rather than the file.