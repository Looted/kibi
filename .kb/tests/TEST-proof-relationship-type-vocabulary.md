---
title: Kibi relationship types shall be depends_on, specified_by, verified_by, validates, implements, covered_by, executable_for, constrained_by, constrains, requires_property, requires_predicate, requires_rule, guards, publishes, consumes, supersedes, restates, assumes, exempts and relates_to, by an exhaustive proof
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
    - symbol_id: SYM-proof-relationship-type-vocabulary
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-cli-mutation-RELATIONSHIP_TYPES
  proves:
    - CLAIM-DB5C788DA756E5F2
origin:
  kind: agent
  recorded_at: '2026-10-28T10:21:50.306Z'
id: TEST-proof-relationship-type-vocabulary
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-4a5cdccf2e1191496fbf1d5d
    test_id: TEST-proof-relationship-type-vocabulary
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 21ddedc212d56d74c2a0009cfc2b00045fa578a3b34865fa1ad521459b6ab03e
    binding_hash: 69b18949f9e8a83fe8fc81b00f869aabf12954ceb131c697f2b01a5bed21b4fd
    fingerprint: 008bfbc189cb0a60306c50e2a06b08db196820f71d1f2a15a8bdb0670efb9c8c
    fingerprint_components:
      contract: 21ddedc212d56d74c2a0009cfc2b00045fa578a3b34865fa1ad521459b6ab03e
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
      - symbol_id: SYM-proof-relationship-type-vocabulary
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
      test_id: TEST-proof-relationship-type-vocabulary
      domain:
        symbol_id: SYM-cli-mutation-RELATIONSHIP_TYPES
        members:
          - depends_on
          - specified_by
          - verified_by
          - validates
          - implements
          - covered_by
          - executable_for
          - constrained_by
          - constrains
          - requires_property
          - requires_predicate
          - requires_rule
          - guards
          - publishes
          - consumes
          - supersedes
          - restates
          - assumes
          - exempts
          - relates_to
      results:
        - member: depends_on
          outcome: passed
        - member: specified_by
          outcome: passed
        - member: verified_by
          outcome: passed
        - member: validates
          outcome: passed
        - member: implements
          outcome: passed
        - member: covered_by
          outcome: passed
        - member: executable_for
          outcome: passed
        - member: constrained_by
          outcome: passed
        - member: constrains
          outcome: passed
        - member: requires_property
          outcome: passed
        - member: requires_predicate
          outcome: passed
        - member: requires_rule
          outcome: passed
        - member: guards
          outcome: passed
        - member: publishes
          outcome: passed
        - member: consumes
          outcome: passed
        - member: supersedes
          outcome: passed
        - member: restates
          outcome: passed
        - member: assumes
          outcome: passed
        - member: exempts
          outcome: passed
        - member: relates_to
          outcome: passed
    certificate_digest: 8fe86bab78f7040d0e58ee8dab5afb15632a70bd2466ef50eeace01359b2bcf5
    claim_bindings:
      - claim_key: CLAIM-DB5C788DA756E5F2
        requirement_id: REQ-kibi-relationship-type-vocabulary
        fact_id: FACT-relationship-type-vocabulary
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - assumes
            - constrained_by
            - constrains
            - consumes
            - covered_by
            - depends_on
            - executable_for
            - exempts
            - guards
            - implements
            - publishes
            - relates_to
            - requires_predicate
            - requires_property
            - requires_rule
            - restates
            - specified_by
            - supersedes
            - validates
            - verified_by
---
Proves that kibi relationship types shall be depends_on, specified_by, verified_by, validates, implements, covered_by, executable_for, constrained_by, constrains, requires_property, requires_predicate, requires_rule, guards, publishes, consumes, supersedes, restates, assumes, exempts and relates_to, against the code Kibi reads at ingest.