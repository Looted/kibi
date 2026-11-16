---
title: Finding blocks tag tests
status: passing
priority: must
verification_scope: end_to_end
tags:
  - check
  - staged
origin:
  kind: agent
  recorded_at: '2026-11-16T19:30:00.000Z'
id: TEST-check-finding-blocks
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-check-finding-blocks
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a8cb986979362ff3a2173ece
    test_id: TEST-check-finding-blocks
    scope: end_to_end
    outcome: passed
    code_snapshot: 818ac6f00909c873285da37afb4e8e96d670153d724b0dd86bb44a8c2759a9bc
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T20:36:21.810Z'
    finished_at: '2026-11-16T20:36:22.142Z'
    artifact_digest: f188cccc369662eaee257e0f80b8975e60622273d15b0e1c82ea6a67bdd3baf7
    contract_hash: 438c3eec9848723a9f614dc7bbc13ade5bd04d0a0a68aa4c7d05dc16a90e0d81
    binding_hash: 9057f6f94a4d8d4bb02e35986c1395a5eed19d04e75d9050d625db24ed694e57
    fingerprint: f1b750345afb0d3bba9755d48f70c494bec5e80752e32d921fd507cd7e7eb173
    fingerprint_components:
      contract: 438c3eec9848723a9f614dc7bbc13ade5bd04d0a0a68aa4c7d05dc16a90e0d81
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
      - symbol_id: SYM-test-check-finding-blocks
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Checks that every finding of the full check carries blocks merge or none, every staged and changed finding carries blocks commit or none, a finding that is blocking or has severity error stops its level, and the envelope's diagnostics leave the tag out.