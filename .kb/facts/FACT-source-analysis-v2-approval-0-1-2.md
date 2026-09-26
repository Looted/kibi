---
title: Reviewed Tree-sitter 0.1.2 release approval for Node worker compatibility
status: active
sourceFile: packages/cli/src/plugins/approved-source-analyzers.generated.ts
fact_kind: observation
tags:
  - source-analysis
  - release-qualification
  - review
text_ref: 'The source-analysis v2 contract remains current for the qualified Tree-sitter 0.1.2 closure. Independent review confirmed that clearing worker execArgv fixes Node evaluated-module entrypoints without changing input, concurrency, output, deadline or Node heap/stack configuration. Node and Bun public subprocess regressions passed. Bun does not enforce Node resourceLimits; README and qualification documentation now state that limitation explicitly. Release tools verified all 30 integrity entries and regenerated the approved executable/asset closure. Approved manifest SHA-256: 2be6a369cd0917d18ec26a0ce0d4127e487220a130c3fb846ef6c4415a3f6c9a. This record describes qualification of these exact bytes; fresh packed consumer and full proof validation remain required before completion.'
id: FACT-source-analysis-v2-approval-0-1-2
type: fact
---
