---
id: TEST-cli-sync-discovery-readme-ignore
title: CLI sync discovery ignores README markdown under entity directories
type: test
status: active
created_at: 2026-06-26T13:30:00.000Z
updated_at: 2026-06-26T13:30:00.000Z
tags:
  - cli
  - sync
  - discovery
  - regression
verification_scope: end_to_end
verification_perspective: internal
links:
  - type: validates
    target: SCEN-001
  - type: validates
    target: REQ-core-extractors
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-cli-sync-discovery-readme-ignore
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f41dfbaa9013b90def66a1f1
    test_id: TEST-cli-sync-discovery-readme-ignore
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d5bc71e944be8ddccfdb37cf3622375ef36850933b4f87d153a603152368662
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-05T12:09:33.691Z'
    finished_at: '2026-11-05T12:12:51.062Z'
    artifact_digest: b39b74bff9760a7f282a5add8db18a92492ed15d5551c7473e7778ed0e83fcbf
    contract_hash: 2e0bf90568aed3f0df882a61346964014cbb902abe8e799526fe856b8e6e5f75
    binding_hash: bf152799bf439f194604d08edb8f253c6e4db4b000ba785aa7b4bfc138727741
    fingerprint: 23ed49f1410dbafd690c23af4ac2a40b7a3a9a1f76992db0611fa348dfd4d8a3
    fingerprint_components:
      contract: 2e0bf90568aed3f0df882a61346964014cbb902abe8e799526fe856b8e6e5f75
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
      - symbol_id: SYM-e2e-test-cli-sync-discovery-readme-ignore
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
The sync discovery unit tests verify that `discoverSourceFiles` excludes
`README.md` files under configured entity directories while still returning
actual entity markdown files.
