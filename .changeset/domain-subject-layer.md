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
- A subject fact needs a definition as its body: at least 8 words saying what the subject is in the product and what it is not (each Chinese or Japanese character counts as a word), not a restatement of its title or key, with at least 3 words of its own beyond them and function words, and not a template that 3 or more subjects repeat with only the key or title changed (`subject-definition-missing`).
- Two facts with the same `subject_key`, and two subjects whose keys and titles read as one, are reported (`subject-duplicate`): keys that differ only by a simple plural (`report.export`, `report.exports`) count as one. An ancestor and its descendant (`report_export` and `report.export.pdf`), siblings under different parents (`web.drawing.view` and `mobile.drawing.view`) and a pair either fact relates through `distinct_from`, `part_of` or `kind_of` are not reported.
- Kibi never invents a definition. A subject that bootstrap, `kb_model` or `kb_compile_intent` creates gets a body that says so: `Definition not stated:`, where the subject is named, and who could define it. Such a body never replaces an authored definition, and recorded gaps are not reported as a shared template. The older bootstrap body (`Subject <key>, shared by the requirements bootstrap planned from ...`) is read as the same recorded gap, so a new generated body may replace it.
- Subjects nest: a dotted key sits under its nearest defined prefix, and `part_of` and `kind_of` add broader subjects. A subject that names itself under `part_of`, `kind_of` or `distinct_from`, or a chain of broader subjects that leads back to where it started, is reported (`subject-hierarchy-invalid`).
- The subject rules apply from KB schema 16: a KB on an older schema is not blocked by them until `kibi migrate` upgrades it, and the text `kibi check` output on such a KB starts with a note to run `kibi migrate`.
- `kb_query` with `factKind: subject` and a `subjectKey` returns the subject's domain view: its definition, broader and narrower subjects, the subjects it is distinct from, and every current requirement, claim and scenario about it or a narrower subject. The prose claims nobody modeled are listed separately under `unmodeledClaims`. The view is built from one index per KB state and stays finite when subjects nest in a cycle.
- `kb_upsert` of a requirement lists the other requirements on each subject its claims name, a narrower or a broader one, in one query; suggests existing subjects for a claim that names none; and warns when a `pair_reviews` entry names no current requirement. A new subject fact is warned when it lacks a definition, repeats an active subject's key, or reads like an existing subject by the same measure `subject-duplicate` uses.
- `claim-subject-undefined` says plainly when a subject's `part_of`, `kind_of` or `distinct_from` names a subject no active subject fact defines.
- KB schema 16: `kibi migrate` suggests a subject for each unanchored claim when the claim's words clearly match one defined subject, and writes it only when the action is approved by id. Ties, claims no subject matches, missing definitions and duplicate subjects are listed for review.
- The usage and decision skills tell agents to anchor claims and to read a subject's domain view before writing a requirement on it.
