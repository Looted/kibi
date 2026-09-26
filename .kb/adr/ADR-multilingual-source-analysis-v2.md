---
title: Versioned source analysis over immutable Git snapshots
status: accepted
tags:
  - multilingual
  - source-analysis
  - snapshot
id: ADR-multilingual-source-analysis-v2
type: adr
---
Extend the existing capability registry and SourceAnalysisService with an additive asynchronous symbol-extractor v2 contract. Preserve explicit ok, partial, unsupported and failed outcomes. Keep ts-morph for JS/TS and qualify a small offline Tree-sitter catalog beginning with Python and Go, then Rust. Capture source and authored knowledge from one immutable Git tree and validate both sides of changes. Host validation owns provenance; locators never replace authored symbol identities. Maintenance admits only explicitly activated, host-approved source analyzers and does not activate ontology or semantic classifiers. See docs/architecture/multilingual-source-analysis.md for delivery stages and limitations.