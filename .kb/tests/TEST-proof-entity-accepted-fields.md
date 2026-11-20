---
title: The entity schema accepts the optional record fields, by a source proof
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:19:22.598Z'
id: TEST-proof-entity-accepted-fields
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-proof-entity-accepted-fields
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: json
    file: packages/cli/src/schemas/entity.schema.json
    path: /properties
    select: keys
  proves:
    - CLAIM-128507649E0FD413
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c6b9138238d4583df7011b48
    test_id: TEST-proof-entity-accepted-fields
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: b145fe6bf48923f418e7c1a2e01aa3269942d9a2a16d9f68392931585e3a8c51
    binding_hash: 89a2892cd5558223e601f1e30bda32c08ac0ea0486b76788bd2acbb45816dbc6
    fingerprint: db11a00aa014989701d79f31effb7ae51b18386b66a68e31cbb17228f002d340
    fingerprint_components:
      contract: b145fe6bf48923f418e7c1a2e01aa3269942d9a2a16d9f68392931585e3a8c51
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
      - symbol_id: SYM-test-proof-entity-accepted-fields
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: source
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: source
      test_id: TEST-proof-entity-accepted-fields
      source:
        reader: json
        file: packages/cli/src/schemas/entity.schema.json
        path: /properties
        select: keys
      model:
        members:
          - aliases
          - approval_ref
          - approved_by
          - argument_aliases
          - argument_constants
          - argument_descriptions
          - argument_names
          - argument_types
          - canonical_key
          - case_waiver
          - case_waiver_approved_by
          - claim_key
          - claim_span_end
          - claim_span_start
          - claim_text
          - closed_world
          - created_at
          - dimension_waiver
          - dimension_waiver_approved_by
          - distinct_from
          - examples
          - exempts_claims
          - expects
          - fact_kind
          - failure_side_waiver
          - failure_side_waiver_approved_by
          - firmness
          - granularity_reason
          - id
          - key_arguments
          - kind_of
          - links
          - logic_claims
          - operator
          - origin
          - owner
          - pair_reviews
          - part_of
          - polarity
          - predicate_args
          - predicate_arity
          - predicate_name
          - predicate_namespace
          - priority
          - proof_bindings
          - proof_contract
          - proof_exempt
          - proof_exempt_reason
          - proof_receipts
          - property_key
          - rationale
          - required_evidence
          - retired_reason
          - rule_hash
          - rule_ir
          - rule_name
          - rule_schema_id
          - scope
          - semantic_clauses
          - semantic_inventory
          - semantic_inventory_version
          - semantic_key
          - semantic_source_field
          - semantic_source_hash
          - semantic_text
          - severity
          - source
          - sourceFile
          - status
          - subject_key
          - symbol_role
          - tags
          - text_ref
          - title
          - type
          - unit
          - updated_at
          - valid_from
          - valid_to
          - value_bool
          - value_int
          - value_number
          - value_set
          - value_string
          - value_type
          - verification_perspective
          - verification_scope
    certificate_digest: 0d4c42a6e2d11cc96bfb5829ac9f30bb4c2c64c08ef8d34a0c5659fa9d6c65db
    claim_bindings:
      - claim_key: CLAIM-128507649E0FD413
        requirement_id: REQ-004
        fact_id: FACT-entity-record-accepted-fields
        binding: derived
        scope: source
        obligation:
          kind: set_relation
          members:
            - links
            - owner
            - priority
            - tags
          operator: includes
---
Proves that entity records accept priority, tags, owner and links: Kibi reads the declared properties of the entity schema itself.