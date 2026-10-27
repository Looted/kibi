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
    receipt_id: PR-8e2c71b20b006b2797d88fcb
    test_id: TEST-kibi-non-numeric-proof-kinds
    scope: end_to_end
    outcome: passed
    code_snapshot: c4104ac073c1ca0cf0c123116e93187baa1c1e7bdc85ddda2714cbed78e2dc7a
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-26T16:02:12.252Z'
    finished_at: '2026-10-26T16:03:06.248Z'
    artifact_digest: 89035c401b5b9ec5839ea6cc95dd454ea33ee398c37714dd3b837ab6bc04c8bf
    contract_hash: a98e37e3d6677f59eb53cf2e61b6348bf28bbd0ab061d291328ad73bf17bbee8
    binding_hash: 415c827f5605b38a9c07ed91e0a06d9b141b0773bdf64c628f24fee284c1e5c4
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