---
title: Every evidence level is reported exactly when its evidence holds
status: passing
tags:
  - proof
  - certificate
  - exhaustive
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-evidence-levels-exhaustive
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-cli-evidence-levels
  proves:
    - CLAIM-6A120A441BC6AD42
    - CLAIM-22E34F860C144AB0
origin:
  kind: agent
  recorded_at: '2026-10-24T19:31:46.524Z'
id: TEST-kibi-evidence-levels-exhaustive
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f02567d2b5f2838de3b12de1
    test_id: TEST-kibi-evidence-levels-exhaustive
    scope: unit
    outcome: passed
    code_snapshot: ded72dac6be0ba6834ef5c3166558b3ffad93197ba8871d340c23f98ebdbb69e
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-24T21:36:53.943Z'
    finished_at: '2026-10-24T21:36:54.522Z'
    artifact_digest: 0f381ce21004b8764cfcff8b8b9422745fa7eaf631cbec6e498520b216f01169
    contract_hash: 61cd519213376d002b91731ff67de79651a70310a7cc9c1477566b47ce3d50df
    binding_hash: af9528b8022bae6e7f4f359db5aa3ae39c75803e5ebdf9ae2cacb698f371a4bb
    fingerprint: 587ac41397e039bf94f8a32d88bb6566c046a62251b14724648bf7be2d4d7ec4
    fingerprint_components:
      contract: 61cd519213376d002b91731ff67de79651a70310a7cc9c1477566b47ce3d50df
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
      - symbol_id: SYM-test-evidence-levels-exhaustive
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: exhaustive
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: exhaustive
      test_id: TEST-kibi-evidence-levels-exhaustive
      domain:
        symbol_id: SYM-cli-evidence-levels
        members:
          - proved
          - tested
          - asserted
          - unverified
      results:
        - member: proved
          outcome: passed
        - member: tested
          outcome: passed
        - member: asserted
          outcome: passed
        - member: unverified
          outcome: passed
    certificate_digest: 722258d4d6913672868ae1ab31aafb227395df21eeb472d661f30e4973bf1ba2
---
Crosses every input the evidence level depends on (proof status, a certificate test or none, who wrote the requirement and whether a person approved it, its firmness) and checks, for every member of EVIDENCE_LEVELS, that requirement_evidence reports that level exactly for the inputs that earn it and that kibi report and kibi signoff show it; the run leaves an exhaustive certificate over EVIDENCE_LEVELS.