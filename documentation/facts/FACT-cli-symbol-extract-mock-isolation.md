---
id: FACT-cli-symbol-extract-mock-isolation
title: Symbol extraction tests must restore ts-morph project mocks
status: active
created_at: 2026-05-30T00:00:00Z
updated_at: 2026-05-30T00:00:00Z
source: documentation/facts/FACT-cli-symbol-extract-mock-isolation.md
tags:
  - cli
  - traceability
  - test-hygiene
links:
  - SYM-extractSymbolsFromStagedFile
  - TEST-cli-staged-impact-enforcement
fact_kind: observation
---

# Fact: Symbol Extraction Mock Isolation

`packages/cli/tests/traceability/symbol-extract.test.ts` patches `Project.prototype.createSourceFile` to exercise staged TypeScript symbol extraction branches. Those patches must be restored with `finally` blocks so later symbol extraction suites receive a real ts-morph `SourceFile` implementation.

`packages/cli/src/traceability/symbol-extract.ts` also tolerates partial source-file mocks for optional interface/type-alias enumeration, which keeps focused branch tests realistic without leaking mock state across the CI coverage run.
