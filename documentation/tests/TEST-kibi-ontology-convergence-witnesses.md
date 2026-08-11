---
id: TEST-kibi-ontology-convergence-witnesses
title: Packed ontology convergence and contradiction witness tests
status: passing
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
source: documentation/tests/TEST-kibi-ontology-convergence-witnesses.md
verification_scope: end_to_end
verification_perspective: consumer
verification_receipts:
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-ONTOLOGY-20260810-01
    test_id: TEST-kibi-ontology-convergence-witnesses
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/ontology-convergence-witnesses.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: f2a4a4edb0cd96fbe56fe3dbfe87dba7834eff383fb5f103434ff3425509e1ba
    environment_hash: 637756e81846b777cf85b7133d405ff21179312077ee36a2c634adfae3e29c8f
    started_at: 2026-08-10T17:06:26.692Z
    finished_at: 2026-08-10T17:07:04.810Z
    artifact_digest: 9fea046443ccc239c2f6f05022356518528f9a0af837b58564a429647e1b09de
  - version: kibi.verification-receipt.v1
    receipt_id: VR-KIBI-ONTOLOGY-20260810-02
    test_id: TEST-kibi-ontology-convergence-witnesses
    runner: node
    command: tsc -p documentation/tests/e2e/packed/tsconfig.e2e.json --outDir <mktemp> && NODE_OPTIONS=--enable-source-maps node --test --test-concurrency=1 <mktemp>/ontology-convergence-witnesses.test.js
    scope: end_to_end
    outcome: passed
    code_snapshot: c8dd61fb1d8da0075bb9676a56d19ce167b0e84b60f38be77528138ec67c1cc3
    environment_hash: 5d577f4411c4423b228da7556130dc175e2c00cf1e50e4d9608f6720e9d140f5
    started_at: 2026-08-10T17:42:10.048Z
    finished_at: 2026-08-10T17:42:38.864Z
    artifact_digest: 6daad591a29bc2c41c1773f35db9105adc0f442c2cde95fb3246d85e9d45d2da
tags: [requirements, ontology, predicates, contradictions, witnesses, packed, e2e]
links:
  - type: validates
    target: SCEN-kibi-ontology-convergence-witnesses
---

Exercises project-local schema discovery, exact schema and polarity selection, binding-plan withholding, and source-bound contradiction evidence through a packed CLI consumer installation. Core PLUnit coverage separately proves strict, predicate, contradictory-rule, and unresolved-rule witness semantics.
