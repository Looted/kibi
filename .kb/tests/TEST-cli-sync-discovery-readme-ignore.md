---
id: TEST-cli-sync-discovery-readme-ignore
title: CLI sync discovery ignores README markdown under entity directories
type: test
status: passing
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
    - symbol_id: SYM-e2e-cli-status-pre-first-sync
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-001be60942b32cae9e7b49ca
    test_id: TEST-cli-sync-discovery-readme-ignore
    scope: end_to_end
    outcome: passed
    code_snapshot: 77a05ac3f136388d07560216e6f9644997c4b9918c6920a54149f03a47779bca
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-10T05:33:42.441Z'
    finished_at: '2026-11-10T05:36:08.645Z'
    artifact_digest: dc8736db249dfdd88751ad8485abe81283e5b9591ca84f894b18a7ce3504ead7
    contract_hash: acce66b08ddf3396f5b639f0c3310ddcc6d679823780cd04efd25464973d2e6f
    binding_hash: 06e486174a314c1a78cbaa3116b472a433267b01d91caa6da7d966eebe6903b9
    fingerprint: 262225ee99f5d44836326b8bc25e3bb83d45731818e13c914c659f4ae9f49e75
    fingerprint_components:
      contract: acce66b08ddf3396f5b639f0c3310ddcc6d679823780cd04efd25464973d2e6f
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
      - symbol_id: SYM-e2e-cli-status-pre-first-sync
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
