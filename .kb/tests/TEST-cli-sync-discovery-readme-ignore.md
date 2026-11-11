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
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-cli-status-pre-first-sync
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-0003b9b09a39ca7b693d6c52
    test_id: TEST-cli-sync-discovery-readme-ignore
    scope: end_to_end
    outcome: passed
    code_snapshot: 7170843493997a9734a34ca70075d56e9cbe31489403f09eae01825ae2fe8855
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-10T15:25:35.332Z'
    finished_at: '2026-11-10T15:25:37.852Z'
    artifact_digest: 07e0cb099696d6f2369eb07d66471de0df4434dd08a71184adf25274bcfef0c0
    contract_hash: acce66b08ddf3396f5b639f0c3310ddcc6d679823780cd04efd25464973d2e6f
    binding_hash: 5d1d8d28553795a8ee70aa8e4f6b41e635fd23b00ec9c2ee3816a2c66e2c0b8d
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
