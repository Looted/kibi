---
"kibi-cli": minor
"kibi-core": minor
"kibi-mcp": minor
"kibi-runtime": minor
"kibi-claude": minor
"kibi-codex": minor
"kibi-cursor": minor
"kibi-zcode": minor
---

Subject facts are domain definitions again, and requirements whose prose nobody modeled now meet on the subjects they talk about. Kibi cannot compare two prose claims, but once each claim names its subject, every requirement about that subject is listed in one place, and a writer sees the others before relying on either.

- Each unmodeled normative, condition, exception or definition claim in a requirement's `semantic_inventory` names the subjects it is about under `subjects`. `kibi check` blocks a claim that names none (`claim-subject-missing`) and a claim that names a subject no active subject fact defines (`claim-subject-undefined`).
- A subject fact needs a definition as its body: at least 8 words saying what the subject is in the product and what it is not, not a restatement of its title, and not a template other subjects repeat with only the key changed (`subject-definition-missing`). Two subjects whose keys and titles read as one are reported unless one declares the other under `distinct_from`, `part_of` or `kind_of` (`subject-duplicate`).
- Subjects nest: a dotted key sits under its nearest defined prefix, and `part_of` and `kind_of` add broader subjects.
- `kb_query` with `factKind: subject` and a `subjectKey` returns the subject's domain view: its definition, broader and narrower subjects, the subjects it is distinct from, and every current requirement, claim and scenario about it or a narrower subject.
- `kb_upsert` of a requirement lists the other requirements on each subject its claims name, suggests existing subjects for a claim that names none, and warns when a new subject fact lacks a definition or reads like an existing one.
- KB schema 16: `kibi migrate` suggests a subject for each unanchored claim when the claim's words clearly match one defined subject, and writes it only when the action is approved by id. Ties, claims no subject matches, missing definitions and duplicate subjects are listed for review.
- The usage and decision skills tell agents to anchor claims and to read a subject's domain view before writing a requirement on it.
