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
    receipt_id: PR-c0068ce1412f35748f676fee
    test_id: TEST-cli-supersedes-history-unit
    scope: unit
    outcome: passed
    code_snapshot: 0311721f7dc6e36151c0f2b87aee7c272c2fbfab0abfabdd7c11486adbf70fda
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-10T05:41:05.499Z'
    finished_at: '2026-11-10T05:41:05.703Z'
    artifact_digest: c31dc49062e6224476749e1143484752e6bf55451cca53c8105f1acc1cf5b227
    contract_hash: d8de50533d13c9834ce2915e334eae4e1139bb51b2f508d100a96fd00a4e557c
    binding_hash: bbb7de62f1398a859e51075871c2453ba44f6ca90446d8bb8d70bbecee9069e4
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