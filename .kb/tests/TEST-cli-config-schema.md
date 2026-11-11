---
id: TEST-cli-config-schema
title: CLI config and schema version unit tests
status: passing
created_at: 2026-05-29T00:00:00.000Z
updated_at: 2026-05-29T00:00:00.000Z
source: packages/cli/tests/utils/config.test.ts
tags:
  - cli
  - config
  - schema
  - unit
links:
  - type: validates
    target: SCEN-cli-config-schema-v1
verification_scope: unit
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-cli-config-schema
      target: default
  success_policy: all_required_first_attempt
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-9961ca37e81bcbff64db8d06
    test_id: TEST-cli-config-schema
    scope: unit
    outcome: passed
    code_snapshot: 77a05ac3f136388d07560216e6f9644997c4b9918c6920a54149f03a47779bca
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-10T05:33:42.441Z'
    finished_at: '2026-11-10T05:36:08.645Z'
    artifact_digest: dc8736db249dfdd88751ad8485abe81283e5b9591ca84f894b18a7ce3504ead7
    contract_hash: 8bfdfc65125ec9b5af200c3716dc2cdf280825f40e4fb06c264ba064b35f0825
    binding_hash: 3c5b8f589e6e8fe3a6c5bc77961e30dd385d8e3b89da0a25f871380bdab342cd
    fingerprint: f498fcb347445a91a7cac197e68d1e24f643cec0ea59e266b41ea03954eaa2e4
    fingerprint_components:
      contract: 8bfdfc65125ec9b5af200c3716dc2cdf280825f40e4fb06c264ba064b35f0825
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
      - symbol_id: SYM-unit-test-cli-config-schema
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---

Verifies CLI config parsing and schema-version helper behavior used by migration and validation workflows.
