---
id: FACT-JOURNALED-ENGINE-PROTOCOL
title: Clients use the framed engine protocol
status: active
created_at: 2026-08-11T00:00:00Z
updated_at: 2026-08-11T00:00:00Z
source: packages/cli/src/engine.ts
tags: [lane:ontology, engine, protocol]
fact_kind: predicate
predicate_namespace: kibi.engine
predicate_name: logical_requirement_rule
predicate_args: [normal_client_operation, framed_engine_protocol, no_one_shot_swipl]
canonical_key: logical_requirement_rule(normal_client_operation,framed_engine_protocol,no_one_shot_swipl)
polarity: assert
claim_key: CLAIM-074FF437D34CE843
claim_text: CLI and MCP clients MUST use the framed local engine protocol and MUST NOT start one-shot SWI-Prolog processes for normal operations
claim_span_start: 92
claim_span_end: 224
---

Ground representation of the normal-operation protocol boundary.
