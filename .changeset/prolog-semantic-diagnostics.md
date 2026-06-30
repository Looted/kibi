---
"kibi-cli": patch
"kibi-core": patch
"kibi-mcp": patch
---

Kibi now makes semantic Prolog adoption easier to measure and debug. Diagnostic usage logs expose semantic advisor readiness, predicate suggestion outcomes, upsert semantic readiness, and contradiction failures as structured fields instead of generic success/error text. Operators can opt into predicate-link audits and get Prolog validation query-plan safety checked by default, with normal `.kb/config.json` overrides available when needed.

Technical summary:
- Add `predicate-verifiability` as a default-off KB check rule that flags `requires_predicate` targets whose `fact_kind` is not `predicate`.
- Add `query-plan-safety` as a default-enabled KB check rule that flags Prolog validation clauses that place negation before later generator calls.
- Enrich MCP diagnostic usage fields for `kb_semantic_advisor`, `kb_suggest_predicates`, and `kb_upsert`.
- Classify requirement contradiction errors as `semantic_contradiction` validation failures with actionable hints.
- Preserve semantic context in CLI sync/rebuild validation errors instead of reducing Prolog failures to `Query returned false`.
- Extend prose coverage with real Align annotation time-key and merge-policy requirements.
- Refresh changed Prolog check modules through the MCP aggregated check loader.
