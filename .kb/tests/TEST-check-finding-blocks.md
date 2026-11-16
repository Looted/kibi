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
    receipt_id: PR-a8a38c62000780947971e940
    test_id: TEST-check-finding-blocks
    scope: end_to_end
    outcome: passed
    code_snapshot: 2d2e51abb29a0062a03c6b5eac4f61123e6660d452df84971e95c70ec8930502
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T20:48:55.074Z'
    finished_at: '2026-11-16T20:48:55.345Z'
    artifact_digest: 37b7167ddcd7720045f7b8b218133781d255d6581e6e2f0d8d7d84a1c91b0b32
    contract_hash: 438c3eec9848723a9f614dc7bbc13ade5bd04d0a0a68aa4c7d05dc16a90e0d81
    binding_hash: 10a7b3c0e1dc6c71e70836d374a70ce91f2550d8b1273cedecd4d16b11ba2086
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