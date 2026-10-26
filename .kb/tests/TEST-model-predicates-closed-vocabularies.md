---
title: Predicate closed vocabulary tests
status: active
priority: must
tags:
  - modeling
  - predicates
  - vocabulary
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-model-predicates-closed-vocabularies
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-08T15:34:51.439Z'
id: TEST-model-predicates-closed-vocabularies
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-36ecbcfd031e7cea3e8a7f02
    test_id: TEST-model-predicates-closed-vocabularies
    scope: end_to_end
    outcome: passed
    code_snapshot: 43675d5112431d4f3e5766d7fd142174b14e417e9c8b3d76bc67f23dfa7c508e
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-24T20:10:10.145Z'
    finished_at: '2026-10-24T20:10:10.371Z'
    artifact_digest: db8d040547ead64ec95fdd832e9183923e255235cdcbeb465f999955d32e09af
    contract_hash: e3b53f982a857a54bf71e2f9b427973e83d9a51f31dcf4b0b905cd102550acde
    binding_hash: c9b0f549147527ae84ef3c96a3ba1c0d0bb42a209496970a7ea1b5fe48572a1d
    fingerprint: b625b31e12eead182713b23eeed20aa8628abe4d42fe53b69d25623526103004
    fingerprint_components:
      contract: e3b53f982a857a54bf71e2f9b427973e83d9a51f31dcf4b0b905cd102550acde
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
      - symbol_id: SYM-test-model-predicates-closed-vocabularies
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs `packages/cli/tests/operations/predicate-binding-placeholders.test.ts`, which validates every built-in schema vocabulary against `predicateVocabularyErrors` and the schema examples, checks the `allowedValues` and summary text of an unbound trigger, and binds constants named in other words or through an alias.