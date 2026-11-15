---
title: kibi migrate --apply-safe migrates a legacy branch store from its previewed plan
status: pending
priority: must
tags:
  - branching
  - migration
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-kibi-cli-legacy-apply-safe
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-15T17:00:00.000Z'
id: TEST-kibi-cli-legacy-apply-safe
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-62d3014107dcd6ba84fa8a47
    test_id: TEST-kibi-cli-legacy-apply-safe
    scope: end_to_end
    outcome: passed
    code_snapshot: 74284b201bd04638572e1428f8a6da015b606b0ed1d21e942c94eb0d46d140f1
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-15T17:20:42.330Z'
    finished_at: '2026-11-15T17:22:00.813Z'
    artifact_digest: 4dbf8c568832956c2be97b5c85e9701468a2b31af1bbe0829261acc00fbac4bb
    contract_hash: 04ecc74ae76309468a50a6cd4d52e4bb22bac0340b3a9a60d3c863323d256100
    binding_hash: b32a439957938bbe4d594cae096716942bcb9ddb163f7eafe31ee479d2f1bdb3
    fingerprint: 7f323a4b7466964ce33aafb33ce49787055be0288295fd32dac96ba5e10aaf35
    fingerprint_components:
      contract: 04ecc74ae76309468a50a6cd4d52e4bb22bac0340b3a9a60d3c863323d256100
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
      - symbol_id: SYM-e2e-test-kibi-cli-legacy-apply-safe
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Packed end-to-end test documentation/tests/e2e/packed/legacy-attachment-cli-apply.test.ts: in an installed project it moves the compiled store to its legacy literal path, previews the plan with kibi migrate --format json, checks that no hashed store exists, applies the plan's hash with kibi migrate --apply-safe, and checks that the legacy migration applied, only the hashed store remains and kibi query still returns the requirement.