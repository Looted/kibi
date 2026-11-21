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
    receipt_id: PR-0bd552ab8bf95d3ffd14e8cf
    test_id: TEST-cli-supersedes-history-unit
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
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