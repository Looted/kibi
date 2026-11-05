---
title: Packed CLI doctor workflow diagnostics
status: active
tags:
  - cli
  - doctor
  - e2e
  - review:context-missing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-cli-doctor
      target: default
  success_policy: all_required_first_attempt
id: TEST-cli-doctor-workflows
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-19bbaa2f2f4840690aad4e78
    test_id: TEST-cli-doctor-workflows
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d5bc71e944be8ddccfdb37cf3622375ef36850933b4f87d153a603152368662
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-05T12:09:33.691Z'
    finished_at: '2026-11-05T12:12:51.062Z'
    artifact_digest: b39b74bff9760a7f282a5add8db18a92492ed15d5551c7473e7778ed0e83fcbf
    contract_hash: e92ed821011bba8e755c5b874ed8db80c6d514ff109f21a96823e2d6f4366ddc
    binding_hash: f743881e3acabccadca976728121286e27e28a0f9b7cba595140e174273b54b1
    fingerprint: c418203058eb1c11804725525899d641d78f32c22bec0f91de340e8c1c7bed5f
    fingerprint_components:
      contract: e92ed821011bba8e755c5b874ed8db80c6d514ff109f21a96823e2d6f4366ddc
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
      - symbol_id: SYM-e2e-packed-cli-doctor
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