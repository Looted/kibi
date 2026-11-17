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
    receipt_id: PR-ec2f74a693e596c54dd899d5
    test_id: TEST-kibi-cli-legacy-apply-safe
    scope: end_to_end
    outcome: passed
    code_snapshot: d2839dc0b8e74a5e594e2725498277221d4dd0e28682de9804c12c5fad892930
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T06:55:49.168Z'
    finished_at: '2026-11-17T06:55:54.560Z'
    artifact_digest: aeb635924257d974626e805557a6fa3951d23d95f9d7c129a59fb9d1ab9c70d0
    contract_hash: 04ecc74ae76309468a50a6cd4d52e4bb22bac0340b3a9a60d3c863323d256100
    binding_hash: 722f4fd9e34e5b18ace8923fe18590d6fa726e1b2cb7e45cb00c4dc4b8dfc213
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
Packed end-to-end test documentation/tests/e2e/packed/legacy-attachment-cli-apply.test.ts: in an installed project it moves the compiled store to its legacy literal path, then checks that kibi query, kibi check and kibi engine status are refused with directions to kibi migrate --apply-safe and create no hashed store. It previews the plan with kibi migrate --format json, checks that no hashed store exists and that the plan holds no branch store recovery, applies the plan's hash with kibi migrate --apply-safe, and checks that the legacy migration applied, no recovery ran, only the hashed store remains and kibi query still returns the requirement.