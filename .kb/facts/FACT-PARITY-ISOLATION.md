---
id: FACT-PARITY-ISOLATION
title: Resolved project binaries run only in isolated fixtures
status: active
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
tags: [lane:ontology, parity, isolation]
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args: [project_runtime_fixture, execute_in_isolated_workspace, audited_kb_unchanged]
canonical_key: logical_requirement_rule(project_runtime_fixture,execute_in_isolated_workspace,audited_kb_unchanged)
polarity: assert
claim_key: CLAIM-DCF52E4C5B2191EF
claim_text: The runner must execute resolved project binaries only inside isolated fixture workspaces without mutating audited project knowledge bases
claim_span_start: 1062
claim_span_end: 1200
---

Ground representation of audited-project immutability.
