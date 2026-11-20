---
title: Non-numeric proof kinds through kibi prove with the packed CLI
status: passing
tags:
  - proof
  - certificate
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-non-numeric-proof-kinds
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-26T09:47:51.695Z'
id: TEST-kibi-non-numeric-proof-kinds
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-bdcf82cfb56f175df1b5c457
    test_id: TEST-kibi-non-numeric-proof-kinds
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: a98e37e3d6677f59eb53cf2e61b6348bf28bbd0ab061d291328ad73bf17bbee8
    binding_hash: 1a3a6a71243d76c652ec14b847f0a13d157fb50e07659849718c71267f049da9
    fingerprint: 24e674478923b52b0d6e6037ea4432665048528d919f581eba92cade383fa96d
    fingerprint_components:
      contract: a98e37e3d6677f59eb53cf2e61b6348bf28bbd0ab061d291328ad73bf17bbee8
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
      - symbol_id: SYM-e2e-packed-non-numeric-proof-kinds
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the installed packed CLI on a sandbox repository where the semantic advisor models an invoice number format as a string fact with operator matches and invoice status transitions as a set fact, and model-requirement records "Archived documents must never be shared" as a kibi.logic.v1 rule. After kibi prove --all, the regex test over the anchored pattern, the state_machine test over the transition table and the rule test over the sharing function get derived claim bindings at evidence level proved; a pattern that also accepts longer strings is rejected with a string only it accepts, and a sharing function that lets owners share archived documents is rejected with the assignment that breaks the rule. The unit suite checks the regular-language decisions against V8, the Python and JavaScript model evaluation, and the Prolog model checker.