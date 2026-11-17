# Domain subjects

A subject fact (`fact_kind: subject`) defines one thing in the product: a
screen, a role, a document, a limit. Its body is the definition (at least 8
words: what it is, what it includes and what it is not); `kb_check` blocks a
subject without one (`subject-definition-missing`) and two subjects whose key
and title read as one (`subject-duplicate`). Relate subjects instead of
copying them: a dotted key (`drawing.read_only_view`) is part of its prefix,
and `part_of`, `kind_of` and `distinct_from` name other subject keys. A
subject that names itself under `part_of`, `kind_of` or `distinct_from`, or a
chain of broader subjects that leads back to it, is blocked
(`subject-hierarchy-invalid`).

Every unmodeled `normative`, `condition`, `exception` or `definition` claim
of a current requirement names the subjects it is about in its inventory
entry, `subjects: [<subject_key>, ...]` (`claim-subject-missing`), and each
key must be defined (`claim-subject-undefined`). Prose Kibi cannot compare
still meets the other requirements on the same subject:
`kb_query {"factKind":"subject","subjectKey":"<key>"}` returns the
definition, broader and narrower subjects, every current requirement about
it or a narrower one, and under `unmodeledClaims` the prose claims Kibi cannot
compare. `kb_upsert` of a requirement lists those neighbours, on the subject,
a narrower or a broader one, and warns when a `pair_reviews` entry's `with`
names no current requirement: read them, and when one contradicts the new claim, or restricts what it
describes without saying so, ask the person which rule holds (see
`kibi-decisions`). Pick an existing subject before defining a new one; when
none fits, define it from what the project's people and code say; when nobody
has said, write `Definition not stated:` followed by where the subject is
named and who could define it, rather than inventing one.

A `must` requirement written after the schema 17 upgrade states the behaviour
it promises as a success scenario (`must-positive-scenario`): a scenario with
`expects: success` that the requirement links through `specified_by` and that
`assumes` a `property_value`, predicate or rule fact (a subject fact does not
count) on one of the requirement's subjects or a narrower one. When the
requirement names a subject no subject fact defines, define the subject
first. Write the positive case even when the requirement is prose
nobody modeled: `scenario-feasibility` then refuses the scenario when another
current requirement forbids what it assumes, which is how a prose requirement
that quietly contradicts a modeled one is caught. Must requirements the
upgrade recorded in `.kb/manifest.json` are exempt; never invent behaviour a
requirement does not state to satisfy the rule, ask the person instead.

Any write that adds or rewrites a requirement's inventory, even a fix that
only adds a Context section, must name the subjects of its claims in the same
write. When `kb_check` or the write result suggests defined subjects, read
their definitions with `kb_query` and name the one the claim is about:
choosing among defined subjects is yours to do, not a question for the
person. Leaving `claim-subject-missing` behind does not finish the task.

An unmodeled rule claim (`missing`, `ontology_gap` or `ambiguous`) is checked
against every current requirement it pairs with, through a `relates_to` edge
or a shared subject (`related-requirement-unmodeled`). Model the claim on that
requirement's subject keys when you can. When it cannot be modeled yet, link
the two with `relates_to` and record one `pair_reviews` entry on the
requirement: `with` (the other id), `verdict` (`no_conflict` with
`separated_by`, the condition that keeps them apart; `interacts` with
`resolved_by`, which settles how they combine: a scenario either of them
`specified_by`, a fact either links, a third current requirement, or a
`condition` or `exception` claim key of either, never the two requirements
themselves; or `conflict`), `claims` (`{claim_key}` of each unmodeled claim,
so the verdict goes stale when a claim it does not name appears; a
`payload_hash` is accepted and ignored) and `origin`. A `conflict` never
settles a pair: ask the person which rule holds. On a pair with a `must` or
firm requirement, a verdict whose `origin` is missing or not `kind: human`,
or that sits on a requirement an agent wrote, counts only once the person
confirms it and you set `origin.approved_by`; never set it yourself. The
finding lists each requirement once per problem with the partners it pairs
with. A claim with status `missing` whose role states no rule (`descriptive`)
is modeled, set to `ontology_gap` with a reason when no predicate can state
it, or reviewed; `nonlogical` is accepted only for `rationale`, `example` and
`subjective` claims.
