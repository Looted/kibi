---
id: TEST-core-journaled-engine-persistence
title: Journal replay, rollback, migration, audit atomicity, and compaction
status: passing
created_at: 2026-08-11T00:00:00.000Z
updated_at: 2026-08-11T00:00:00.000Z
priority: must
tags:
  - core
  - persistence
  - migration
links:
  - type: validates
    target: SCEN-core-journaled-engine-migration
  - type: validates
    target: REQ-core-journaled-engine-persistence
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-core-journaled-engine-persistence
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-668aafa309782a47463da3e4
    test_id: TEST-core-journaled-engine-persistence
    scope: end_to_end
    outcome: passed
    code_snapshot: edc0588eed59351e216a3466342eacd255130ecbca12d0f17c5c6c51dd2fd1cf
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-10T16:15:07.213Z'
    finished_at: '2026-11-10T16:15:28.035Z'
    artifact_digest: fc5ebf926d1b8ba2a054fbcee5935a630ae69be2db94368a0f883c199b8c7aa1
    contract_hash: e83572511b55e99bdd4658f9cd1225bdbec0e73965b6e7f5a142bc85959ad09b
    binding_hash: 1ad19a5ed85560eed3e997d6c98b105eb2c55bbb2f230510d2d84cff8d186194
    fingerprint: 88ca3961fd0a7095a3e4ff654ca98c299ddbf0ff0d7b81fcfdb49e6dd5a0cacc
    fingerprint_components:
      contract: e83572511b55e99bdd4658f9cd1225bdbec0e73965b6e7f5a142bc85959ad09b
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
      - symbol_id: SYM-test-core-journaled-engine-persistence
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
The persistence suite attaches a journaled branch, verifies journal replay after
detach/reattach, proves a failed RDF transaction rolls back both entity and
audit resources, forces compaction, and checks that generation metadata and
audit exports remain consistent. Migration fixtures cover populated legacy
stores, corrupt input, digest/count mismatch, and repeated attempts.
