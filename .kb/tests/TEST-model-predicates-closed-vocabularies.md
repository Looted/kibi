---
title: Predicate closed vocabulary tests
status: passing
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
    receipt_id: PR-f1251534b933be0f79c438f0
    test_id: TEST-model-predicates-closed-vocabularies
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: e3b53f982a857a54bf71e2f9b427973e83d9a51f31dcf4b0b905cd102550acde
    binding_hash: fa2fad6df26506c5afbf73d5ef543fc63e648f7b4848d2e3743047ffacb26603
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