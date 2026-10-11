---
"kibi-core": minor
"kibi-cli": minor
"kibi-mcp": minor
"kibi-runtime": minor
---

Agents can now ask Kibi precise questions about modeled facts through `kb_query` instead of reading through search results: which permission rules apply to an actor, how many roles a user holds, or what limit a subject property has, with the answer coming from the typed facts the requirements require. The schema catalog (`factKind: "predicate_schema"`), named `where` arguments, suggestions when nothing matches and a `next` call on every answer mean an agent does not need to know the predicate vocabulary or any Prolog up front. `kb_search` answers now show each linked fact's typed claim and the `kb_query` call that asks about it.

Technical summary: `kb_query` (CLI `query`) accepts `factKind`, `predicate`, `namespace`, `where`, `args`, `polarity`, `scope`, `distinct`, `subjectKey` and `propertyKey`; typed answers return fact rows in `entities` plus a `factQuery` block (mode, schema, distinct, suggestions, warnings, next). The discovery Prolog module gains `ask_predicate_json/9`, `ask_property_json/6`, `ask_schemas_json/5` and `ask_fact_kind_json/4`, invoked only through validated goals. The search answer layer adds `claim` and `ask` to linked predicate, property and subject facts.
