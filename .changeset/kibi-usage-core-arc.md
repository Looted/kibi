---
"kibi-runtime": minor
"kibi-cli": minor
"kibi-claude": minor
"kibi-codex": minor
"kibi-cursor": minor
"kibi-zcode": minor
---

Loading the `kibi-usage` skill now costs about 4.8k characters instead of 55k. Its body is the arc an agent follows on every change: choose the interface, search for prior intent, edit, record the decision, check and commit. Second-agent edits, the predicate decision tree, requirement size, domain subjects, reading a hook snippet, quantified claims, entity bodies and firmness, and typed results moved to resources the body names, so an agent reads them with `kb_skills` (`action: "read"`) only when a task needs them. The skills no longer teach a dry run before and a read-back after every write: one `kb_upsert` reports what it wrote, and `dryRun: true` stays as an optional preview. `kibi-commit-review` now says not to edit `.kb` files by hand and that staging `.kb` with the change is expected, instead of forbidding any opening of a file under `.kb`.

Technical summary: kibi-usage 3.0.0 keeps a 3.4k-character body and adds `resources/interfaces.md`, `hook-snippets.md`, `recording.md`, `results-and-recovery.md`, `second-agent-edits.md`, `domain-subjects.md`, `quantified-claims.md`, `predicate-ontology.md` and `requirement-size.md`; two paragraphs written for single evaluation cases were removed. kibi-commit-review 1.7.0, kibi-decisions 1.14.0, kibi-freshness 2.4.0 and kibi-traceability 2.6.0 drop the default dry-run and read-back steps. Host mirrors, canonical hashes and the CLI's bundled copy are regenerated. The SkillOpt `safe_typed_mutation` signal "symbol readback after write" becomes "symbol queried before write", and the optimizer prompts no longer ask candidates to add a read-back.
