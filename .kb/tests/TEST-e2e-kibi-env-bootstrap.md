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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b4f4cccf8dad2fed8f387e98
    test_id: TEST-e2e-kibi-env-bootstrap
    scope: end_to_end
    outcome: passed
    code_snapshot: ac1f51869130bde5bbcd6fcccc482d5612cd47df0ca46ab9e734b2199b88e0fb
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T10:41:25.570Z'
    finished_at: '2026-10-28T10:42:34.167Z'
    artifact_digest: ba1cfddb16300f661b4d899591b7cbd77fa8f435a4b6bd721a66173135ecf658
    contract_hash: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
    binding_hash: 665d5884635ed415d51653c70fc2f975b9978d4ac03bce9b182000915b52fa2f
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
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
# TEST-e2e-kibi-env-bootstrap

Packed consumer e2e for harness-independent env bootstrap: process wins over project `.env.kibi`, blank values stay unset (user wins), and `KIBI_WORKSPACE` overrides cwd for workspace resolution via `kibi-runtime`.
