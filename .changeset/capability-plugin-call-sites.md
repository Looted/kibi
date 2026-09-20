---
"kibi-cli": patch
"kibi-runtime": patch
"kibi-mcp": patch
---

Capability plugins now participate at the real CLI/MCP call sites while default installs keep the same builtin-only behavior.

Symbol analysis prefers the capability registry when available, ontology matching can compose activated packs for suggest-predicates, and external semantic classifiers run only from `kb_semantic_advisor`, `kb_model_requirement`, and `kb_compile_intent`. Sync/check/upsert/status/proof paths stay on deterministic builtin analysis. Distribution lists, pack scripts, and docs cover the new plugin packages; Jev remains opt-in.
