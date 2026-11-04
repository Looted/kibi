---
id: FACT-SCHEMA-AMBIGUOUS-EXTENSION-FAMILY
title: Ambiguous extension family predicate schema
status: active
tags:
  - lane:ontology
  - predicate-schema
fact_kind: predicate_schema
predicate_name: ambiguous_extension_family
predicate_arity: 2
argument_names:
  - catalog
  - family
argument_types:
  - language_catalog
  - language_family
argument_descriptions:
  - Language catalog that resolves extensions.
  - Language family an extension may belong to.
examples:
  - "ambiguous_extension_family(source_analysis.language_catalog,c_or_cpp)"
type: fact
---

Grounds file extensions whose language needs an explicit signal.
