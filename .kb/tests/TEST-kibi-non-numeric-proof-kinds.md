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
    receipt_id: PR-eb4ccd93e81d3c46e204d351
    test_id: TEST-kibi-non-numeric-proof-kinds
    scope: end_to_end
    outcome: passed
    code_snapshot: 7419ad5232bdbe1da8fca26f74b4b9ead24f00ba6d0d7de0f96f555646c2e065
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T21:09:11.644Z'
    finished_at: '2026-11-20T21:19:43.232Z'
    artifact_digest: 7139602fb04835015fd589e7172c5d2d08aef422be8d030f6da4a15ac11ca687
    contract_hash: a98e37e3d6677f59eb53cf2e61b6348bf28bbd0ab061d291328ad73bf17bbee8
    binding_hash: cfcd41795f4e5604402a012056f4287791effa371da1c81e6b6e2f56980cf327
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