---
title: Listed-in-review-without-source-edit schema
status: active
tags:
  - lane:ontology
  - predicate-schema
  - migration
  - traceability
fact_kind: predicate_schema
predicate_name: list_in_review_action_without_source_edit
predicate_namespace: default
predicate_arity: 2
argument_names:
  - command
  - comment
argument_types:
  - command
  - source_comment
argument_descriptions:
  - The Kibi command that plans the migration.
  - A tracked inline implements comment the command lists in its review action and leaves in the source.
examples:
  - list_in_review_action_without_source_edit(kibi.migrate,greet_comment)
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer decision, 2026-11-11, to hard-drop inline implements comments; wording approved: "Ok"'
  recorded_at: '2026-11-11T06:07:08.593Z'
id: FACT-SCHEMA-LIST-IN-REVIEW-ACTION-WITHOUT-SOURCE-EDIT
type: fact
---
