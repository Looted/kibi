---
id: TEST-007
title: Prolog KB attaches, asserts, and retrieves entities correctly
status: active
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-08-02T00:00:00.000Z
priority: must
tags:
  - prolog
  - core
  - unit
links:
  - type: validates
    target: REQ-core-persistence
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
    receipt_id: PR-9b00e8872bdbc08b5482e1b5
    test_id: TEST-007
    scope: unit
    outcome: passed
    code_snapshot: 1d5bc71e944be8ddccfdb37cf3622375ef36850933b4f87d153a603152368662
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-05T12:09:33.691Z'
    finished_at: '2026-11-05T12:12:51.062Z'
    artifact_digest: b39b74bff9760a7f282a5add8db18a92492ed15d5551c7473e7778ed0e83fcbf
    contract_hash: 8eb486cc247b16c56391b8f3ff1a729a2ec39c3ffeac9dae6c97c31fb3321c56
    binding_hash: f670033266f112214b49cadd811fa835c5e254c637dd6efa7e6832633eefbd02
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
