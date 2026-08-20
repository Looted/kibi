---
id: FACT-CLI-LAZY-OPERATION-LOAD
title: CLI implementations load lazily with catalog parity
status: active
created_at: 2026-08-12T00:00:00Z
updated_at: 2026-08-12T00:00:00Z
source: packages/cli/src/cli-operation-loader.ts
tags: [lane:ontology, cli, startup, parity]
fact_kind: predicate
predicate_namespace: kibi.testing
predicate_name: logical_requirement_rule
predicate_args: [cli_startup, operation_loading, lazy_with_catalog_parity]
canonical_key: logical_requirement_rule(cli_startup,operation_loading,lazy_with_catalog_parity)
polarity: assert
claim_key: CLAIM-86A9CDC403DEED58
claim_text: CLI startup MUST lazily load selected command implementations while lightweight registration metadata remains exactly equivalent to the authoritative operation catalog
claim_span_start: 654
claim_span_end: 821
---

Ground representation of CLI lazy loading and authoritative metadata parity.
