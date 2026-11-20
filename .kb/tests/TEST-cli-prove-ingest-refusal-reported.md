---
title: kibi prove ingest refusal tests
status: passing
priority: should
tags:
  - proof
  - cli
verification_scope: integration
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-cli-prove-ingest-refusal-reported
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-20T16:10:51.474Z'
id: TEST-cli-prove-ingest-refusal-reported
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f91375b0fdfe3a36104af7b6
    test_id: TEST-cli-prove-ingest-refusal-reported
    scope: integration
    outcome: passed
    code_snapshot: 87f64bce5423a5b17da2e5806cb87f8c5b7ac34518b58aa5f344d9f018960aef
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-20T16:17:32.664Z'
    finished_at: '2026-11-20T16:17:33.018Z'
    artifact_digest: 5240ae3aa8c770cf4065da5e2399b1e468c41689b461f34d9430bebe18e5aae6
    contract_hash: 85e914dd9e59a5a330243e86f36107f164340ba4401cf0173b608ab716546bc4
    binding_hash: 41a854e424966a12f20f5f93c7506f84032caa81631a0905fa8378139b32ce1f
    fingerprint: aaf2b4467dd5e8cfb2c70108cbec56da230f8a86ef23bb19cddccb92c9b48e69
    fingerprint_components:
      contract: 85e914dd9e59a5a330243e86f36107f164340ba4401cf0173b608ab716546bc4
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
      - symbol_id: SYM-test-cli-prove-ingest-refusal-reported
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
The prove ingest refusal tests in packages/cli/tests/commands/prove-mutation.test.ts run proveCommand with an ingest seam that refuses chosen calls with "Proof ingest failed:". A refused playwright integration is listed in failures while the command integration's run is reported and recorded as ingested; a refused partition of a command run keeps the receipts of the partition before it and records no progress; an engine error that is not a refusal still rejects the command. isIngestRefusal is checked against a refusal, another error and a non-error value.

A false pass would be a seam that refuses every call, since then the other integration's summary is never exercised.