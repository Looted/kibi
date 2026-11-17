# Predicate ontology decision tree

Call `kb_model` (full MCP profile only; CLI `kibi model --input -`) with `mode: "analyze"` on the complete prose before encoding a clause.
Set requirement `logic_claims` to exactly the assertive `claim_key` values.
For each relational clause, call `kb_model` with `mode: "predicates"`, that clause, and
`existingLogicClaims`. If lexical rank is a false positive, retry with the
reviewed `schemaId`. If `binding_status` is `incomplete`, supply
`argumentBindings` and retry. Persist `fact_kind: predicate` with the same
`claim_key` / `claim_text`, then link `REQ -> fact` with `requires_predicate`.
`claim_key` is derived from `claim_text`, so a ground fact may send the exact
clause alone and Kibi fills the key in; a sent key must equal the derived one.
Use `kb_model` with `mode: "requirement"` for strict scalar clauses. Use
`fact_kind: observation` only for a true ontology gap. The manifest is not
grounding: run `logic-coverage` so each key binds to one ground fact.
Relationship direction is fixed, and every `from` in a relationship batch
must equal the upserted entity ID.

Worked example. `recommendedAction: "provide_argument_bindings"` means a
schema fits but `unbound_arguments` lists roles Kibi could not read from the
prose; `bindingHints` (on MCP at `structuredContent.data.bindingHints`, like
every result field) gives each one's `type`, `allowedValues` (declared
constants) or `examples`, and why the current value was refused. With a
`requirementId` whose requirement `constrains` one subject fact, the `subject`
argument is already bound to that fact's `subject_key` (provenance
`requirement`); keep it, so the predicate and the subject fact name one
subject. A schema without a `subject` argument (`permission_rule`) records
that key as the planned fact's `subject_key` instead; when the requirement
constrains several subjects, an unbound `subject_key` asks you to pass
`subjectHint` with one of them. A participant (`actor`, `resource`, entity)
is a short noun, never a clause of the claim, and an `actor`, `role` or
`owner` is never the requirement's subject key: the planned fact already
carries that key as `subject_key`, so `actor = <subject key>` stays unbound
with a reason. When the claim names no participant for such an argument (the
value is empty, the subject key or a clause that opens with a gerund such as
"Discarding a draft while …", and none of the schema's constants or example
values occurs in the claim), the schema does
not fit the claim and Kibi answers `record_ontology_gap` with the gap
observation in `applyPlan`; the candidate stays listed as `incomplete` with
its `bindingHints`. Write the observation instead of inventing a participant.
For every other unbound argument, bind it
from the claim's own words and call again with the same `text` and
`requirementId`, plus `schemaId` and `argumentBindings` keyed by
`argument_names` (reuse `argument_constants` values when the schema has them).
A value that repeats an argument name (`"before_event": "before_event"`) or is
a bare stop word (`be`, `is`, `the`) stays unbound; never copy field names:

```json
{"mode":"predicates","text":"Only an annotation owner may delete an annotation.","requirementId":"REQ-annotation-delete-owner","schemaId":"FACT-SCHEMA-PERMISSION-RULE","argumentBindings":{"actor":"annotation_owner","action":"delete","resource":"annotation","decision":"allow"}}
```

When the retry returns `apply_requires_predicate`, write its `applyPlan` fact,
then the `relationshipPlan` `requires_predicate` row; its target is
`relationshipTarget` (the planned `FACT-PRED-…` id), never a candidate's
`SUGGEST-…` id. A non-empty `existingGrounding` means the requirement already
grounds the claim (for example a bootstrap `requires_property` fact); the action
still names the predicate state. `replace_grounding` means a predicate fits but
a second grounding link would fail, so keep the existing link or apply the
`replacementPlan` steps unchanged, in order and back to back (predicate fact,
`kb_delete` (full MCP profile only; CLI `kibi delete --input -`) of the old link, requirement link; between the last two `kb_check`
reports both `logic-coverage` and `strict-req-fact-pairing` for the
requirement, as `expected.kbCheckAfterStep` states; run `kb_check` after the
last step and apply `rollback` if it is not clean). `keep_existing_grounding`
means the requirement already links a predicate fact with the candidate's
`canonical_key` (`existingGrounding[].matchedBy` is `canonical_key` when the
claim was worded differently), so write nothing. `extend_requirement` means
the requirement's proposition ledger has no entry for this text, so a link
cannot be made and no fact is planned: add the clause to the requirement's
prose (`mode: "requirement"`, or `kb_upsert` with the extended `semantic_text`
and the ledger `mode: "analyze"` returns) and call `mode: "predicates"` again.
Read `decisionConflicts` and its warnings whenever `plan` is null: they name
the stored decision facts the candidate would contradict and the requirements
that own them. To ask what a proposed rule would conflict with, call
`mode: "predicates"` with its text and no `requirementId`; nothing is written.
`provide_argument_bindings` and `record_ontology_gap` mean
the same as for an ungrounded claim, and the gap observation is not a grounding
link, so write it exactly as returned (tags, `claim_text`, `document.body`, no
`claim_key`, no relationships). Record an ontology gap only when no returned schema fits the
claim, not because bindings were missing.
A review note is an observation that quotes its claim without `claim_key`, with
its prose in `document.body`:
`{"type":"fact","id":"FACT-review-<area>-<behavior>","properties":{"title":"Review: ...","status":"active","fact_kind":"observation","text_ref":"<sourceId>:<reference>","tags":["review:invalid-write"],"claim_text":"<the claim>"},"document":{"body":"<why it needs review, who raised it, the source>"}}`.

To add `specified_by` (or another relationship) to an existing requirement,
upsert it with its stored `title`, a `status` and the relationship only; Kibi
keeps the stored proposition ledger when no `semantic_*` or `logic_claims`
field is sent and `title`/`text_ref` are unchanged.

For conditional relational claims, after the initial `kb_model` predicates call and before any `kb_upsert`—including one needed for a missing schema—call read-only `kb_model` with `mode: "requirement"` to preview suitable scalar or typed-rule modeling. Treat the preview as advisory: do not apply an irrelevant result or create unrequested facts, and retain an approved ground-predicate plan when it captures the whole claim. Preserve supplied arity, ordered argument roles, polarity, bound values, and one claim key per actual assertion; never split arguments across clauses or schemas or alter values to force uniqueness.

## Complete logical coverage

Decompose all atomic normative clauses into `claim_key`/`claim_text` entries in
`logic_claims`; human or agent review still confirms that the atomic clauses
exhaust the prose. Run `logic-coverage` and `domain-contradictions` after
modeling. Use `status: implemented` only as historical input; use a valid status
such as `closed`, add an `implemented` tag, and link evidence instead.
