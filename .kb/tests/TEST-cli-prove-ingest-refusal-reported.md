---
title: kibi prove ingest refusal tests
status: passing
priority: should
tags:
  - proof
  - cli
verification_scope: end_to_end
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
    receipt_id: PR-e458049e5cfe85a1b48fb1c4
    test_id: TEST-cli-prove-ingest-refusal-reported
    scope: end_to_end
    outcome: passed
    code_snapshot: 0023b69c8d093f9a5478ff9bf8a51a9b243f0a5261615cf251f83dc6ba9333c8
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-20T16:29:13.452Z'
    finished_at: '2026-11-20T16:29:13.817Z'
    artifact_digest: b2a760cdfb97a4e845c478204a37b7a6f24bdde11816c3019e1ae71fd8db1452
    contract_hash: 85e914dd9e59a5a330243e86f36107f164340ba4401cf0173b608ab716546bc4
    binding_hash: 35a2e9fc907152000e11cf9cdca0f96ae6f964f3d41c13f01f8456a1e7bc5e31
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