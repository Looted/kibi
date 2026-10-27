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
    receipt_id: PR-d005b6c9e7e602ae5837fbe1
    test_id: TEST-proof-entity-accepted-fields
    scope: unit
    outcome: passed
    code_snapshot: 71649ed10705e0ff14dfa0f500ef70fff1f548eb2351356f6278688a26e40e5e
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T07:20:01.994Z'
    finished_at: '2026-10-27T07:20:02.146Z'
    artifact_digest: 0dcccf585167de0007644000d58027c6d3118751f86701daa6544afc4140d6f2
    contract_hash: b145fe6bf48923f418e7c1a2e01aa3269942d9a2a16d9f68392931585e3a8c51
    binding_hash: 2b75342c604f909faab7bd3fd184ad3b6fe627e27f2990d652131eba593733a9
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
          - claim_key
          - claim_span_end
          - claim_span_start
          - claim_text
          - closed_world
          - created_at
          - examples
          - exempts_claims
          - expects
          - fact_kind
          - firmness
          - granularity_reason
          - id
          - key_arguments
          - links
          - logic_claims
          - operator
          - origin
          - owner
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
    certificate_digest: 6dbc59e4138dee1b108278bbf42ab825a5a228ca3836b21288b122bae4271e65
    claim_bindings:
      - claim_key: CLAIM-128507649E0FD413
        requirement_id: REQ-004
        fact_id: FACT-entity-record-accepted-fields
        binding: derived
        scope: code
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