---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-runtime": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

A firm requirement or ADR can no longer be reworded in place by an agent. `kb_upsert` refuses to change its title, statement or ADR body, or to lower its firmness, unless the write cites new words from the person who owns the rule, and `kb_check` reports the same change made directly to the file. Context sections, tags, status and links stay editable, and superseding with a new firm decision still works as before.

- `kb_upsert` (dryRun and `kb_apply_plan` steps included) rejects an in-place claim change of a current firm decision without a new `origin.ref` (or `approval_ref` on a requirement): `Entity validation failed: <ID> is a firm decision, so kb_upsert does not change its <fields> in place`.
- New canonical `kb_check` rule `decision-firm-edited` compares current firm decisions with `HEAD` and blocks a changed claim that cites no new human words; it reports nothing outside a Git checkout or before the first commit.
- A requirement's claim is its title, its `semantic_text` (or the statement its body derives); an ADR's claim is its title and body. Lowering firmness or replacing the origin with an agent's counts as a change.
- `kibi-usage` skill 2.18.0 tells agents not to edit firm decisions in place; the `firmness` input schema description now states the origin-derived default and the edit rule.
