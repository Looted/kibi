---
id: TEST-kibi-proposition-complete-ingestion
title: Proposition-complete ingestion boundary tests
status: passing
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: documentation/tests/e2e/packed/proposition-complete-ingestion.test.ts
tags:
  - requirements
  - semantic-inventory
  - cli
  - mcp
  - sync
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
links:
  - type: validates
    target: SCEN-kibi-proposition-complete-ingestion
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-packed-proposition-ingestion
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-5522a685c34003385c3f256e
    test_id: TEST-kibi-proposition-complete-ingestion
    scope: end_to_end
    outcome: passed
    code_snapshot: 0ef83d98ba69f02638b918a7fb2a5c8745d7e16e758282b2caacd90570abbaff
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T19:06:33.723Z'
    finished_at: '2026-10-28T19:07:42.987Z'
    artifact_digest: 73a5d83a22b74a442a6aa61eba1f38d2169719b1f95e35c8e369b19051762989
    contract_hash: 9af855d0408ce68d177dc419ea3f3dfa20cd094c30f9baadb45afd5e036d1720
    binding_hash: c167809d48e1ddb3b0243c46adc91ec0eeaf91dbf871035578f616893ae9982f
    fingerprint: 9f1af02b9475ca34b90fdcb9a0b15563a97c943f65517b7b5e0b8ee9ce5731aa
    fingerprint_components:
      contract: 9af855d0408ce68d177dc419ea3f3dfa20cd094c30f9baadb45afd5e036d1720
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
      - symbol_id: SYM-test-packed-proposition-ingestion
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Exercises the packed CLI from an isolated consumer installation. The suite proves direct preflight rejection, post-baseline Markdown rejection for a new incomplete requirement, and successful ingestion of the same prose when it carries the exact advisor-compatible version, source hash, claim key, role, status, and UTF-8 span. Unit and parity suites additionally cover duplicate identities, explicit unresolved states, exact grounding claim keys, modeling-plan completeness, and schema preservation.
