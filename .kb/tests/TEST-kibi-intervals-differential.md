---
title: intervals.pl agrees with its proved Lean model and with CLP(Q) and CLP(FD)
status: passing
tags:
  - proof
  - lean
  - differential
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-intervals-differential
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-24T20:30:57.066Z'
id: TEST-kibi-intervals-differential
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-da99a121a2f816986f3fc209
    test_id: TEST-kibi-intervals-differential
    scope: end_to_end
    outcome: passed
    code_snapshot: fd533bf19c861ad8ac8efb75758e48e7ddd616896e097e02d5eeb8945729f8b3
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-24T23:26:16.751Z'
    finished_at: '2026-10-24T23:26:41.371Z'
    artifact_digest: fe2ad340923a9ce7315a474ff0ffa4286f6e0579931f305ea9269cfb712f92b6
    contract_hash: 573178247a42769c217ab8a931f579adf5d5a3c357ef90ec485f68aa04dbc7a1
    binding_hash: ecd94a297f1be0ca354d1a74cb0126178ca7a274846eb5d429623acc62e2e3f6
    fingerprint: a44bf9394d3fc74dca24bcf644a0d2c407f60e59b386cf830ba57304deba315b
    fingerprint_components:
      contract: 573178247a42769c217ab8a931f579adf5d5a3c357ef90ec485f68aa04dbc7a1
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
      - symbol_id: SYM-test-intervals-differential
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
  - version: kibi.proof-receipt.v2
    receipt_id: PR-3a560d4ab48655536895a563
    test_id: TEST-kibi-intervals-differential
    scope: end_to_end
    outcome: failed
    code_snapshot: 1cce070b58a41a8b83ad20355dfafcc8bf9204a17fc3e42bec566c34dcbdb108
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T20:52:57.030Z'
    finished_at: '2026-11-20T21:00:32.826Z'
    artifact_digest: 8685bdeb02380cd9dcfb91e0423d4ad1c262993bb923aebfc480711a06370698
    contract_hash: 573178247a42769c217ab8a931f579adf5d5a3c357ef90ec485f68aa04dbc7a1
    binding_hash: c86f1cfac45457824ad3b21d0a99ad2e043c2a9f86c996a45dda745d11816303
    fingerprint: a44bf9394d3fc74dca24bcf644a0d2c407f60e59b386cf830ba57304deba315b
    fingerprint_components:
      contract: 573178247a42769c217ab8a931f579adf5d5a3c357ef90ec485f68aa04dbc7a1
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
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-test-intervals-differential
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-test-intervals-differential
        target: default
        reason: 'run did not pass (outcome: failed, phase: execution); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-packed-prolog-source-readers (failed), SYM-e2e-test-mcp-kb-freshness (failed)'
    kind: e2e
    evidence_level: tested
---
Builds the Lean project in proof/lean (the proofs and the executable model), then generates 200000 seeded cases and decides each with intervals.pl on the bundled SWI-Prolog, with the Lean executable and with a CLP(Q) and CLP(FD) oracle, failing on any disagreement. A second run plants a misdecision: intervals.pl runs through a wrapper that flips its answer on the first one-variable satisfiability case, then on the first one-variable entailment case, and documentation/tests/e2e/intervals-differential-planted.e2e.ts requires the differential to exit 1, count one disagreement and print that case with each side's answer.
