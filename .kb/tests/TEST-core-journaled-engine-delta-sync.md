---
id: TEST-core-journaled-engine-delta-sync
title: Delta sync and performance gates
status: passing
created_at: 2026-08-11T00:00:00.000Z
updated_at: 2026-08-11T00:00:00.000Z
priority: must
tags:
  - cli
  - sync
  - performance
links:
  - type: validates
    target: SCEN-core-journaled-engine-delta-sync
  - type: validates
    target: REQ-core-journaled-engine-persistence
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-core-journaled-engine-delta-sync
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b1dce86e88953f52e4019c6e
    test_id: TEST-core-journaled-engine-delta-sync
    scope: end_to_end
    outcome: passed
    code_snapshot: edc0588eed59351e216a3466342eacd255130ecbca12d0f17c5c6c51dd2fd1cf
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-10T16:14:16.621Z'
    finished_at: '2026-11-10T16:15:05.068Z'
    artifact_digest: cfbafb3b8eefbf60d338a1177435762017cd5f6f61e2d69b166817bcc5f25022
    contract_hash: 66c9200dfdadf6f95d660f8bcab4f33d698a8eaf03d072b534b6a71ceede76c4
    binding_hash: 40373f2f468b2af7e911829b1db7083337e95bb4bbec240049e7dbaaebd1a2eb
    fingerprint: 901c9ba28eb1874c674ec62aeb0f780a93fbab7abee54d6972557c476bdbf21d
    fingerprint_components:
      contract: 66c9200dfdadf6f95d660f8bcab4f33d698a8eaf03d072b534b6a71ceede76c4
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
      - symbol_id: SYM-test-core-journaled-engine-delta-sync
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
Contract fixtures cover no-op, one-symbol, relationship-only, deletion,
coordinate-only, and rebuild sync paths through the Node CLI and MCP.
The generated 10,000-symbol/30,000-edge fixture excludes setup from timed
regions and enforces every release gate: warm exact and paginated query p95 at
or below 100 ms; warm search and status p95 at or below 150 ms; ordinary
durable upsert p95 at or below 500 ms; no-op sync at or below 500 ms;
one-symbol sync p95 below one second; cold attach plus index build at or below
three seconds; full sync at or below 30 seconds; and steady-state engine RSS at
or below 512 MiB.
