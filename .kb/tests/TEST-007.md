---
id: TEST-007
title: Prolog KB attaches, asserts, and retrieves entities correctly
status: passing
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-08-02T00:00:00.000Z
priority: must
tags:
  - prolog
  - core
  - unit
links:
  - type: validates
    target: SCEN-001
verification_scope: unit
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-007
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-6659931a81cf37d9361b8e49
    test_id: TEST-007
    scope: unit
    outcome: passed
    code_snapshot: 77a05ac3f136388d07560216e6f9644997c4b9918c6920a54149f03a47779bca
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-10T05:33:42.441Z'
    finished_at: '2026-11-10T05:36:08.645Z'
    artifact_digest: dc8736db249dfdd88751ad8485abe81283e5b9591ca84f894b18a7ce3504ead7
    contract_hash: 8eb486cc247b16c56391b8f3ff1a729a2ec39c3ffeac9dae6c97c31fb3321c56
    binding_hash: 00049f4f1586ee80ac86f72880578e2e8e09a6ee5479e60bf9a19528fac23dea
    fingerprint: 81920f957a7e4b1ee9ef4ec628d92215b793e7dde666459fef5bfbdb18fb8084
    fingerprint_components:
      contract: 8eb486cc247b16c56391b8f3ff1a729a2ec39c3ffeac9dae6c97c31fb3321c56
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
      - symbol_id: SYM-unit-test-007
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
type: test
---

Calls `kb_attach/1` on a temp RDF store, then `kb_assert_entity/2` with a valid
entity term, then `kb_entity/3` to retrieve it. Asserts the round-trip preserves
all properties. Also validates that schema violations (unknown type, missing title)
are rejected by `kb_assert_entity/2`.

The CLI symbol-manifest unit suite verifies that refreshes extract coordinates into the generated artifact while stripping both legacy and newly enriched coordinate fields from authored entries. It also restores coordinate-writer mocks between cases so warning paths cannot pollute later tests.
