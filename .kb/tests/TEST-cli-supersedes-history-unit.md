---
title: CLI supersedes source-history unit contract
status: passing
source: packages/cli/tests/operations-mutation/mutation/relationships.test.ts
tags:
  - cli
  - git
  - supersedes
  - unit
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-cli-supersedes-history
      target: default
  success_policy: all_required_first_attempt
id: TEST-cli-supersedes-history-unit
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-2aec22b15f4aacb9b7fe405d
    test_id: TEST-cli-supersedes-history-unit
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: d8de50533d13c9834ce2915e334eae4e1139bb51b2f508d100a96fd00a4e557c
    binding_hash: 3fb60afd83359a5ce509288c6a3529c11ceeb6c051e082a6ead4ec2a9c657362
    fingerprint: 18546a501d7cb68f144ddcd67aebddc4437f177bc3344aa8f8992eaab994b8c7
    fingerprint_components:
      contract: d8de50533d13c9834ce2915e334eae4e1139bb51b2f508d100a96fd00a4e557c
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
      - symbol_id: SYM-unit-test-cli-supersedes-history
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Executes Git addition-history lookup, supersession history classification, and the new-to-old source-history validation guard with deterministic repositories and ancestry fixtures.