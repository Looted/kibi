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
    receipt_id: PR-b40f4e632534c24cceb2f93f
    test_id: TEST-kibi-non-numeric-proof-kinds
    scope: end_to_end
    outcome: passed
    code_snapshot: 5cd63ae2d123c329d0f327961e5bd248bf2ec09473953b646a5ae51a11d4014d
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T13:46:14.777Z'
    finished_at: '2026-10-28T13:47:59.594Z'
    artifact_digest: ec27e970894dadc31c1fa01dc541f71eb272b7e42a21b346882589ed6db04ad9
    contract_hash: a98e37e3d6677f59eb53cf2e61b6348bf28bbd0ab061d291328ad73bf17bbee8
    binding_hash: d64bb8a1f54683b02a4dcb6455f54db420be3ca576cfdbe31e352d4962510144
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