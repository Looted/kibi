---
"kibi-core": minor
"kibi-cli": minor
"kibi-mcp": minor
---

Every relationship write now checks the strict-lane pairing of its target fact. A `constrains` link must point at a `subject`, `observation` or `meta` fact, and a `requires_property` link at a `property_value`, `observation` or `meta` fact; a fact without a `fact_kind` is still accepted for either. Before, the KB layer had the check but never ran it, so only the CLI and MCP upsert pre-checks refused the two obvious mismatches (`constrains` to a `property_value` fact, `requires_property` to a `subject` fact), and `kibi sync` or any other direct write stored any pairing. Now `kb_assert_relationship/4`, upserts, batch upserts, upsert dry runs and `kibi sync` all refuse a mismatched link with a `validation_error` naming the target and the fact kinds it needs, which also covers targets such as `predicate`, `rule` or `predicate_schema` facts. Links already stored are left as they are and still read back; `kibi sync` reports a refused link as a failed relationship of its source file.
