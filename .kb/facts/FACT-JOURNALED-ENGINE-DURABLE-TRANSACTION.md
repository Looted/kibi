---
id: FACT-JOURNALED-ENGINE-DURABLE-TRANSACTION
title: Journal durability gates transaction acknowledgement
status: active
created_at: 2026-08-11T00:00:00Z
updated_at: 2026-08-11T00:00:00Z
source: packages/core/src/kb.pl
tags: [lane:ontology, engine, persistence, durability]
fact_kind: predicate
predicate_namespace: kibi.engine
predicate_name: logical_requirement_rule
predicate_args: [rdf_transaction, atomic_domain_audit_metadata, acknowledge_after_journal_durable]
canonical_key: logical_requirement_rule(rdf_transaction,atomic_domain_audit_metadata,acknowledge_after_journal_durable)
polarity: assert
claim_key: CLAIM-2A163B289A950EF7
claim_text: The engine MUST attach the branch with SWI-Prolog rdf_persistency and commit domain triples audit resources and commit metadata in one RDF transaction acknowledged only after the journal is durable
claim_span_start: 226
claim_span_end: 423
---

Ground representation of atomic journal durability and acknowledgement.
