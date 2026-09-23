---
title: 'Packed e2e: harness-independent Kibi env bootstrap'
status: active
tags:
  - env
  - bootstrap
  - e2e
  - packed
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-cli-env-bootstrap
      target: default
  success_policy: all_required_first_attempt
id: TEST-e2e-kibi-env-bootstrap
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-e21a1c24c2229e61c62e61b3
    test_id: TEST-e2e-kibi-env-bootstrap
    scope: end_to_end
    outcome: passed
    code_snapshot: 4c9397126af225c64a080a69a1e365ad33383072729e7f96e6cbf04206fe84f8
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-23T15:17:39.511Z'
    finished_at: '2026-09-23T15:19:07.582Z'
    artifact_digest: c7cb60192231a1df82456fd82b3286cfdeab788a4d59fcc9f3c60edf51fb2a66
    contract_hash: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
    binding_hash: ff0bca986aeb5755eb3a146110634df7e736a5d92b87a4a81c59b162a4c93a64
    fingerprint: 0198b39d269adeff69b33565bdd87ed13c070b419af33dae60353fec72740b9f
    fingerprint_components:
      contract: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
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
      - symbol_id: SYM-e2e-cli-env-bootstrap
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-a2e212316ce133cda129e833
    test_id: TEST-e2e-kibi-env-bootstrap
    scope: end_to_end
    outcome: passed
    code_snapshot: 1ac23b799fd9d689c50a315ed4fe92d5c7925122c9a20ffca0645c3f3c88ae73
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-09-23T16:13:41.077Z'
    finished_at: '2026-09-23T16:15:16.487Z'
    artifact_digest: 48aca1a77fb2dd303ea694f13911002f72bbb336137d109a2223b695bb99bdec
    contract_hash: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
    binding_hash: ff0bca986aeb5755eb3a146110634df7e736a5d92b87a4a81c59b162a4c93a64
    fingerprint: 0198b39d269adeff69b33565bdd87ed13c070b419af33dae60353fec72740b9f
    fingerprint_components:
      contract: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
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
      - symbol_id: SYM-e2e-cli-env-bootstrap
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
# TEST-e2e-kibi-env-bootstrap

Packed consumer e2e for harness-independent env bootstrap: process wins over project `.env.kibi`, blank values stay unset (user wins), and `KIBI_WORKSPACE` overrides cwd for workspace resolution via `kibi-runtime`.
