---
title: Branch store snapshot duplicate-triple tests
status: active
priority: must
verification_scope: end_to_end
verification_perspective: internal
tags:
  - core
  - persistence
  - doctor
  - status
origin:
  kind: agent
  recorded_at: '2026-11-17T09:09:03.553Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-core-snapshot-duplicate-triples
      target: default
  success_policy: all_required_first_attempt
id: TEST-core-snapshot-duplicate-triples
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-44ed168254d342bf68016263
    test_id: TEST-core-snapshot-duplicate-triples
    scope: end_to_end
    outcome: passed
    code_snapshot: 208e833b856f0e522e4059068fdd60db02ab931118523dbf10567ed01d8b8c1d
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T15:16:43.360Z'
    finished_at: '2026-11-17T15:16:45.912Z'
    artifact_digest: 81bd24fb8def75760a0d2c5c850daf1b650c7df855b22b48e74cf38822bd2c91
    contract_hash: 29e2c2df91ef38b0cb1b73a62c52d5627640adebab5cb10caade149073b688bf
    binding_hash: 30d24fe8af205e6fa38d8e2622a32b55551c3c464bdbfe30e602e4a84d1eb1ff
    fingerprint: ecb3dc20fb50c3bae7201cf85dfcb70f02ed57d11acdc9706902a01ea6c45f65
    fingerprint_components:
      contract: 29e2c2df91ef38b0cb1b73a62c52d5627640adebab5cb10caade149073b688bf
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
      - symbol_id: SYM-test-core-snapshot-duplicate-triples
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
The `kb_persistence` PLUnit suite in `packages/core/tests/kb.plt` holds SWI-Prolog's background rdf_db garbage collector, retracts and re-asserts entities, and checks that a compaction leaves nothing to reclaim when it writes the snapshot (without the pre-snapshot collection 141 garbage triples remain). It then saves a store's snapshot with every triple twice and checks that attaching it keeps each triple once, that the rewritten snapshot reloads clean and that `.kibi-store-repair.json` records the counts, and that a clean store is attached without a record. `scripts/tests/check-store-snapshot.test.ts` runs the proof job's store check on a clean store, a doubled snapshot, a repaired store and an empty directory. The Bun suites check the `branch_store_repaired` notice window and fields, its kb_status notice and text, and the kibi doctor warning.

A false pass would be a store whose snapshot was never doubled; the PLUnit test therefore first asserts that the doubled load holds twice as many triples.