---
id: TEST-kibi-ontology-convergence-witnesses
title: Packed ontology convergence and contradiction witness tests
status: passing
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - requirements
  - ontology
  - predicates
  - contradictions
  - witnesses
  - packed
  - e2e
links:
  - type: validates
    target: SCEN-kibi-ontology-convergence-witnesses
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-packed-ontology-convergence-witnesses
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a67a4cfe36b0e40f4403d618
    test_id: TEST-kibi-ontology-convergence-witnesses
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: fcee33caa973eaf8f029171c5c8d43c843a52c0337cd358ac5a5714569285e48
    binding_hash: 9edd6b3f8163e1e0408640cab0b7db791c8180cb5e3108d261ea9eaa059a2838
    fingerprint: c3ea3721953e3ffed110216ae7934a77d70e14e515a1153243967056e83b6af4
    fingerprint_components:
      contract: fcee33caa973eaf8f029171c5c8d43c843a52c0337cd358ac5a5714569285e48
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
      - symbol_id: SYM-test-packed-ontology-convergence-witnesses
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
Exercises project-local schema discovery, exact schema and polarity selection, binding-plan withholding, and source-bound contradiction evidence through a packed CLI consumer installation. Core PLUnit coverage separately proves strict, predicate, contradictory-rule, and unresolved-rule witness semantics.
