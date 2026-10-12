---
"kibi-core": patch
"kibi-cli": patch
"kibi-mcp": patch
"kibi-runtime": patch
---

The `ask` call on a predicate fact in a `kb_search` answer now reproduces that fact's own tuple instead of naming the predicate alone: pasted, `kb_query` returns the fact and only the facts sharing its key arguments (`has_role(alice, admin)` asks `where: { user: "alice" }`, a `permission_rule` asks by actor, action and resource), where before it returned every fact of the predicate. The `predicate_schema` catalog now gives a built-in schema such as `permission_rule` the id that `kb_model` accepts as `schemaId` (`FACT-SCHEMA-PERMISSION-RULE`) together with `stored: false`, so an agent is no longer told `id: null` and no longer looks up an entity that does not exist; project schemas carry `stored: true`.

Technical summary: `buildSearchAnswer` resolves the schema of each linked or ungoverned predicate fact (project `predicate_schema` of its namespace and name, else the built-in signature) in the round trip that loads the linked rows, and `factDetail` builds `where` over the schema's `key_arguments`, else the argument named `subject`, else the first argument, with the fact's `namespace` when it is not `default`; a fact without a schema, or whose schema does not fit its arity, gets its full positional `args`. `kb.pl` gains `builtin_predicate_signature/3` (catalog id and argument names of a built-in decision predicate), which `discovery.pl` uses for the catalog row and `ask_schema_dict`; every schema row carries `stored`, and the `kb_query` text summary marks a built-in row as not a stored entity.
