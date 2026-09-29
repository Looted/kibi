---
title: Installed multilingual catalog and exact-index ownership behavior
status: active
text_ref: documentation/tests/e2e/packed/multilingual-language-catalog.test.ts
tags:
  - multilingual
  - source-analysis
  - catalog
  - e2e
  - consumer
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-multilingual-language-catalog
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-e2e-multilingual-language-catalog
    target: default
    native_id: documentation/tests/e2e/packed/multilingual-language-catalog.test.ts::runs offline qualified catalog, ambiguity, and exact-index ownership behavior from installed tarballs
id: TEST-multilingual-language-catalog
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-6c17c258ae4ff262761939ca
    test_id: TEST-multilingual-language-catalog
    scope: end_to_end
    outcome: failed
    code_snapshot: 39ed85118d250bd2a174df1470b9e719eddea4ec27ccaf9e8f821beb57e40d29
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-28T11:20:25.227Z'
    finished_at: '2026-09-28T11:41:43.503Z'
    artifact_digest: f0b89cea9d05ed19dfe6b7af6e0e61e449561a983432945f8d7e630e16ff97a4
    contract_hash: a69787cbf535c57bd0c0e77661b09e2d2799d7b6f45dc98d1a7821caa0095cc0
    binding_hash: 633f7175fe2ef5fca1d68a03133b72bf732f24ced524895e8d5c5e70461e2e02
    fingerprint: 7d0c7665f816207139ec0499619ab287ca7a3b1baf3a599ca2e4b34bc52527a9
    fingerprint_components:
      contract: a69787cbf535c57bd0c0e77661b09e2d2799d7b6f45dc98d1a7821caa0095cc0
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: c029a9841c62256a1fe8b18a6fd5efeff5a489d1e46cb1f8af747f4c1373d4b8
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-multilingual-language-catalog
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-multilingual-language-catalog
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +110 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-0e4b17748639dc9e80d6a433
    test_id: TEST-multilingual-language-catalog
    scope: end_to_end
    outcome: passed
    code_snapshot: 7b45bde8c396e1889cbe888a55e3fe6409830b71c60ef6571946b110f7fb687a
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-28T12:30:38.786Z'
    finished_at: '2026-09-28T12:55:46.304Z'
    artifact_digest: 87c736584ea4f2d40913bfa77b642fc0971411c80c0e8ea721be854488754514
    contract_hash: a69787cbf535c57bd0c0e77661b09e2d2799d7b6f45dc98d1a7821caa0095cc0
    binding_hash: 633f7175fe2ef5fca1d68a03133b72bf732f24ced524895e8d5c5e70461e2e02
    fingerprint: 7d0c7665f816207139ec0499619ab287ca7a3b1baf3a599ca2e4b34bc52527a9
    fingerprint_components:
      contract: a69787cbf535c57bd0c0e77661b09e2d2799d7b6f45dc98d1a7821caa0095cc0
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: c029a9841c62256a1fe8b18a6fd5efeff5a489d1e46cb1f8af747f4c1373d4b8
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-multilingual-language-catalog
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-74ebb7c7518dbdc7dfc7dd84
    test_id: TEST-multilingual-language-catalog
    scope: end_to_end
    outcome: passed
    code_snapshot: e3488c0960b37fb79b310a44453b733f23228d13353dc1aa53c39ab31a0490d9
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-29T12:17:13.830Z'
    finished_at: '2026-09-29T12:51:35.860Z'
    artifact_digest: 78f5c2131825423042b2829117ab404607fdd85de8edc3d4042fa4b5f7c820a8
    contract_hash: a69787cbf535c57bd0c0e77661b09e2d2799d7b6f45dc98d1a7821caa0095cc0
    binding_hash: 2d984e1faec903a9cba61637bd7516e11e2d36c2b06ac0b8811ef716c845f587
    fingerprint: 7d0c7665f816207139ec0499619ab287ca7a3b1baf3a599ca2e4b34bc52527a9
    fingerprint_components:
      contract: a69787cbf535c57bd0c0e77661b09e2d2799d7b6f45dc98d1a7821caa0095cc0
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: c029a9841c62256a1fe8b18a6fd5efeff5a489d1e46cb1f8af747f4c1373d4b8
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-multilingual-language-catalog
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
