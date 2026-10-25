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
    receipt_id: PR-3acbd1056e626315a04833bb
    test_id: TEST-kibi-evidence-levels-exhaustive
    scope: unit
    outcome: passed
    code_snapshot: 88f72ac7863bc053137ae0fbd6e7ea179d4fbf9dd5cb363152f2b4fc11739754
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-25T18:54:10.280Z'
    finished_at: '2026-10-25T18:54:10.839Z'
    artifact_digest: 53857779b5082a1f9b53b748dfa3d322bb23b9deb6899d267bf9c65635cba30e
    contract_hash: 5de06c7ebbfdbd5a1b7a02694379c1ae8881dc5c64a4b2e9ded68691cac6daa8
    binding_hash: b9fccb07c19a0b293f205d2da1e6b1d699c7d40175c850e3f49ac07f03338129
    fingerprint: 605b3625f782e0556e79332008d350b9e5f79a42c7bed5a7f98300387fd6c564
    fingerprint_components:
      contract: 5de06c7ebbfdbd5a1b7a02694379c1ae8881dc5c64a4b2e9ded68691cac6daa8
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
    claim_bindings:
      - claim_key: CLAIM-6A120A441BC6AD42
        requirement_id: REQ-kibi-evidence-levels
        fact_id: FACT-kibi-evidence-level-per-requirement
        binding: attested
        scope: code
      - claim_key: CLAIM-22E34F860C144AB0
        requirement_id: REQ-kibi-evidence-levels
        fact_id: FACT-kibi-evidence-shown-in-report-signoff
        binding: attested
        scope: code
---
Crosses every input the evidence level depends on (proof status, a certificate test or none, who wrote the requirement and whether a person approved it, its firmness) and checks, for every member of EVIDENCE_LEVELS, that requirement_evidence reports that level exactly for the inputs that earn it and that kibi report and kibi signoff show it; the run leaves an exhaustive certificate over EVIDENCE_LEVELS.