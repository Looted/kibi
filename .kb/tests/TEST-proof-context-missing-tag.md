---
title: The context review tag shall be review:context-missing, by a regex proof
status: passing
tags:
  - proof
  - certificate
  - regex
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-context-missing-tag
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-context-missing-tag
  proves:
    - CLAIM-6949C5497269C18C
origin:
  kind: agent
  recorded_at: '2026-10-28T11:05:18.711Z'
id: TEST-proof-context-missing-tag
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-bf838701ad5151e5fcbf1964
    test_id: TEST-proof-context-missing-tag
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: ca143c889fe4d1e188a877581fff522dc0a210ec354f6a84a98ff06e52133efa
    binding_hash: d9039f06fd2eec2a8af2ca35b1c4386793f78c4104b1275d611c34ecf36c6d7d
    fingerprint: c849f7ff63c96b9d5053963d44ece65c7584cc537acdab9914174226c4189e8d
    fingerprint_components:
      contract: ca143c889fe4d1e188a877581fff522dc0a210ec354f6a84a98ff06e52133efa
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
      - symbol_id: SYM-proof-context-missing-tag
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: regex
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: regex
      test_id: TEST-proof-context-missing-tag
      pattern:
        symbol_id: SYM-const-context-missing-tag
        type: string
        value: review:context-missing
    certificate_digest: f825313690337cd177fcca2b31f2b47a3a7601045187cd58befb3970ec949faa
    claim_bindings:
      - claim_key: CLAIM-6949C5497269C18C
        requirement_id: REQ-kb-entity-context-rule-ids
        fact_id: FACT-context-missing-tag
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: review:context-missing
---
Proves that the context review tag shall be review:context-missing, against the code Kibi reads at ingest.