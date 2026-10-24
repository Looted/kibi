---
title: Every evidence floor holds every level to its rank
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
    - symbol_id: SYM-test-evidence-floors-exhaustive
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-cli-evidence-levels
origin:
  kind: agent
  recorded_at: '2026-10-24T19:31:45.614Z'
id: TEST-kibi-evidence-floors-exhaustive
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a319eacb630f8553c3067d27
    test_id: TEST-kibi-evidence-floors-exhaustive
    scope: unit
    outcome: passed
    code_snapshot: ded72dac6be0ba6834ef5c3166558b3ffad93197ba8871d340c23f98ebdbb69e
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-24T21:36:48.164Z'
    finished_at: '2026-10-24T21:36:48.724Z'
    artifact_digest: 4003ad4b4b70ac2849d2a67ea37ce422705d8ece25da096d28e6eaf3aec69fea
    contract_hash: a26e7889630e83d6e7c37544796b4ab465a84ca6cd3266f96187b89d598ebfc0
    binding_hash: acc1b082e90976ebba9ad7532a63f54ce03d857a427e74f76f3f3e0db0bf3567
    fingerprint: 9795226c6ac447f137ebc798b598a80cdcd6e6350784558aeda010c68948eb99
    fingerprint_components:
      contract: a26e7889630e83d6e7c37544796b4ab465a84ca6cd3266f96187b89d598ebfc0
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
      - symbol_id: SYM-test-evidence-floors-exhaustive
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
      test_id: TEST-kibi-evidence-floors-exhaustive
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
    certificate_digest: cbd8244ab6998fd003a549da25f6975d7a4e2b1eca3638546a0c1b40e46e816c
---
Checks every member of EVIDENCE_LEVELS as a floor, stated or derived from each firmness, against every evidence level and gap set: evidence_floor reports met, pending re-proof or below by rank, and kibi check fails exactly the requirements below their floor, plus pending re-proof ones under --fresh-evidence; the run leaves an exhaustive certificate over EVIDENCE_LEVELS.